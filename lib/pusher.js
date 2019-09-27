
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

module.exports = {
    pushMessage2Client,
    pushMessage2Channel,
    markMessageAcked
};