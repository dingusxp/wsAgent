/**
 * a websocket server with agent/channel service
 */

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

// protocol
const Protocol = require("./lib/protocol.js");
const Message = require("./lib/message.js");

// config
const Config = require("./lib/config.js");
Config.mergeCommandArgs(process.argv.splice(2));

// server context
const Context = require("./lib/context.js");
const serverContext = Context.getServerContext();
serverContext.socketIo = io;

// logger
const Logger = require("./lib/logger.js");
const log = Logger.getDefaultLogHandler();

// actions for handling client query
const Action = require("./lib/action.js");
const actions = Action.actions;

// puser
const Pusher = require("./lib/pusher.js");

// query queue
const QueryQueue = require("./lib/queryQueue.js");

// ws service
const maxConnectionCount = Config.getConfig("maxConnectionCount") || 10000;
const maxQueryQPS = Config.getConfig("maxQueryQPS") || 1000;
io.on('connection', function(socket) {

    // 超过限额，拒绝连接
    if (serverContext.clientCount >= maxConnectionCount) {
        log.warning("new connection refused - max connection reached!");
        socket.disconnect(true);
        return;
    }

    // clientId
    const clientId = socket.id + '@' + serverContext.serverId;
    const clientContext = Context.addClientContext(clientId, socket);
    serverContext.clientCount++;
    // log.info(clientId + ": new connect");

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

    // 断开连接
    socket.on('disconnect', function() {

        Context.dropClientContext(clientId);
        // log.info("disconnected #" + clientId);
    });

    // query
    socket.on('query', function(query) {

        // log.info(clientId + ": send query, param=" + JSON.stringify(query));

        // 限流
        if (serverContext.queryQPS > maxQueryQPS) {
            socket.emit("_ack", {
                queryId: query.id,
                status: 503
            });
            return;
        }

        serverContext.queryCount++;
        serverContext.lastActiveAt = (+new Date);

        // _ack
        socket.emit("_ack", {
            queryId: query.id,
            status: 200
        });

        // priority level queue: add to queue
        if (query.priority === Protocol.QUERY_PRIORITIES.LEVEL_QUEUE) {
            query.context.serverId = serverContext.serverId;
            query.context.serverHost = serverContext.serverHost;
            query.context.clientId = clientId;
            query.context.userId = clientContext.userId;
            query.context.queryAt = (+new Date);

            QueryQueue.addQueryToQueue(query);
            return;
        }

        // default: priority immidiate
        const actionName = query.action;
        if (!actionName || !actions[actionName]) {
            return false;
        }

        const resolve = function(data) {

            // log.info(clientId + ": query handled, return=" + JSON.stringify(data));

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
        const resp = actions[actionName].call(clientContext, query.param || {});
        if (typeof resp === "object" && resp instanceof Promise) {
            resp.then(resolve);
        } else {
            resolve(resp);
        }
    });
});

// http api
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.get('/', function(req, res) {

    res.send("OK");
});

app.get('/status', function(req, res) {

    // 更新信息
    // Context.refreshServerContext();

    const statusInfo = Context.getServerStatus();
    res.send(JSON.stringify(statusInfo));
});

const maxPushQPS = Config.getConfig("maxPushQPS") || 10000;
app.post('/message2client', function(req, res) {

    const param = req.body || {};
    if (typeof param.clientIds === 'undefined') {
        log.info('[warning] bad push request, no clientIds given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }

    log.info('[info] request push to client: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    param.clientIds.split(',').forEach(function(clientId) {
        Pusher.pushMessage2Client(clientId, pushMessage);
    });

    res.send('success');
});
app.post('/message2user', function(req, res) {

    const param = req.body || {};
    if (typeof param.userIds === 'undefined') {
        log.info('[warning] bad push request, no userIds given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }

    log.info('[info] request push to user: ' + JSON.stringify(param));
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
        log.info('[warning] bad push request, no channelName/type given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }

    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }

    log.info('[info] request push to channel: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    Pusher.pushMessage2Channel(param.channelName, pushMessage);

    res.send('success');
});

// listen
http.listen(serverContext.serverPort, function() {
    log.info(`agent server is ready: ws://${serverContext.serverHost}}/`);
});
