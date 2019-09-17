
/**
 * actions for handling client equest
 */
const fs = require('fs');
const Protocol = require("./protocol.js");

// actions
const actions = {};

// internal actions
// auth
actions[Protocol.INTERNAL_QUERY_ACTIONS.AUTH] = function(param) {
    
    // test
    let userId = param.userId;
    
    // [TODO]
    // 逻辑校验： 1，如果该连接原先对应另外的用户，需要重置；2，如果该用户对应了其它连接，需要踢掉原连接
    
    this.clientSockets[this.clientId].userId = userId;
    this.userClients[userId] = this.clientId;
    
    // [TODO]
    // mark message_pipe_user_[userId]
    
    return true;
};

// subscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE] = function(param) {
    
    const channelName = param;
    this.socket.join(channelName);
    
    // [TODO]
    // update message_pipe_channel_[channelName]
    
    return true;
};

// unsubscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE] = function(param) {
    
    const channelName = param;
    this.socket.leave(channelName);
    
    // [TODO]
    // update message_pipe_channel_[channelName]
    
    return true;
};

// load user actions
const actionDir = "./action";
const files = fs.readdirSync(actionDir);
files.forEach(function(fileName) {
    
    if (!fileName.endsWith('.js')) {
        return;
    }
    const moduleActions = require(actionDir + "/" + fileName);
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