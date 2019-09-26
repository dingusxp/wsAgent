
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
    
    // [TODO]
    // 逻辑校验： 1，如果该连接原先对应另外的用户，需要重置；2，如果该用户对应了其它连接，需要踢掉原连接
    
    serverContext.clientSockets[this.clientId].userId = userId;
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