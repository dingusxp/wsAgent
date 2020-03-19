/**
 * 与 wsAgent server 交互对应的客户端，浏览器 或 vue/node 环境均可使用
 */

let runMode = "browser";
let socketIo = null;
let protobufJs = null;
if (typeof io === "undefined") {
    socketIo = require('socket.io-client');
    protobufJs = require("protobufjs");
    runMode = "node-cli";
} else {
    socketIo = io;
    protobufJs = protobuf;
}

// =====================  protocol.js  ========================//

/**
 * internal query action
 */
const INTERNAL_QUERY_ACTIONS = {
    AUTH: '_auth',
    QUIT: '_quit',
    SUBSCRIBE: '_subscribe',
    UNSUBSCRIBE: '_unsubscribe'
};

/**
 * internal message type
 */
const INTERNAL_MESSAGE_TYPIES = {
    CALLACK: '_callback'
};

// pb3
const protocolConfig = {
    enablePb3: false,
};
const pb3 = {};
const doLoadPb3 = function(protoJsPath, loaderNames) {
    
    if (typeof protobufJs === "undefined") {
        console.log("protobuf.js is not loaded");
        return false;
    }
    
    // load pb3
    protobufJs.load(protoJsPath, function(err, root) {
        
        if (err) {
            console.log("load protocol failed! " + err);
            return;
        }
        pb3["protocol"] = {};
        pb3["protocol"]["Query"] = root.lookupType("protocol.Query");
        pb3["protocol"]["Message"] = root.lookupType("protocol.Message");
        pb3["loader"] = {};
        loaderNames.forEach((name) => {
            pb3["loader"][name] = root.lookupType(`loader.${name}`);
        });
        
        protocolConfig.enablePb3 = true;
    });
};

/**
 * 解析 message （如果是 pb3 格式，自动解析）
 * @param {Object} message
 */
const parseMessage = function(message) {

    // pb 格式
    // 注意：node-cli 和 浏览器 编码的 buffer 类型不一样，需要兼容之
    if (message && (
            (typeof Buffer !== "undefined" && message.constructor === Buffer) ||
            (typeof ArrayBuffer !== "undefined" && message.constructor === ArrayBuffer) ||
            (typeof Uint8Array !== "undefined" && message.constructor === Uint8Array)
            )
        ) {
        if (!protocolConfig.enablePb3 || !pb3.protocol || !pb3.protocol.Message) {
            console.log("parse message failed: pb3 is not enabled.");
            return false;
        }
        // console.log("message", message);
        // format
        if (typeof ArrayBuffer !== "undefined" && message.constructor === ArrayBuffer && typeof Uint8Array !== "undefined") {
            message = new Uint8Array(message);
            // console.log("message formated", message);
        }

        const newMessage = pb3.protocol.Message.decode(message);
        newMessage["data"] = pb3Data2obj(newMessage["data"]);
        // 解构可以使 pb3 与 json 格式一致
        // newMessage["data"] = {...newMessage["data"]};
        // newMessage["context"] = {...newMessage["context"]};
        return newMessage;
    }

    // 简单检查一下
    if (typeof message !== "object" || !message.id) {
        return false;
    }
    
    return message;
}

/**
 * 处理待推送的 query，如果配置了 pb3，自动编码
 * @param {Object} query
 */
const wrapQuery = function(query) {

    // 简单判断一下
    if (typeof query !== "object" || !query.id) {
        return false;
    }
    
    // 未开启 pb3 直接返回
    if (!protocolConfig.enablePb3 || !pb3.protocol || !pb3.protocol.Query) {
        return query;
    }
    
    // 如果 param 满足 pb3 Data 格式，则整个信息编码为 pb3
    if (typeof query.param === "object" && query.param.loader && query.param.buffer) {
        const queryObj = pb3.protocol.Query.encode(pb3.protocol.Query.create(query)).finish();
        // 兼容浏览器环境
        if (typeof Uint8Array !== "undefined" && queryObj.constructor === Uint8Array) {
            return queryObj.buffer.slice(queryObj.byteOffset, queryObj.byteOffset + queryObj.byteLength);
        } else {
            return queryObj;
        }
    }

    return query;
}

