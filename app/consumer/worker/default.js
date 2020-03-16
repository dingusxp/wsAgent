const QueryQueue = require("../../lib/queryQueue.js");
const Datastore = require("../../lib/datastore.js");
const Sender = require("../../lib/sender.js");

// 无任务时，休息时间间隔（单位：ms）
const REST_INTERVAL = 1000;

// 碰到取任务错误是，延迟时间（单位：ms）
const ON_ERROR_DELAY_TIME = 3000;

// 超过多长时间的任务，不处理（单位：s）
const EXPIRE_ACTION_TIME = 30

// 该队列中的 action 的处理。
const actions = {};
actions.speak = function(query) {

    return new Promise(function(resolve, fail) {

        // 未登录，不允许发言
        if (!query.context.userId) {
            fail("user not login");
            return;
        }

        const param = query.param;
        const channelName = (param.channelName || "default");
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
                Sender.sendChannelMessage2Server(serverId, channelName, "show", data);
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
        const resp = actions[actionName].call(context, query);
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
