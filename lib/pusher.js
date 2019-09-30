
const http = require('http');
    
const Context = require("./context.js");
const Config = require("./config.js");
const Logger = require("./logger.js");

const log = Logger.getDefaultLogHandler();
const serverContext = Context.getServerContext();

// message push
const pushMessageTimeout = Config.getConfig("pushMessageTimeout") || 5;
const pushMessageMaxRetry = Config.getConfig("pushMessageMaxRetry") || 1;
const clientMessageSets = {};
const channelMessageSets = {};
const checkClientMessageTimeout = function(clientId, message) {
    
    setTimeout(function() {
        if (!clientMessageSets[clientId][message.id]) {
            return;
        }
        // 已经成功发送
        if (clientMessageSets[clientId][message.id]["ackAt"] > 0) {
            delete clientMessageSets[clientId][message.id];
            return;
        }
        // retry
        pushMessage2Client(clientId, message);
    }, pushMessageTimeout * 1000);
};
const pushMessage2Client = function(clientId, message) {
    
    const clientSocket = Context.getClientContext(clientId);
    if (!clientSocket) {
        return;
    }
    
    if (typeof clientMessageSets[clientId] === "undefined") {
        clientMessageSets[clientId] = {};
    }
    if (typeof clientMessageSets[clientId][message.id] === "undefined") {
        clientMessageSets[clientId][message.id] = {
            pushAt: 0, 
            ackAt: 0,
            retryCount: 0
        };
    } else {
        // 重复推送，即 重试
        clientMessageSets[clientId][message.id]["retryCount"]++;
        // max retry reached!
        if (clientMessageSets[clientId][message.id]["retryCount"] > pushMessageMaxRetry) {
            log.notice(`${clientId} missed message #${message.id}, max retry reached!`);
            delete clientMessageSets[clientId][message.id];
            return;
        }
    }
    clientMessageSets[clientId][message.id]["pushAt"] = (+ new Date);
    clientSocket.socket.emit("message", message);
    serverContext.pushCount++;
    log.debug(`push to client ${clientId}; new push count: ${serverContext.pushCount}`);
    checkClientMessageTimeout(clientId, message);
};

const checkChannelMessageTimeout = function(channelName, message) {
    
    setTimeout(function() {
        if (!channelMessageSets[channelName][message.id]) {
            return;
        }
        delete channelMessageSets[channelName][message.id];
    }, pushMessageTimeout * 1000);
};
const pushMessage2Channel = function(channelName, message) {
    
    if (typeof channelMessageSets[channelName] === "undefined") {
        channelMessageSets[channelName] = {};
    }
    if (!serverContext.channelClientCount[channelName]) {
        return;
    }
    log.debug(`before push to channel ${channelName}; old push count: ${serverContext.pushCount}`);
    const expectedCount = serverContext.channelClientCount[channelName];
    serverContext.pushCount += expectedCount;
    channelMessageSets[channelName][message.id] = {
        pushAt: (+ new Date),
        expectedCount,
        ackCount: 0
    };
    message.context.channelName = channelName;
    serverContext.socketIo.to(channelName).emit("message", message);
    checkChannelMessageTimeout(channelName, message);
    log.debug(`after push to channel ${channelName}; client count: ${expectedCount}; new push count: ${serverContext.pushCount}`);
};

const markMessageAcked = function(clientId, ackData) {
    
    const clientSocket = Context.getClientContext(clientId);
    if (!clientSocket) {
        log.notice(`client has gone away! clientId: ${clientId}`);
        return;
    }
    if (!ackData.messageId) {
        log.notice(`bad ack data. no messageId given! clientId: ${clientId}`);
        return;
    }
    
    // 计算延迟
    const now = (+ new Date);
    const messageId = ackData.messageId;
    const channelName = ackData.channelName || "";
    if (channelName) {
        if (!channelMessageSets[channelName] || !channelMessageSets[channelName][messageId]) {
            return;
        }
        serverContext.pushSucceedCount++;
        channelMessageSets[channelName][messageId]["ackCount"] += 1;
        clientSocket.latency = now - channelMessageSets[channelName][messageId]["pushAt"];
    } else {
        if (!clientMessageSets[clientId] || !clientMessageSets[clientId][messageId]) {
            return;
        }
        serverContext.pushSucceedCount++;
        clientMessageSets[clientId][messageId]["ackAt"] = now;
        clientSocket.latency = now - clientMessageSets[clientId][messageId]["pushAt"];
    }
    
    // 延迟情况采样
    if (serverContext.latencySampling.length < 100) {
        serverContext.latencySampling.push(clientSocket.latency);
    }
} ;

/**
 * 推送消息给指定实例
 * @param {Object} serverHost
 * @param {Object} path
 * @param {Object} requestData
 * @param {Object} successCallback
 * @param {Object} failCallback
 */
const _message2server = function(serverHost, path, requestData, successCallback, failCallback) {
    
    const content = JSON.stringify(requestData);
    const parts = serverHost.split(":");
    const options = {
        hostname: parts[0],
        port: parts[1],
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    };
    
    const req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            successCallback();
        });
    });
    req.on('error', function(e) {
        failCallback(e.message);
    });
    req.write(content);
    req.end();
};

/**
 * 通知实例，发送信息到指定频道
 */
const sendChannelMessage2Server = function(serverHost, channelName, messageType, messageData = {}, context = {}) {
    
    const path = '/message2channel';
    const requestData = {
        channelName: channelName,
        type: messageType,
        data: messageData,
        context: context
    };
    return new Promise(function(resolve, fail) {
        _message2server(serverHost, path, requestData, function() {
            resolve();
        }, function(err) {
            fail(err);
        });
    });
};

/**
 * 通知实例，发送信息给指定用户
 */
const sendUserMessage2Server = function(serverHost, userIds, messageType, messageData = {}, context = {}) {
    
    const path = '/message2user';
    const requestData = {
        userIds: userIds.length ? userIds.join(",") : userIds,
        type: messageType,
        data: messageData,
        context: context
    };
    return new Promise(function(resolve, fail) {
        _message2server(serverHost, path, requestData, function() {
            resolve();
        }, function(err) {
            fail(err);
        });
    });
};

module.exports = {
    pushMessage2Client,
    pushMessage2Channel,
    markMessageAcked,
    sendChannelMessage2Server,
    sendUserMessage2Server
};