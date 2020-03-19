/**
 * 内置请求处理方法：用户登录身份校验，订阅、取消 频道
 * 请按实际需求修改
 */
const Action = require("../../lib/action.js");
const Protocol = require("../../lib/protocol.js");

// internal actions
// you may modify, but please do not remove these actions
const actions = {};

// auth (login)
actions[Protocol.INTERNAL_QUERY_ACTIONS.AUTH] = function(param) {

    // change to your formal auth
    // if it is a asynchronous process, please return a Promise object
    const userId = param.userId;
    
    return Action.actionUserJoin(userId, this);
};

// quit (logout)
actions[Protocol.INTERNAL_QUERY_ACTIONS.QUIT] = function(param) {

    // change to your formal auth
    // if it is a asynchronous process, please return a Promise object
    
    return Action.actionUserQuit(userId, this);
};

// subscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE] = function(param) {
    
    // add something if you want
    
    return Action.actionSubscribe(param, this);
};

// unsubscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE] = function(param) {

    // add something if you want
    
    return Action.actionUnsubscribe(param, this);
};

module.exports = actions;