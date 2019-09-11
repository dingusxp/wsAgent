// =====================  protocol.js  ========================//
/**
 * query priority
 */
const QUERY_PRIORITIES = {
    LEVEL_IMMIDIATE: 0,
    // LEVEL_QUEUE: 1,
    // LEVEL_UNNESSARY: 9
};

/**
 * internal query action
 */
const INTERNAL_QUERY_ACTIONS = {
    AUTH: '_auth',
    SUBSCRIBE: '_subscribe',
    UNSUBSCRIBE: '_unsubscribe'
};

/**
 * internal message type
 */
const INTERNAL_MESSAGE_TYPIES = {
    CALLACK: '_callback'
};

const Protocol = {
    QUERY_PRIORITIES,
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES
};


// =====================  util.js  ========================//
const fixServerUrl = function(serverUrl) {

    if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
        serverUrl = 'ws://' + serverUrl;
    }
    return serverUrl;
};

// =====================  agent.js  ========================//
/**
 * default ping interval
 */
const DEFAULT_PING_INTERVAL = 30000;

// agent part
let agentInstances = {};
let Agent = function(agentServer) {

    // instance
    agentServer = fixServerUrl(agentServer);
    if (agentInstances[agentServer]) {
        return agentInstances[agentServer];
    }
    let agent = this;
    agentInstances[agentServer] = agent;

    // connect
    let socket = io.connect(agentServer);

    // ping
    agent.connectStatus = "connecting";
    agent.syncTime = 0;
    agent.serverTime = 0;
    agent.serverId = null;
    agent.getTime = function() {
        return (+new Date) - agent.syncTime + agent.serverTime;
    };
    let pingInterval = DEFAULT_PING_INTERVAL;
    socket.on("_ack", function(data) {

        // server id 发生了变化！
        if (null !== agent.serverId && agent.serverId !== data.serverId) {

            // 重连
            // agent.connectStatus = "disconnected";
            // socket.disconnect();
        }

        agent.connectStatus = "connected";
        agent.syncTime = (+new Date);
        agent.serverTime = data.time;
        setTimeout(function() {
            socket.emit("_ping", {});
        }, pingInterval);
    });

    // common query
    let queryId = 0;
    let querySet = {};
    agent.query = function(action, param, callback, priority = 0, context = {}) {

        queryId++;
        let queryInfo = {
            id: queryId,
            action: action,
            param: param,
            time: agent.getTime(),
            priority: priority,
            context: context
        };
        querySet[queryId] = {
            query: queryInfo,
            status: "new",
            callback: typeof callback === "function" ? callback : null
        };
        socket.emit("query", queryInfo);
        return;
    };
    
    // auth: check login && bind user on server
    agent.auth = function(userAuth, callback) {
        
        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.AUTH, userAuth, callback);
    };
    
    // subscribe channel
    agent.subscribeChannel = function(channelName, callback) {
        
        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.SUBSCRIBE, channelName, callback);
    };
    
    // unsubscribe channel
    agent.unsubscribeChannel = function(channelName, callback) {

        return agent.query(Protocol.INTERNAL_QUERY_ACTIONS.UNSUBSCRIBE, channelName, callback);
    };

    // handle message
    let messageHandlers = {};
    agent.setMessageHandler = function(type, callback) {

        if (typeof callback !== "function") {
            console.log("[warning] bad message handler of " + type);
            return;
        }
        messageHandlers[type] = callback;
        console.log("[info] registerred message type handler: " + type);
    };
    socket.on("message", function(message) {
        
        console.log("[info] receive messge: " + JSON.stringify(message));

        if (typeof message !== "object") {
            console.log("bad message: " + message);
            return false;
        }
        
        let context = {};
        context.agent = agent;
        context.message = message;
        let queryId = message.context.queryId;
        let queryCallback = null;
        if (queryId && querySet[queryId]) {
            context.query = querySet[queryId].query;
            queryCallback = querySet[queryId].callback
            delete querySet[queryId];
        }

        // callback
        if (message.type === Protocol.INTERNAL_MESSAGE_TYPIES.CALLACK) {
            let queryId = message.context.queryId;
            if (queryCallback) {
                queryCallback.call(context, message.data);
            }
            return;
        }

        // user defined
        if (messageHandlers[message.type]) {
            messageHandlers[message.type].call(context, message.data);
            return;
        }
        
        console.log("[warning] message type handler is not defined: " + message.type);
    });

    return agent;
};