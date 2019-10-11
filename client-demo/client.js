
let runMode = "browser";
let socketIo = null;
if (typeof io === "undefined") {
    socketIo = require('socket.io-client');
    runMode = "node-cli";
} else {
    socketIo = io;
}

// =====================  protocol.js  ========================//
/**
 * query priority
 */
const QUERY_PRIORITIES = {
    LEVEL_IMMIDIATE: 1,
    LEVEL_QUEUE: 2
    // LEVEL_UNNESSARY: 9
};

/**
 * internal query action
 */
const INTERNAL_QUERY_ACTIONS = {
    AUTH: '_auth',
    SUBSCRIBE: '_subscribe',
    UNSUBSCRIBE: '_unsubscribe'
};

/**
 * internal message type
 */
const INTERNAL_MESSAGE_TYPIES = {
    CALLACK: '_callback'
};

const Protocol = {
    QUERY_PRIORITIES,
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES
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
const DEFAULT_QUERY_ACK_TIMEOUT = 50;
const DEFAULT_QUERY_RESPONSE_TIMEOUT = 30;

// priority
const DEFAULT_QUERY_PRIORITY = Protocol.QUERY_PRIORITIES.LEVEL_IMMIDIATE;

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
        return (+new Date) + clock.diffTime/* + latency*/;
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

    // common query
    let queryId = 0;
    const querySet = {};
    agent.query = function(action, param, responseCallback, timeoutCallback, option = {}, context = {}) {

        queryId++;
        const queryInfo = {
            id: queryId,
            action: action,
            param: param,
            time: agent.getServerTime(),
            priority: option.priority || DEFAULT_QUERY_PRIORITY,
            option: option,
            context: context
        };
        socket.emit("query", queryInfo);

        querySet[queryId] = {
            query: queryInfo,
            status: "sent",
            queryTime: (+ new Date),
            queryAt: queryInfo.time,
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
        
        // [TODO] check data.status: 200 OK, 503: system busy
        
        querySet[queryId].status = "acked";
        querySet[queryId].ackAt = (+ new Date);

        // update latency
        latency = (+ new Date) - querySet[queryId].queryTime;
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
        // console.log("[info] registerred message type handler: " + type);
    };
    socket.on("message", function(message) {
        
        console.log("[info] receive messge: " + JSON.stringify(message));

        if (typeof message !== "object") {
            console.log("bad message: " + message);
            return false;
        }

        // _ack
        socket.emit("_ack", {messageId: message.id, channelName: message.context.channelName || ""});

        const context = {};
        context.agent = agent;
        context.message = message;
        const queryId = message.context.queryId;
        let queryCallback = null;
        if (queryId && querySet[queryId]) {
            context.query = querySet[queryId].query;
            queryCallback = querySet[queryId].responseCallback;
            querySet[queryId].status = "responsed";
            querySet[queryId].responseAt = (+ new Date);
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
    const connectedCallback = null;
    agent.onConnected = function(onConnectedCallback) {
        connectedCallback = onConnectedCallback;
    };
    const reconnectedCallback = null;
    agent.onReconnected = function(onReconnectedCallback) {
        reconnectedCallback = onReconnectedCallback;
    };
    const disconnectCallback = null;
    agent.onDisconnect = function(onDisconnectCallback) {
        disconnectCallback =  onDisconnectCallback;
    };
    
    socket.on("connect", function() {
        if (connectedCallback) {
            connectedCallback.call(agent, null);
        }
    });
    socket.on("reconnect", function(attemptNumber) {
        if (reconnectedCallback) {
            reconnectedCallback.call(agent, attemptNumber);
        }
    });
    socket.on("disconnect", function(reason) {
        if (connectedCallback) {
            connectedCallback.call(agent, reason);
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