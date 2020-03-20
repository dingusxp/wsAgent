const QueryQueue = require("../../../lib/queryQueue.js");
const Datastore = require("../../../lib/datastore.js");
const Sender = require("../../../lib/sender.js");
const Protocol = require("../../../lib/protocol.js");

// 无任务时，休息时间间隔（单位：ms）
const REST_INTERVAL = 1000;

// 碰到取任务错误是，延迟时间（单位：ms）
const ON_ERROR_DELAY_TIME = 3000;

// 超过多长时间的任务，不处理（单位：s）
const EXPIRE_ACTION_TIME = 30

// 该队列中的 action 的处理。
const actions = {};
actions.speak = function(param) {

    // 未登录，不允许发言
    if (!this.userId) {
        console.log("bad param: user not login");
        return false;
    }
    if (!param.room) {
        console.log("bad param: no room specified");
        return false;
    }
        
    return new Promise(function(resolve, fail) {

        const channelName = param.room;
        const data = {
            name: (param.name || "noname"),
            words: param.words
        };

        // 发送给频道对应的所有实例
        Datastore.getServerIdsByChannel(channelName).then(function(serverIds) {
            if (!serverIds) {
                resolve();
                return;
            }
            serverIds.forEach(function(serverId) {
                Datastore.getServerHost(serverId).then((getServerHost) => {
                    if (!getServerHost) {
                        Datastore.removeServerFromChannel(channelName, serverId);
                    } else {
                        Sender.sendChannelMessage2Server(serverHost, channelName, "show", data);
                        // or send with pb3. 
                        // const pb3Data = Protocol.obj2pb3Data("ChatWords", data);
                        // Sender.sendChannelMessage2Server(serverHost, channelName, "show", pb3Data);
                    }
                }, () => {
                    // fail
                });
            });
            resolve();
        }, function(err) {
            fail("fail to get channels: " + err);
        });
    });
};

// 持续运行：取出任务分发action执行
const consume = function() {

    QueryQueue.popQueryFromQueue("default").then(function(data) {
        if (!data) {
            // console.log("[info] empty list. have a rest");
            setTimeout(consume, REST_INTERVAL);
            return;
        }
        console.log("[info] process data: " + data);
        const query = JSON.parse(data);
        if (!query) {
            console.log("[error] bad data");
            consume();
            return;
        }
        const now = (+new Date);
        if (now - query.context.queryAt > EXPIRE_ACTION_TIME * 1000) {
            console.log("[error] timeout");
            consume();
            return;
        }
        const actionName = query.action;
        if (!actionName || !actions[actionName]) {
            console.log("[error] bad action name: " + actionName);
            consume();
            return;
        }
        // do action
        const context = query.context;
        const resp = actions[actionName].call(context, query.param);
        if (typeof resp === "object" && resp instanceof Promise) {
            resp.then(function() {
                consume();
            }, function(err) {
                console.log("[error] failed: " + err)
                consume();
            });
        } else {
            consume();
        }
    }, function(err) {
        console.log("[error] system error: " + err);
        setTimeout(consume, ON_ERROR_DELAY_TIME);
        return;
    });
};
consume();
