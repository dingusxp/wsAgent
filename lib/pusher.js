/**
 * server 实例 单发/群发 消息
 */

const Context = require("./context.js");
const Config = require("./config.js");

const logger = require("./logger.js").getDefaultLogHandler();
const serverContext = Context.getServerContext();

// message push
const pushMessageTimeout = Config.getConfig("pushMessageTimeout") || 5;
const pushMessageMaxRetry = Config.getConfig("pushMessageMaxRetry") || 0;
const clientMessageSets = {};
const channelMessageSets = {};
const timeoutCheckList = [];
const MESSAGE_TARGET = {
    CLIENT: 1,
    CHANNEL: 2
};

const pushMessage2Client = function(clientId, message) {

    const clientSocket = Context.getClientContext(clientId);
    if (!clientSocket) {
        return;
    }

    const messageKey = `client:${clientId}#${message.id}`;
    if (typeof clientMessageSets[messageKey] === "undefined") {
        clientMessageSets[messageKey] = {
            pushAt: 0,
            ackAt: 0,
            retryCount: 0,
            clientId: clientId,
            message: message
        };
    } else {
        // 重复推送，即 重试
        clientMessageSets[messageKey]["retryCount"]++;
        // max retry reached!
        if (clientMessageSets[messageKey]["retryCount"] > pushMessageMaxRetry) {
            // logger.notice(`${clientId} missed message #${message.id}, max retry reached!`);
            delete clientMessageSets[messageKey];
            return;
        }
    }
    const now = (+new Date);
    clientMessageSets[messageKey]["pushAt"] = now;
    clientSocket.socket.emit("message", message);
    serverContext.pushCount++;
    // logger.debug(`push to client ${clientId}; new push count: ${serverContext.pushCount}`);
    timeoutCheckList.push([now, MESSAGE_TARGET.CLIENT, messageKey]);
    // checkClientMessageTimeout(clientId, message);
};

const pushMessage2Channel = function(channelName, message) {

    if (!serverContext.channelClientCount[channelName]) {
        return;
    }
    // logger.debug(`before push to channel ${channelName}; old push count: ${serverContext.pushCount}`);
    const expectedCount = serverContext.channelClientCount[channelName];
    serverContext.pushCount += expectedCount;
    const messageKey = `channel:${channelName}#${message.id}`;
    const now = (+new Date);
    channelMessageSets[messageKey] = {
        pushAt: now,
        expectedCount,
        ackCount: 0
    };
    message.context.channelName = channelName;
    serverContext.socketIo.to(channelName).emit("message", message);
    timeoutCheckList.push([now, MESSAGE_TARGET.CHANNEL, messageKey]);
    // checkChannelMessageTimeout(channelName, message);
    // logger.debug(`after push to channel ${channelName}; client count: ${expectedCount}; new push count: ${serverContext.pushCount}`);
};

const markMessageAcked = function(clientId, ackData) {

    const clientSocket = Context.getClientContext(clientId);
    if (!clientSocket) {
        logger.notice(`client has gone away! clientId: ${clientId}`);
        return;
    }
    if (!ackData.messageId) {
        logger.notice(`bad ack data. no messageId given! clientId: ${clientId}`);
        return;
    }

    // 计算延迟
    const now = (+new Date);
    const messageId = ackData.messageId;
    const channelName = ackData.channelName || "";
    if (channelName) {
        const messageKey = `channel:${channelName}#${messageId}`;
        if (!channelMessageSets[messageKey]) {
            return;
        }
        serverContext.pushSucceedCount++;
        channelMessageSets[messageKey]["ackCount"] += 1;
        clientSocket.latency = now - channelMessageSets[messageKey]["pushAt"];
    } else {
        const messageKey = `client:${clientId}#${messageId}`;
        if (!clientMessageSets[messageKey]) {
            return;
        }
        serverContext.pushSucceedCount++;
        clientMessageSets[messageKey]["ackAt"] = now;
        clientSocket.latency = now - clientMessageSets[messageKey]["pushAt"];
    }

    // 延迟情况采样
    if (serverContext.latencySampling.length < 100) {
        serverContext.latencySampling.push(clientSocket.latency);
    }
};

const checkMessageTimeout = function() {

    const deadline = (+new Date) - pushMessageTimeout * 1000;
    while (timeoutCheckList.length) {
        let [timestamp, target, messageKey] = timeoutCheckList[0];
        // 之后的为新加的，尚未过期
        if (timestamp > deadline) {
            break;
        }

        timeoutCheckList.shift();
        if (target === MESSAGE_TARGET.CLIENT) {
            // deleted
            if (!clientMessageSets[messageKey]) {
                continue;
            }
            // 已经成功发送
            if (clientMessageSets[messageKey]["ackAt"] > 0) {
                delete clientMessageSets[messageKey];
                continue;
            }
            // retry
            pushMessage2Client(clientMessageSets[messageKey]["clientId"], clientMessageSets[messageKey]["message"]);
        } else if (target === MESSAGE_TARGET.CHANNEL) {
            if (!channelMessageSets[messageKey]) {
                continue;
            }
            delete channelMessageSets[messageKey];
        }
    }
    setTimeout(checkMessageTimeout, pushMessageTimeout * 500);
};
checkMessageTimeout();

module.exports = {
    pushMessage2Client,
    pushMessage2Channel,
    markMessageAcked
};
