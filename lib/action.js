/**
 * actions for handling client equest
 */
const fs = require('fs');
const Protocol = require("./protocol.js");
const Context = require("./context.js");
const Datastore = require("./datastore.js");

const log = require("./logger.js").getDefaultLogHandler();
const serverContext = Context.getServerContext();


// internal actions
/**
 * 用户加入
 * @param {Object} userId
 * @param {Object} clientContext
 */
const actionUserJoin = function(userId, clientContext) {

    // 异常检查
    if (clientContext.userId) {
        // 已经登录态
        if (clientContext.userId === userId) {
            return;
        } else {
            logger.warn(`${userId} login conflict with ${clientContext.userId}`);
            // [TODO] 检查 clientContext.userId 对应的 client，踢掉
        }
    } else {
        // 检查是否已经有其他连接登录
        // [TODO] 多实例情况下的全局检查。。。
        if (serverContext.userClients[userId]) {
            // 注销原登录用户
            const clientContext = Context.getClientContext(serverContext.userClients[userId]);
            if (clientContext && clientContext.userId) {
                clientContext.userId = 0;
                delete serverContext.userClients[userId];
                serverContext.userCount--;
            }
        }
    }

    // logger.debug(`user ${userId} authed`);

    clientContext.userId = userId;
    serverContext.userClients[userId] = clientContext.clientId;
    serverContext.userCount++;

    // 绑定
    Datastore.setUserAtServer(userId, serverContext.serverId);

    // [TODO]
    // mark message_pipe_user_[userId]

    return true;
};

/**
 * 订阅频道
 * @param {Object} channelName
 * @param {Object} clientContext
 */
const actionSubscribe = function(channelName, clientContext) {

    if (clientContext.channels[channelName]) {
        return;
    }

    const now = (+new Date);
    clientContext.channels[channelName] = now;
    if (typeof serverContext.channelClients[channelName] === "undefined") {
        serverContext.channelClients[channelName] = {};
        serverContext.channelCount++;
        serverContext.channelClientCount[channelName] = 0;
    }
    serverContext.channelClients[channelName][clientContext.clientId] = now;
    serverContext.channelClientCount[channelName]++;

    // logger.debug(`${clientContext.clientId} subscribe ${channelName}; new client count: ${serverContext.channelClientCount[channelName]}`);

    clientContext.socket.join(channelName);

    // channel server
    if (serverContext.channelClientCount[channelName] <= 3) {
        Datastore.addServerToChannel(channelName, serverContext.serverId);
    }

    // [TODO]
    // update message_pipe_channel_[channelName]

    return true;
};

/**
 * 取消订阅
 * @param {Object} channelName
 * @param {Object} clientContext
 */
const actionUnsubscribe = function(channelName, clientContext) {

    if (!clientContext.channels[channelName]) {
        return;
    }
    delete clientContext.channels[channelName];

    delete serverContext.channelClients[channelName][clientContext.clientId];
    serverContext.channelClientCount[channelName]--;
    if (serverContext.channelClientCount[channelName] === 0) {
        delete serverContext.channelClientCount[channelName];
        delete serverContext.channelClients[channelName];
        serverContext.channelCount--;

        Datastore.removeServerFromChannel(channelName, serverContext.serverId);
    }

    // logger.debug(`${clientContext.clientId} unsubscribe ${channelName}; new client count: ${serverContext.channelClientCount[channelName]}`);

    clientContext.socket.leave(channelName);

    // [TODO]
    // update message_pipe_channel_[channelName]

    return true;
};

// load user actions
const actionDir = "../app/action";
const loadActions = function() {
    // actions
    const actions = {};
    const files = fs.readdirSync(actionDir);
    files.forEach(function(fileName) {
        if (!fileName.endsWith('.js')) {
            return;
        }
        const moduleActions = require(actionDir + '/' + fileName);
        if (typeof moduleActions === "object") {
            for (let name in moduleActions) {
                actions[name] = moduleActions[name];
            }
        }
    });
    return actions;
}

const Action = {
    actionUserJoin,
    actionSubscribe,
    actionUnsubscribe,
    loadActions
};

module.exports = Action;
