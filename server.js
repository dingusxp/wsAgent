/**
 * websocket server with agent/channel service
 * 
 * [TODO]
 * 取消 ping （依赖 socket.io 默认机制）； query 和 message 均要 _ack，上报接收信息的延迟；
 * 增加 priority 为 队列级别 的 message；
 * 增加 datastore 机制，落地 连接信息，消息/请求 到存储，异步消费
 * fork 子进程分担cpu耗时操作？
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
const loggerConfig = Config.getConfig("logger") || {};
const log = Logger.factory(loggerConfig);

// actions for handling client query
const actions = Action.actions;

// clientId -> socketContext
const clientSockets = {};
// userId -> clientId
const userClients = {};

// server context
const serverId = uuid.v1();
const serverIp = Config.getConfig("serverIp") || "127.0.0.1";
const serverPort = Config.getConfig("serverPort") || 8888;
const serverRunAt = (+new Date);
const serverContext = {
    serverId,
    serverRunAt,
    serverIp,
    serverPort,
    serverHost: serverIp + ":" + serverPort,
    clientSockets,
    userClients,
    socketIo: io
};

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
    log.info(clientId + ": new connect");

    // methods listen
    // ping
    socket.on("_ping", function(data) {

        // log.info(clientId + ": send ping");

        socketContext.lastActiveAt = (+new Date);
        socket.emit("_ack", {
            serverId: serverId,
            time: (+new Date)
        });
    });

    // ack
    socket.on("_ack", function(data) {

        // log.info(clientId + ": send ack");

        socketContext.lastActiveAt = (+new Date);
    });

    // 断开连接
    socket.on('disconnect', function() {
        
        // delete
        if (clientSockets[clientId]) {
            const userId = clientSockets[clientId].userId;
            if (userId && userClients[userId]) {
                delete userClients[userId];
            }
            delete clientSockets[clientId];
        }

        log.info("disconnected #" + clientId);
    });

    // query
    socket.on('query', function(query) {

        log.info(clientId + ": send query, param=" + JSON.stringify(query));
        
        serverStatus.queryCount++;
        serverStatus.lastActiveAt = (+new Date);

        const actionName = query.action;
        if (!actionName || !actions[actionName]) {
            return false;
        }

        const context = { ...serverContext,
            ...socketContext,
            query
        };
        const resolve = function(data) {

            log.info(clientId + ": query handled, return=" + JSON.stringify(data));

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

// server status
const serverStatus = {
    systemOS: os.arch() + " with " + os.cpus().length + " core(s)",
    systemRuntime: Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST),
    totalMemory: Util.formatNumber(os.totalmem(), Util.NUMBER_FORMATS.STORAGE),
    freeMemory: Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE),
    systemLoad: os.loadavg(),
    serverRunAt: Util.getIsoTime(),
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
    serverStatus.queryQPS = parseInt((serverStatus.queryCount - qpsLastQueryCount) / serverQpsStatInterval);
    qpsLastQueryCount = serverStatus.queryCount;
    
    serverStatus.pushQPS = parseInt((serverStatus.pushCount - qpsLastPushCount) / serverQpsStatInterval);
    qpsLastPushCount = serverStatus.pushCount;
}, serverQpsStatInterval * 1000);

app.get('/status', function(req, res) {
    /*
    // server info
    serverStatus.systemRuntime = Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST);
    serverStatus.freeMemory = Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE);
    serverStatus.systemLoad = os.loadavg();
    serverStatus.serverRuntime = Util.formatNumber(parseInt(((+ new Date) - serverRunAt) / 1000), Util.NUMBER_FORMATS.TIMECOST);
    
    // client count
    serverStatus.userCount = Object.keys(userClients).length;
    serverStatus.clientCount = Object.keys(clientSockets).length;
    */
    res.send(JSON.stringify(serverStatus));
});

let maxPushQPS = Config.getConfig("maxPushQPS") || 1000;
app.get('/message2user', function(req, res) {
    
    const param = req.query || {};
    // param: userIds=123,456&type=xxx&data={encoded_json_data}&context={encoded_context_data}
    if (typeof param.userIds === 'undefined') {
        log.info('[warning] bad push request, no userIds given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }
    
    // 限流
    if (serverStatus.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverStatus.pushCount++;
    
    param.data = Util.json2obj(param.data);
    param.context = Util.json2obj(param.context);
    log.info('[info] request push to user: ' + JSON.stringify(param));
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
        log.info('[warning] bad push request, no channelName given. param: ' + JSON.stringify(param));
        res.send('fail');
        return;
    }
    
    // 限流
    if (serverStatus.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverStatus.pushCount++;
    
    param.data = Util.json2obj(param.data);
    param.context = Util.json2obj(param.context);
    log.info('[info] request push to channel: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    io.to(param.channelName).emit("message", pushMessage);

    res.send('success');
});


// listen
http.listen(serverPort, function() {
    log.info(`agent server is ready: ws://${serverContext.serverHost}}/`);
});
