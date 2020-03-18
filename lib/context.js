const os = require('os');

const Config = require("./config.js");
const Util = require("./util.js");
const Datastore = require("./datastore.js");

// ========== server context  ============ //
// clientId -> socketContext
const clientSockets = {};
// userId -> clientId
const userClients = {};
// channel -> clientId
const channelClients = {};

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

    socketIo: null,
    clientSockets,
    userClients,
    channelClients,
    clientCount: 0,
    userCount: 0,
    channelCount: 0,
    channelClientCount: {},
    queryCount: 0,
    queryQPS: 0,
    pushCount: 0,
    pushQPS: 0,
    pushSucceedCount: 0,
    pushSucceedRate: 0,
    latencySampling: [],
    avgLatency: 0,

    lastRefreshAt: 0
};

const getServerContext = function() {

    return serverContext;
};

const getServerStatus = function() {

    let statusInfo = {};
    for (let k in serverContext) {
        // 过滤值为对象/数组的值
        if (typeof serverContext[k] === "object") {
            continue;
        }
        statusInfo[k] = serverContext[k];
    }
    return statusInfo;
};

// server context refresh
let qpsLastQueryCount = 0;
let qpsLastPushCount = 0;
const refreshServerContext = function() {

    const now = (+new Date);
    const refreshInterval = now - serverContext.lastRefreshAt;
    // 更新时间间隔若小于 1s，直接返回
    if (refreshInterval < 1000) {
        return;
    }
    serverContext.lastRefreshAt = now;

    // 更新 qps
    serverContext.queryQPS = parseInt(1000 * (serverContext.queryCount - qpsLastQueryCount) / refreshInterval);
    qpsLastQueryCount = serverContext.queryCount;

    serverContext.pushQPS = parseInt(1000 * (serverContext.pushCount - qpsLastPushCount) / refreshInterval);
    qpsLastPushCount = serverContext.pushCount;

    serverContext.pushSucceedRate = parseInt(1000 * serverContext.pushSucceedCount / serverContext.pushCount) / 10;

    // latency
    if (serverContext.latencySampling.length > 0) {
        let total = 0;
        let cnt = 0;
        serverContext.latencySampling.forEach(function(v) {
            total += v;
            cnt++;
        });
        serverContext.avgLatency = parseInt(total / cnt);
        serverContext.latencySampling = [];
    }

    // count
    // serverContext.clientCount = Object.keys(serverContext.clientSockets).length;
    // serverContext.userCount = Object.keys(serverContext.userClients).length;
    // serverContext.channelCount = Object.keys(serverContext.channelClients).length;
    // serverContext.channelClientCount = {};
    // serverContext.channelClients.forEach(function(v, k) {
    //     serverContext.channelClientCount[k] = Object.keys(v).length;
    // });

    // server info
    serverContext.systemRuntime = Util.formatNumber(os.uptime(), Util.NUMBER_FORMATS.TIMECOST);
    serverContext.freeMemory = Util.formatNumber(os.freemem(), Util.NUMBER_FORMATS.STORAGE);
    serverContext.systemLoad = os.loadavg().join(' ');
    serverContext.serverRuntime = Util.formatNumber(parseInt(((+new Date) - serverRunAt) / 1000), Util.NUMBER_FORMATS
        .TIMECOST);

    // 上报 server status 到 datastore
    const statusInfo = getServerStatus();
    Datastore.setServerStatus(serverId, statusInfo);
};
const serverContextRefreshInterval = Config.getConfig("serverContextRefreshInterval") || 15;
setInterval(refreshServerContext, serverContextRefreshInterval * 1000);
refreshServerContext();
const serverDumpUserInterval = Config.getConfig("serverDumpUserInterval") || 300;
setInterval(function() {
    const userIds = Object.keys(userClients);
    Datastore.batchSetServerUsers(serverId, userIds);
}, serverDumpUserInterval * 1000);

// ========== client context  ============ //
/**
 * 新增一个客户端连接，注册信息
 * @param {Object} clientId
 * @param {Object} socket
 */
const addClientContext = function(clientId, socket) {

    clientSockets[clientId] = {
        clientId: clientId,
        socket: socket,
        connectedAt: (+new Date),
        lastActiveAt: (+new Date),
        userId: null,
        channels: {},
        latency: 0
    }
    return clientSockets[clientId];
};

/**
 * 获取客户端连接信息
 * @param {Object} clientId
 */
const getClientContext = function(clientId) {

    return clientSockets[clientId];
};

/**
 * 注销一个客户端连接信息
 * @param {Object} clientId
 */
const dropClientContext = function(clientId) {

    if (!clientSockets[clientId]) {
        return;
    }

    // user id
    const userId = clientSockets[clientId].userId;
    if (userId && userClients[userId]) {
        delete userClients[userId];
        serverContext.userCount--;
    }
    // channels
    const channelNames = clientSockets[clientId].channels || {};
    for (let channelName in channelNames) {
        delete serverContext.channelClients[channelName][clientId];
        serverContext.channelClientCount[channelName]--;
        if (serverContext.channelClientCount[channelName] === 0) {
            delete serverContext.channelClientCount[channelName];
            delete serverContext.channelClients[channelName];
            serverContext.channelCount--;
        }
    }

    // client
    delete clientSockets[clientId];
    serverContext.clientCount--;
};

module.exports = {
    getServerContext,
    refreshServerContext,
    getServerStatus,
    addClientContext,
    getClientContext,
    dropClientContext
};
