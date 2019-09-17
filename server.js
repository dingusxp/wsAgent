/**
 * websocket server with agent/channel service
 */

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const events = require('events');
const uuid = require('uuid');
const os = require('os');

const Protocol = require("./lib/protocol.js");
const Message = require("./lib/message.js");
const Action = require("./lib/action.js");
const Util = require("./lib/util.js");
const Config = require("./lib/config.js");
const Logger = require("./lib/logger.js");

// logger
const log = Logger.factory();

// server context
const serverId = uuid.v1();
const serverHost = Config.getConfig("serverHost") || os.hostname();
const serverRunAt = (+new Date);
const serverContext = {
    systemOS: os.arch() + " with " + os.cpus().length + " core(s)",
    systemRuntime: Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST),
    totalMemory: Util.formatNumber(os.totalmem(), Util.NUMBER_FORMATS.STORAGE),
    freeMemory: Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE),
    systemLoad: os.loadavg(),
    serverId,
    serverRuntime: 0,
    queryCount: 0,
    queryQPS: 0,
    pushCount: 0,
    pushQPS: 0,
    clientCount: 0,
    userCount: 0
};

// QPS 统计
const serverQpsStatInterval = Config.getConfig("serverQpsStatInterval") || 10;
let qpsLastQueryCount = 0;
let qpsLastPushCount = 0;
setInterval(function() {
    serverContext.queryQPS = parseInt((serverContext.queryCount - qpsLastQueryCount) / serverQpsStatInterval);
    qpsLastQueryCount = serverContext.queryCount;
    
    serverContext.pushQPS = parseInt((serverContext.pushCount - qpsLastPushCount) / serverQpsStatInterval);
    qpsLastPushCount = serverContext.pushCount;
}, serverQpsStatInterval * 1000);

// actions for handling client query
const actions = Action.actions;

// clientId -> socketContext
const clientSockets = {};
// userId -> clientId
const userClients = {};

// ws service
// const maxConnectionCount = Config.getConfig("maxConnectionCount") || 1000;
io.on('connection', function(socket) {

    // clientId
    const clientId = serverId + "_" + socket.id;
    const socketContext = {
        clientId: clientId,
        socket: socket,
        connectedAt: (+new Date),
        lastActiveAt: (+new Date),
        userId: null
    };
    clientSockets[clientId] = socketContext;
    log.info(Logger.LEVELS.INFO, clientId + ": new connect");

    // methods listen
    // ping
    socket.on("_ping", function(data) {

        // log.info(Logger.LEVELS.INFO, clientId + ": send ping");

        socketContext.lastActiveAt = (+new Date);
        socket.emit("_ack", {
            serverId: serverId,
            time: (+new Date)
        });
    });

    // ack
    socket.on("_ack", function(data) {

        // log.info(Logger.LEVELS.INFO, clientId + ": send ack");

        socketContext.lastActiveAt = (+new Date);
    });

    // 断开连接
    socket.on('disconnect', function() {
        
        // delete
        if (clientSockets[clientId]) {
            if (clientSockets[clientId].userId && userClients[clientSockets[clientId].userId]) {
                delete userClients[clientSockets[clientId].userId];
            }
            delete clientSockets[clientId];
        }

        log.info(Logger.LEVELS.INFO, "disconnected #" + clientId);
    });

    // query
    socket.on('query', function(query) {

        log.info(Logger.LEVELS.INFO, clientId + ": send query, param=" + JSON.stringify(query));
        
        serverContext.queryCount++;
        socketContext.lastActiveAt = (+new Date);

        const actionName = query.action;
        if (!actionName || !actions[actionName]) {
            return false;
        }

        const context = { ...serverContext,
            ...socketContext,
            query,
            clientSockets,
            userClients,
            socketIo: io
        };
        const resolve = function(data) {

            log.info(Logger.LEVELS.INFO, clientId + ": query handled, return=" + JSON.stringify(data));

            if (false === data) {
                return;
            }
            const messageContext = {
                queryId: query.id
            };
            socket.emit('message', Message.create(Protocol.INTERNAL_MESSAGE_TYPIES.CALLACK, data,
                messageContext));
        };

        // allow action method return data/Promise instance
        const resp = actions[actionName].call(context, query.param || {});
        if (typeof resp === "object" && resp instanceof Promise) {
            resp.then(resolve);
        } else {
            resolve(resp);
        }
    });

    // ack
    socket.emit("_ack", {
        serverId: serverId,
        time: (+new Date)
    });
});

// http api
app.get('/', function(req, res) {
    
    res.send("OK");
});
app.get('/status', function(req, res) {
    
    // server info
    serverContext.systemRuntime = Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST);
    serverContext.freeMemory = Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE);
    serverContext.systemLoad = os.loadavg();
    serverContext.serverRuntime = Util.formatNumber(parseInt(((+ new Date) - serverRunAt) / 1000), Util.NUMBER_FORMATS.TIMECOST);
    
    // client count
    serverContext.userCount = Object.keys(userClients).length;
    serverContext.clientCount = Object.keys(clientSockets).length;
    
    res.send(JSON.stringify(serverContext));
});

let maxPushQPS = Config.getConfig("maxPushQPS") || 1000;
app.get('/message2user', function(req, res) {
    
    const param = req.query || {};
    // param: userIds=123,456&type=xxx&data={encoded_json_data}&context={encoded_context_data}
    if (typeof param.userIds === 'undefined') {
        log.info(Logger.LEVELS.INFO, '[warning] bad push request, no userIds given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }
    
    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverContext.pushCount++;
    
    param.data = Util.json2obj(param.data);
    param.context = Util.json2obj(param.context);
    log.info(Logger.LEVELS.INFO, '[info] request push to user: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    param.userIds.split(',').forEach(function(userId) {
        const clientId = userClients[userId];
        if (clientId) {
            clientSockets[clientId].socket.emit('message', pushMessage);
        }
    });
    
    res.send('success');
});
app.get('/message2channel', function(req, res) {

    const param = req.query || {};
    // param: channelName=abc&type=xxx&data={encoded_json_data}&context={encoded_context_data}
    if (typeof param.channelName === 'undefined') {
        log.info(Logger.LEVELS.INFO, '[warning] bad push request, no channelName given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }
    
    // 限流
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverContext.pushCount++;
    
    param.data = Util.json2obj(param.data);
    param.context = Util.json2obj(param.context);
    log.info(Logger.LEVELS.INFO, '[info] request push to channel: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    io.to(param.channelName).emit("message", pushMessage);

    res.send('success');
});


// listen
http.listen(8888, function() {
    log.info(Logger.LEVELS.INFO, 'agent server is ready: ws://0.0.0.0:8888/');
});
