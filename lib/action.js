/**
 * actions for handling client equest
 */
const fs = require('fs');
const path = require('path');
const Config = require("./config.js");
const Protocol = require("./protocol.js");
const Context = require("./context.js");
const Datastore = require("./datastore.js");
const Sender = require("./sender.js");

const logger = require("./logger.js").getDefaultLogHandler();
const serverContext = Context.getServerContext();

// internal actions
/**
 * 用户加入
 * 注意：wsAgent 服务（集群）唯一；如果出现重复，将会自动 挤出 先前用户
 * @param {Object} userId
 * @param {Object} clientContext
 */
const actionUserJoin = function(userId, clientContext) {
    
    // 检查当前client是否已经登录其他账号
    if (clientContext.userId) {
        // 相同，直接返回
        if (clientContext.userId === userId) {
            return;
        }
        
        // 不同，需要先注销之前的账号
        actionUserQuit(userId, clientContext);
    }
        
    // 检查 userId 是否已经登录过
    Datastore.getUserAtServer(userId).then( (serverId) => {
        
        logger.trace(`user #${userId} at server ${serverId}`);
        
        // 已登录，且就是当前 server
        if (serverId && serverId === serverContext.serverId) {
            // 修改 client 关联关系即可
            logger.debug(`user ${userId} already exists.`);
            // 当服务器重启且发生用户重连，此时实例里还没有 userClients 信息
            if (!serverContext.userClients[userId]) {
                serverContext.userCount++;
            }
            serverContext.userClients[userId] = clientContext.clientId;
            clientContext.userId = userId;
            return;
        }
        
        // 已登录，但并非当前 server
        if (serverId) {
            // 发送命令，告知该实例下线用户
            // 说明：此处偷懒，直接用 serverId 当 serverHost
            const serverHost = serverId;
            Sender.sendCmdKickUser(serverHost, userId);
        }
        
        // 添加用户操作
        clientContext.userId = userId;
        serverContext.userClients[userId] = clientContext.clientId;
        serverContext.userCount++;
        logger.debug(`user ${userId} authed`);

        // 绑定
        Datastore.setUserAtServer(userId, serverContext.serverId);
    });

    return true;
};

/**
 * 用户退出
 * @param {Object} userId
 * @param {Object} clientContext
 * 
 */
const actionUserQuit = (userId, clientContext) => {
    
    if (!serverContext.userClients[userId]) {
        return;
    }
    
    logger.trace(`user #${userId} quit`);
    delete serverContext.userClients[userId];
    serverContext.userCount--;
};

/**
 * 订阅频道
 * @param {Object} channelName
 * @param {Object} clientContext
 */
const actionSubscribe = function(channelName, clientContext) {
    
    // 已经加入过
    if (clientContext.channels[channelName]) {
        return;
    }

    const now = (+new Date);
    clientContext.channels[channelName] = now;
    // 该实例的新房间
    if (typeof serverContext.channelClients[channelName] === "undefined") {
        serverContext.channelClients[channelName] = {};
        serverContext.channelCount++;
        serverContext.channelClientCount[channelName] = 0;
    }
    serverContext.channelClients[channelName][clientContext.clientId] = now;
    serverContext.channelClientCount[channelName]++;

    logger.trace(`${clientContext.clientId} subscribe ${channelName}; channel client count: ${serverContext.channelClientCount[channelName]}`);

    clientContext.socket.join(channelName);

    // channel server
    if (serverContext.channelClientCount[channelName] <= 5) {
        Datastore.addServerToChannel(channelName, serverContext.serverId);
    }

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
    // 如果取消订阅后，实例中该频道订阅数为0，需要 datastore 中取消 注册
    if (serverContext.channelClientCount[channelName] === 0) {

        delete serverContext.channelClientCount[channelName];
        delete serverContext.channelClients[channelName];
        serverContext.channelCount--;

        Datastore.removeServerFromChannel(channelName, serverContext.serverId);
    }

    logger.debug(`${clientContext.clientId} unsubscribe ${channelName}; channel client count: ${serverContext.channelClientCount[channelName]}`);

    clientContext.socket.leave(channelName);

    return true;
};

// load user actions
const actionDir = path.join(__dirname, "../app/action");
let lastLoaded = 0;
const actions = {};
const doLoadActions = function() {

    // 更新间隔少于3s，不处理
    const now = (+ new Date);
    if (now - lastLoaded < 3000) {
        return;
    }
    lastLoaded = now;
    
    // clear exists actions
    for (let k in Object.keys(actions)) {
        delete actions[k];
    }
    
    // load files
    const files = fs.readdirSync(actionDir);
    files.forEach(function(fileName) {
        if (!fileName.endsWith('.js')) {
            return;
        }
        const actionFilePath = path.join(actionDir, fileName);
        // 如果已经加载过，需要先清除 require 缓存
        if (require.cache[actionFilePath]) {
            delete require.cache[actionFilePath];
        }
        const moduleActions = require(actionFilePath);
        if (typeof moduleActions === "object") {
            for (let name in moduleActions) {
                actions[name] = moduleActions[name];
            }
        }
    });
    
    logger.debug("actions refreshed: " + Object.keys(actions).join(', '));
};

/**
 * 获取支持的 action
 */
const loadActions = function() {
    
    // 已经加载过，直接返回
    if (lastLoaded > 0) {
        return actions;
    }
    
    // watch action files
    const actionConfig = Config.getConfig("action") || {};
    if (actionConfig.watch) {
        // 简化，每次都重新加载全部 action
        fs.watch(actionDir, doLoadActions);
    }
    
    doLoadActions();
    return actions;
}

const Action = {
    actionUserJoin,
    actionUserQuit,
    actionSubscribe,
    actionUnsubscribe,
    loadActions
};

module.exports = Action;