/**
 * 将对象转为 pb3 Data 格式
 * @param {Object} loader
 * @param {Object} obj
 */
const obj2pb3Data = function(loader, obj) {
    
    if (!protocolConfig.enablePb3 || !pb3.loader || !pb3.loader[loader]) {
        return false;
    }
    return {loader, "buffer": pb3.loader[loader].encode(pb3.loader[loader].create(obj)).finish()};
}

/**
 * 解析 pb3 Data 数据为 对象
 * @param {Object} pb3Data
 *  + loader
 *  + buffer
 */
const pb3Data2obj = function(pb3Data) {
    
    if (!pb3Data.loader || !pb3Data.buffer) {
        return pb3Data;
    }
    if (!pb3.loader || !pb3.loader[pb3Data.loader]) {
        return false;
    }
    return pb3.loader[pb3Data.loader].decode(pb3Data.buffer);
}

const Protocol = {
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES,
    doLoadPb3,
    parseMessage,
    wrapQuery,
    pb3Data2obj,
    obj2pb3Data
};


// =====================  util.js  ========================//
const fixServerUrl = function(serverUrl) {

    if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
        serverUrl = 'ws://' + serverUrl;
    }
    return serverUrl;
};

// =====================  agent.js  ========================//
/**
 * 校对时间间隔（单位：s）
 */
const DEFAULT_TIME_CALIBRATION_INTERVAL = 300;

// query timeout（单位：s）
const DEFAULT_QUERY_ACK_TIMEOUT = 3;
const DEFAULT_QUERY_RESPONSE_TIMEOUT = 6;

