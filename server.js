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

const Protocol = require("./lib/protocol.js");
const Message = require("./lib/message.js");
const Action = require("./lib/action.js");
const Config = require("./lib/config.js");
const Util = require("./lib/util.js");
const Logger = require("./lib/logger.js");
const Context = require("./lib/context.js");
const Pusher = require("./lib/pusher.js");

// server context
const serverContext = Context.getServerContext();
serverContext.socketIo = io;

// logger
const log = Logger.getDefaultLogHandler();

// actions for handling client query
const actions = Action.actions;

// ws service
// const maxConnectionCount = Config.getConfig("maxConnectionCount") || 1000;
io.on('connection', function(socket) {

    // clientId
    const clientId = socket.id + '@' + serverContext.serverId;
    const clientContext = Context.addClientContext(clientId, socket);
    serverContext.clientCount++;
    log.info(clientId + ": new connect");

    // methods listen
    // _time
    socket.on("_time", function(data) {

        clientContext.lastActiveAt = (+new Date);
        socket.emit("_ack", {
            time: (+new Date)
        });
    });

    // ack
    const messageSet = [];
    socket.on("_ack", function(data) {
        
        clientContext.lastActiveAt = (+new Date);
        Pusher.markMessageAck(clientId, data);
    });

    // 断开连接
    socket.on('disconnect', function() {
        
        Context.dropClientContext(clientId);
        
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
        
        const resolve = function(data) {

            log.info(clientId + ": query handled, return=" + JSON.stringify(data));

            if (false === data) {
                return;
            }
            const messageContext = {
                queryId: query.id
            };
            // push client message
            socket.emit('message', );
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
app.get('/', function(req, res) {
    
    res.send("OK");
});

app.get('/status', function(req, res) {
    
    // 更新信息
    Context.refreshServerContext();

    // 回显 serverContext 信息
    let statusInfo = {};
    for (let k in serverContext) {
        // 过滤值为对象/数组的值
        if (typeof serverContext[k] === "object") {
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
    
    param.data = Util.json2obj(param.data);
    param.context = Util.json2obj(param.context);
    log.info('[info] request push to user: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type || "", param.data || {}, param.context || {});
    param.userIds.split(',').forEach(function(userId) {
        const clientId = serverContext.userClients[userId];
        Pusher.pushMessage2Client(clientId, pushMessage);
    });
    
    res.send('success');
});
app.get('/message2channel', function(req, res) {

    const param = req.query || {};
    // param: channelName=abc&type=xxx&data={encoded_json_data}&context={encoded_context_data}
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
    
    const data = param.data ? Util.json2obj(param.data) : {};
    const context = param.context ? Util.json2obj(param.context) : {};
    log.info('[info] request push to channel: ' + JSON.stringify(param));
    const pushMessage = Message.create(param.type, param.data, param.context);
    Pusher.pushMessage2Channel(param.channelName, pushMessage);

    res.send('success');
});

// listen
http.listen(serverContext.serverPort, function() {
    log.info(`agent server is ready: ws://${serverContext.serverHost}}/`);
});