const QueryQueue = require("../../lib/queryQueue.js");
const Datastore = require("../../lib/datastore.js");
const Sender = require("../../lib/sender.js");

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

const consume = function() {

    QueryQueue.popQueryFromQueue("default").then(function(data) {
        if (!data) {
            // console.log("[info] empty list. have a rest");
            setTimeout(consume, 100);
            return;
        }
        console.log("[info] process data: " + data);
        const query = JSON.parse(data);
        const now = (+new Date);
        if (!query) {
            console.log("[error] bad data");
            consume();
            return;
        }
        if (now - query.context.queryAt > 30000) {
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
        const context = query.context;
        actions[actionName](query).then(function() {
            consume();
        }, function(err) {
            console.log("[error] failed: " + err)
            consume();
        });
    }, function(err) {
        console.log("[error] system error: " + err);
        setTimeout(consume, 500);
        return;
    });
};
consume();
