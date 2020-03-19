/**
 * a websocket server with agent/channel service
 */

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

// message & protocol
const Message = require("./lib/message.js");
const Protocol = require("./lib/protocol.js");

// config
const Config = require("./lib/config.js");
Config.mergeCommandArgs(process.argv.splice(2));

// server context
const Context = require("./lib/context.js");
const serverContext = Context.getServerContext();
serverContext.socketIo = io;

// logger
const logger = require("./lib/logger.js").getDefaultLogHandler();

// actions for handling client query
const Action = require("./lib/action.js");
const actions = Action.loadActions();

// puser
const Pusher = require("./lib/pusher.js");

// ======== ws service ======== //
const maxConnectionCount = Config.getConfig("maxConnectionCount") || 10000;
const maxQueryQPS = Config.getConfig("maxQueryQPS") || 1000;
// 
const maxConnectionQPS = Config.getConfig("maxConnectionQPS") || 1000;
const connectionHitCount = 1000;
let lastConnectionHitAt = 0;
let connectionCount = 0;
let lockConnectionFlag = false;
io.on('connection', function(socket) {
    
    // lock flag
    if (lockConnectionFlag) {
        socket.emit("_ack", {
            status: 503
        });
        return;
    }
    
    // connection qps
    connectionCount++;
    if (connectionCount >= connectionHitCount) {
        const now = (+new Date);
        // 如果 qps 超限，锁住 1s 不接受新连接
        // 说明：当前请求放行
        if (1000 * connectionCount / (now - lastConnectionHitAt) >= maxConnectionQPS) {
            lockConnectionFlag = true;
            setTimeout(() => {
                lockConnectionFlag = false;
                lastConnectionHitAt = now;
            }, 1000);
        }
        
        // 重新计数
        lastConnectionHitAt = now;
        connectionCount = 0;
    }

    // 超过限额，拒绝连接
    if (serverContext.clientCount > maxConnectionCount) {
        logger.warn("new connection refused - max connection reached!");
        socket.disconnect(true);
        return;
    }

    // clientId
    const clientId = socket.id + '@' + serverContext.serverId;
    const clientContext = Context.addClientContext(clientId, socket);
    serverContext.clientCount++;
    logger.trace(clientId + ": new connect");

    // methods listen
    // _time
    socket.on("_time", function(data) {

        clientContext.lastActiveAt = (+new Date);
        socket.emit("_time", {
            time: (+new Date)
        });
    });

    // ack
    const messageSet = [];
    socket.on("_ack", function(data) {

        clientContext.lastActiveAt = (+new Date);
        Pusher.markMessageAcked(clientId, data);
    });

    // 断开连接回调
    // 注意：异常断开的连接（如 心跳超时），触发 disconnect 比较滞后（默认 30s）
    socket.on('disconnect', function() {

        // 注销用户
        if (clientContext.userId) {
            logger.debug("trigger user quit", clientContext.userId);
            Action.actionUserQuit(clientContext.userId, clientContext);
        }
        
        // 清除用户注册频道
        // channels
        for (let channelName in clientContext.channels) {
            logger.debug("trigger unsubscribe channel", channelName);
            Action.actionUnsubscribe(channelName, clientContext);
        }

        // context
        Context.dropClientContext(clientId);

        logger.trace("disconnected #" + clientId);
    });

    // query
    socket.on('query', function(query) {
        
        const now = (+new Date);
        
        // 解析协议
        query = Protocol.parseQuery(query);
        if (!query) {
            socket.emit("_ack", {
                status: 403
            });
            return;
        }
        
        logger.debug(`${clientId} send query #${query.id}`, query);

        // 限流
        if (serverContext.queryQPS > maxQueryQPS) {
            socket.emit("_ack", {
                queryId: query.id,
                status: 503
            });
            return;
        }

        serverContext.queryCount++;
        serverContext.lastActiveAt = now;

        // _ack
        socket.emit("_ack", {
            queryId: query.id,
            status: 200
        });

        // context
        queryContext = query.context || {};
        queryContext.queryAt = query.time;
        queryContext.ReceiveAt = now;
        queryContext.serverId = serverContext.serverId;
        queryContext.serverHost = serverContext.serverHost;
        queryContext.clientId = clientId;
        queryContext.userId = clientContext.userId;

        // default: priority immidiate
        const actionName = query.action;
        if (!actionName || !actions[actionName]) {
            logger.trace(`bad action: ${actionName} for query ${clientId} #${query.id}`, query);
            return false;
        }

        const resolve = function(data) {

            logger.debug(`${clientId} query #${query.id} handled.`, data);

            if (false === data) {
                return;
            }
            const messageContext = {
                queryId: query.id
            };
            // push client message
            const message = Message.create(Protocol.INTERNAL_MESSAGE_TYPIES.CALLACK,
                data,
                messageContext);
            Pusher.pushMessage2Client(clientId, message);
        };

        // allow action method return data/Promise instance
        const resp = actions[actionName].call(clientContext, query.param || {}, queryContext);
        if (typeof resp === "object" && resp instanceof Promise) {
            resp.then(resolve);
        } else {
            resolve(resp);
        }
    });
});

// ======== http api ======== //
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
// 状态接口
app.get('/', function(req, res) {

    res.send("OK");
});
app.get('/status', function(req, res) {

    // 更新信息
    // Context.refreshServerContext();

    const statusInfo = Context.getServerStatus();
    res.send(JSON.stringify(statusInfo));
});

// 控制操作
// 踢出用户
app.post('/kickUser', function(req, res) {
    
    const param = req.body || {};
    if (!param || !param.userId) {
        logger.trace("[warning] bad kick action. no userId given");
        res.send('fail. bad param');
        return;
    }
    
    const userId = param.userId;
    if (!serverContext.userClients[userId]) {
        res.send('fail. bad userId');
        return;
    }
    delete serverContext.userClients[userId];
    serverContext.userCount--;
    
    res.send("success");
});

// message push
const maxPushQPS = Config.getConfig("maxPushQPS") || 10000;
app.post('/message2client', function(req, res) {

    const param = req.body || {};
    if (typeof param.clientIds === 'undefined') {
        logger.trace('[warning] bad push request, no clientIds given.', param);
        res.send('fail. bad param');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    
    logger.debug('[info] request push to client. ', param);
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    param.clientIds.split(',').forEach(function(clientId) {
        Pusher.pushMessage2Client(clientId, pushMessage);
    });

    res.send('success');
});
app.post('/message2user', function(req, res) {

    const param = req.body || {};
    if (typeof param.userIds === 'undefined') {
        logger.trace('[warning] bad push request, no userIds given.' , param);
        res.send('fail. bad param');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }

    logger.debug('[info] request push to user', param);
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    param.userIds.split(',').forEach(function(userId) {
        const clientId = serverContext.userClients[userId];
        Pusher.pushMessage2Client(clientId, pushMessage);
    });

    res.send('success');
});
app.post('/message2channel', function(req, res) {

    const param = req.body || {};
    if (typeof param.channelName === 'undefined' || typeof param.type === "undefined") {
        logger.trace('[warning] bad push request, no channelName/type given.', param);
        res.send('fail. bad param');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }

    logger.debug('[info] request push to channel.', param);
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    Pusher.pushMessage2Channel(param.channelName, pushMessage);

    res.send('success');
});

// listen
http.listen(serverContext.serverPort, function() {
    logger.trace(`agent server is ready: ws://${serverContext.serverHost}}/`);
});
