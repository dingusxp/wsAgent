
/**
 * actions for handling client equest
 */
const fs = require('fs');
const Protocol = require("./protocol.js");
const Context = require("./context.js");
const Logger = require("./logger.js");

const log = Logger.getDefaultLogHandler();
const serverContext = Context.getServerContext();

// actions
const actions = {};

// internal actions
// auth
actions[Protocol.INTERNAL_QUERY_ACTIONS.AUTH] = function(param) {
    
    // test
    let userId = param.userId;
    
    // 已经登录态
    if (this.userId) {
        if (this.userId === userId) {
            return;
        } else {
            log.warning(`${userId} login conflict with ${this.userId}`);
            // [TODO] 检查 this.userId 对应的 client，踢掉
        }
    }
    
    log.debug(`user ${userId} authed`);

    this.userId = userId;
    serverContext.userClients[userId] = this.clientId;
    serverContext.userCount++;

    // [TODO]
    // mark message_pipe_user_[userId]

    return true;
};

// subscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE] = function(param) {
    
    const channelName = param;
    if (this.channels[channelName]) {
        return;
    }
    
    const now = (+ new Date);
    this.channels[channelName] = now;
    if (typeof serverContext.channelClients[channelName] === "undefined") {
        serverContext.channelClients[channelName] = {};
        serverContext.channelCount++;
        serverContext.channelClientCount[channelName] = 0;
    }
    serverContext.channelClients[channelName][this.clientId] = now;
    serverContext.channelClientCount[channelName]++;
    
    log.debug(`${this.clientId} subscribe ${channelName}; new client count: ${serverContext.channelClientCount[channelName]}`);

    this.socket.join(channelName);
    
    // [TODO]
    // update message_pipe_channel_[channelName]
    
    return true;
};

// unsubscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE] = function(param) {
    
    const channelName = param;
    if (!this.channels[channelName]) {
        return;
    }
    delete this.channels[channelName];
    
    delete serverContext.channelClients[channelName][this.clientId];
    serverContext.channelClientCount[channelName]--;
    if (serverContext.channelClientCount[channelName] === 0) {
        delete serverContext.channelClientCount[channelName];
        delete serverContext.channelClients[channelName];
        serverContext.channelCount--;
    }
    
    log.debug(`${this.clientId} unsubscribe ${channelName}; new client count: ${serverContext.channelClientCount[channelName]}`);
    
    this.socket.leave(channelName);
    
    // [TODO]
    // update message_pipe_channel_[channelName]
    
    return true;
};

// load user actions
const files = fs.readdirSync("./action");
files.forEach(function(fileName) {
    if (!fileName.endsWith('.js')) {
        return;
    }
    const moduleActions = require("../action" + "/" + fileName);
    if (typeof moduleActions === "object") {
        for (let name in moduleActions) {
            actions[name] = moduleActions[name];
        }
    }
});

const Action = {
    actions
};

module.exports = Action;