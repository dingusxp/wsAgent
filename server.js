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
// const uuid = require('uuid');
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
const serverIp = Config.getConfig("serverIp") || "127.0.0.1";
const serverPort = Config.getConfig("serverPort") || 8888;
const serverHost = serverIp + ":" + serverPort;
const serverRunAt = (+new Date);
const serverId = serverHost;
const serverContext = {
    systemOS: os.arch() + " with " + os.cpus().length + " core(s)",
    systemRuntime: Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST),
    totalMemory: Util.formatNumber(os.totalmem(), Util.NUMBER_FORMATS.STORAGE),
    freeMemory: Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE),
    systemLoad: os.loadavg(),
    
    serverRunAt: Util.getIsoTime(),
    serverRuntime: 0,
    serverId,
    serverRunAt,
    serverIp,
    serverPort,
    serverHost,
    
    clientSockets,
    userClients,
    socketIo: io,
    queryCount: 0,
    queryQPS: 0,
    pushCount: 0,
    pushQPS: 0,
    clientCount: 0,
    userCount: 0,
    
    lastRefreshAt: 0
};

// server context refresh
let qpsLastQueryCount = 0;
let qpsLastPushCount = 0;
const refreshServerContext = function() {
    
    const time = (+ new Date);
    // 更新时间间隔若小于 1s，直接返回
    if (time - serverContext.lastRefreshAt < 1000) {
        return;
    }
    serverContext.lastRefreshAt = time;
    
    // 更新 qps
    serverContext.queryQPS = parseInt((serverContext.queryCount - qpsLastQueryCount) / serverContextRefreshInterval);
    qpsLastQueryCount = serverContext.queryCount;
    
    serverContext.pushQPS = parseInt((serverContext.pushCount - qpsLastPushCount) / serverContextRefreshInterval);
    qpsLastPushCount = serverContext.pushCount;
    
    // server info
    serverContext.systemRuntime = Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST);
    serverContext.freeMemory = Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE);
    serverContext.systemLoad = os.loadavg();
    serverContext.serverRuntime = Util.formatNumber(parseInt(((+ new Date) - serverRunAt) / 1000), Util.NUMBER_FORMATS.TIMECOST);

    // client count
    serverContext.userCount = Object.keys(userClients).length;
    serverContext.clientCount = Object.keys(clientSockets).length;
};
const serverContextRefreshInterval = Config.getConfig("serverContextRefreshInterval") || 10;
setInterval(refreshServerContext, serverContextRefreshInterval * 1000);
refreshServerContext();

// ws service
// const maxConnectionCount = Config.getConfig("maxConnectionCount") || 1000;
io.on('connection', function(socket) {

    // clientId
    const clientId = socket.id + '@' + serverId;
    const socketContext = {
        clientId: clientId,
        socket: socket,
        connectedAt: (+new Date),
        lastActiveAt: (+new Date),
        userId: null,
        latency: 0
    };
    clientSockets[clientId] = socketContext;
    log.info(clientId + ": new connect");

    // methods listen
    // _time
    socket.on("_time", function(data) {

        socketContext.lastActiveAt = (+new Date);
        socket.emit("_ack", {
            time: (+new Date)
        });
    });

    // ack
    socket.on("_ack", function(data) {

        // data.messageId， 根据计算延迟

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
        
        serverContext.queryCount++;
        serverContext.lastActiveAt = (+new Date);
        
        // _ack
        socket.emit("_ack", {queryId: query.id});

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
});

// http api
app.get('/', function(req, res) {
    
    res.send("OK");
});

app.get('/status', function(req, res) {
    
    // 更新信息
    refreshServerContext();

    // 回显 serverContext 信息
    let statusInfo = {};
    for (let k in serverContext) {
        // 过滤值为对象/数组的值
        if (typeof serverContext === "object") {
            continue;
        }
        statusInfo[k] = serverContext[k];
    }
    
    res.send(JSON.stringify(statusInfo));
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
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverContext.pushCount++;
    
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
    if (serverContext.pushQPS > maxPushQPS) {
        res.send('max push reached');
        return;
    }
    serverContext.pushCount++;
    
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
