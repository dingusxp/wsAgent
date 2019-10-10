/**
 * 通过 server 实例的 http 接口发送消息
 */

const http = require('http');

/**
 * 推送消息给指定实例
 * @param {Object} serverHost
 * @param {Object} path
 * @param {Object} requestData
 * @param {Object} successCallback
 * @param {Object} failCallback
 */
const _message2server = function(serverHost, path, requestData, successCallback, failCallback) {
    
    const content = JSON.stringify(requestData);
    const parts = serverHost.split(":");
    const options = {
        hostname: parts[0],
        port: parts[1],
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    };
    
    const req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            successCallback();
        });
    });
    req.on('error', function(e) {
        failCallback(e.message);
    });
    req.write(content);
    req.end();
};

/**
 * 通知实例，发送信息到指定频道
 */
const sendChannelMessage2Server = function(serverHost, channelName, messageType, messageData = {}, context = {}) {
    
    const path = '/message2channel';
    const requestData = {
        channelName: channelName,
        type: messageType,
        data: messageData,
        context: context
    };
    return new Promise(function(resolve, fail) {
        _message2server(serverHost, path, requestData, function() {
            resolve();
        }, function(err) {
            fail(err);
        });
    });
};

/**
 * 通知实例，发送信息给指定用户
 */
const sendUserMessage2Server = function(serverHost, userIds, messageType, messageData = {}, context = {}) {
    
    const path = '/message2user';
    const requestData = {
        userIds: typeof userIds.forEach === "function" ? userIds.join(",") : userIds,
        type: messageType,
        data: messageData,
        context: context
    };
    return new Promise(function(resolve, fail) {
        _message2server(serverHost, path, requestData, function() {
            resolve();
        }, function(err) {
            fail(err);
        });
    });
};

/**
 * 通知实例，发送信息给指定client
 */
const sendClientMessage2Server = function(serverHost, clientIds, messageType, messageData = {}, context = {}) {
    
    const path = '/message2client';
    const requestData = {
        clientIds: typeof clientIds.forEach === "function" ? clientIds.join(",") : clientIds,
        type: messageType,
        data: messageData,
        context: context
    };
    return new Promise(function(resolve, fail) {
        _message2server(serverHost, path, requestData, function() {
            resolve();
        }, function(err) {
            fail(err);
        });
    });
};

module.exports = {
    sendChannelMessage2Server,
    sendUserMessage2Server,
    sendClientMessage2Server
};