
const Action = require("../../lib/action.js");

// internal actions
// auth
const actions = {};
actions[Protocol.INTERNAL_QUERY_ACTIONS.AUTH] = function(param) {

    // change to your formal auth
    // if it is a asynchronous process, please return a Promise object
    const userId = param.userId;
    return Action.actionUserJoin(userId, this);
};

// subscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE] = function(param) {
    
    return Action.actionSubscribe(param);
};

// unsubscribe channel
actions[Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE] = function(param) {

    return Action.actionUnsubscribe(param);
};