// agent part
let agentInstances = {};
let Agent = function(agentServer) {

    // instance
    agentServer = fixServerUrl(agentServer);
    if (agentInstances[agentServer]) {
        return agentInstances[agentServer];
    }
    let agent = this;
    // agentInstances[agentServer] = agent;

    // connect
    const socket = socketIo.connect(agentServer);

    // network latency
    let latency = 0;
    agent.getLatency = function() {
        return latency;
    };

    // time calibration
    const clock = {
        syncTime: 0,
        serverTime: 0,
        diffTime: 0
    };
    agent.getServerTime = function() {
        return (+new Date) + clock.diffTime /* + latency*/ ;
    };
    agent.timeCalibrationInterval = DEFAULT_TIME_CALIBRATION_INTERVAL;
    const sendTimeCalibration = function() {
        clock.syncTime = (+new Date);
        socket.emit("_time", {});
    };
    socket.on("_time", function(data) {
        const now = (+new Date);
        clock.diffTime = data.time - now;
        latency = (now - clock.syncTime) / 2;
        setTimeout(sendTimeCalibration, agent.timeCalibrationInterval * 1000);
    });
    // 连接后 立即做一次对时
    sendTimeCalibration();
    
    // pb3 支持
    agent.enablePb3 = function(protoJsPath, loaderNames) {
        Protocol.doLoadPb3(protoJsPath, loaderNames);
    };

    // common query
    let queryId = 0;
    const querySet = {};
    agent.query = function(action, param, responseCallback = null, timeoutCallback = null, option = {}, context = {}) {

        queryId++;
        const queryInfo = {
            id: queryId,
            action: action,
            param: param,
            time: agent.getServerTime(),
            context: context
        };
        
        socket.emit("query", Protocol.wrapQuery(queryInfo));

        // check ack/response
        if (!responseCallback && !timeoutCallback) {
            return;
        }
        querySet[queryId] = {
            query: queryInfo,
            status: "sent",
            queryAt: (+new Date),
            ackAt: 0,
            responseAt: 0,
            responseCallback: typeof responseCallback === "function" ? responseCallback : null,
            timeoutCallback: typeof timeoutCallback === "function" ? timeoutCallback : null
        };
        const ackTimeout = option.ackTimeout || DEFAULT_QUERY_ACK_TIMEOUT;
        const responseTimeout = option.responseTimeout || DEFAULT_QUERY_RESPONSE_TIMEOUT;
        checkQueryTimeout(queryId, ackTimeout, responseTimeout);
    };
    socket.on('_ack', function(data) {
        
        const queryId = data.queryId;
        if (!querySet[queryId]) {
            return;
        }

        // [TODO] check data.status: 
        // 200 OK, 
        // 403 Bad request
        // 503 System error

        querySet[queryId].status = "acked";
        querySet[queryId].ackAt = (+new Date);

        // update latency
        latency = querySet[queryId].ackAt - querySet[queryId].queryAt;
    });
    // 请求超时处理
    const queryTimeoutCallback = function(queryId) {
        const timeoutCallback = querySet[queryId].timeoutCallback;
        if (!timeoutCallback) {
            return;
        }
        return timeoutCallback.call(querySet[queryId], {});
    };
    const checkQueryTimeout = function(queryId, ackTimeout, responseTimeout) {

        // ack timeout
        setTimeout(function() {
            if (!querySet[queryId] || querySet[queryId].ackAt > 0) {
                return;
            }
            return queryTimeoutCallback(queryId);
        }, ackTimeout * 1000);

        // response timeout
        setTimeout(function() {
            if (querySet[queryId].responseAt > 0) {
                delete querySet[queryId];
                return;
            }
            queryTimeoutCallback(queryId);
            delete querySet[queryId];
        }, responseTimeout * 1000);
    };

    // auth: check login && bind user on server
    agent.auth = function(userAuth, callback, onFailed) {

        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.AUTH, userAuth, callback, onFailed);
    };
    
    // quit: logout && cancel bind user on server
    agent.quit = function(callback, onFailed) {

        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.AUTH, {}, callback, onFailed);
    };

    // subscribe channel
    agent.subscribeChannel = function(channelName, callback, onFailed) {

        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE, channelName, callback, onFailed);
    };

    // unsubscribe channel
    agent.unsubscribeChannel = function(channelName, callback, onFailed) {

        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE, channelName, callback, onFailed);
    };

    // handle message
    let messageHandlers = {};
    agent.setMessageHandler = function(type, callback) {

        if (typeof callback !== "function") {
            console.log("[warning] bad message handler of " + type);
            return;
        }
        messageHandlers[type] = callback;
    };
    socket.on("message", function(message) {

        message = Protocol.parseMessage(message);

        if (typeof message !== "object" || !message.id) {
            console.log("bad message: " + message);
            return false;
        }

        // _ack
        socket.emit("_ack", {
            messageId: message.id,
            channelName: message.context.channelName || ""
        });

        const context = {};
        context.agent = agent;
        context.message = message;
        const queryId = message.context.queryId;
        let queryCallback = null;
        if (queryId && querySet[queryId]) {
            context.query = querySet[queryId].query;
            queryCallback = querySet[queryId].responseCallback;
            querySet[queryId].status = "responsed";
            querySet[queryId].responseAt = (+new Date);
        }

        // internal message type: _callback
        if (message.type === Protocol.INTERNAL_MESSAGE_TYPIES.CALLACK) {
            if (queryCallback) {
                queryCallback.call(context, message.data);
            }
            return;
        }

        // user defined
        if (messageHandlers[message.type]) {
            messageHandlers[message.type].call(context, message.data);
            return;
        }

        console.log("[warning] message type handler is not defined: " + message.type);
    });

    // callback
    let connectedCallback = null;
    agent.onConnected = function(onConnectedCallback) {
        connectedCallback = onConnectedCallback;
    };
    let reconnectCallback = null;
    agent.onReconnect = function(onReconnectCallback) {
        reconnectCallback = onReconnectCallback;
    };
    let disconnectCallback = null;
    agent.onDisconnect = function(onDisconnectCallback) {
        disconnectCallback = onDisconnectCallback;
    };

    socket.on("connect", function() {
        if (connectedCallback) {
            connectedCallback.call(agent, null);
        }
    });
    socket.on("reconnect", function(attemptNumber) {
        if (reconnectCallback) {
            reconnectCallback.call(agent, attemptNumber);
        }
    });
    socket.on("disconnect", function(reason) {
        if (disconnectCallback) {
            disconnectCallback.call(agent, reason);
        }
    });

    return agent;
};

if (runMode === "node-cli") {
    module.exports = {
        Protocol,
        Agent
    };
}
