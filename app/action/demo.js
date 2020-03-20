const Message = require("../../lib/message.js");
const Protocol = require("../../lib/protocol.js");
const Pusher = require("../../lib/pusher.js");
const Sender = require("../../lib/sender.js");
const Context = require("../../lib/context.js");
const Datastore = require("../../lib/datastore.js");
const QueryQueue = require("../../lib/queryQueue.js");
const serverContext = Context.getServerContext();

// actions
const actions = {};
actions.speak = function(param, queryContext) {

    // 未登录，不允许发言
    if (!this.userId) {
        return false;
    }
    // 未指定房间
    if (!param.room) {
        return false;
    }
    
    /*
    // 异步写法：直接扔到队列，交由 worker 去处理
    const query = {
        action: "speak",
        // 解构；pb3 格式解析后，构造函数非 Object，无法直接 JSON.stringify
        param: {...param},
        context: {...queryContext}
    };
    QueryQueue.addQueryToQueue("default", query);
    return false;
    */

    const channelName = (param.room || "default");
    const data = {
        name: (param.name || "noname"),
        words: param.words
    };

    // 发送给频道对应的所有实例
    Datastore.getServerIdsByChannel(channelName).then(function(serverIds) {
        if (!serverIds) {
            return;
        }
        serverIds.forEach(function(serverId) {
            if (serverId === serverContext.serverId) {
                Pusher.pushMessage2Channel(channelName, Message.create('show', data));
                // Note: if build data as pb3 Data, the message will be sent as a pb3 Message.
                // const pb3Data = Protocol.obj2pb3Data("ChatWords", data);
                // Pusher.pushMessage2Channel(channelName, Message.create('show', pb3Data));
                return;
            }
            // 通过 Datastore根据 serverId 获取 serverHost 并发送
            // 说明：也可以偷懒，直接用 serverId 当 serverHost （默认 相同） 发送，但需要注意 Promis fail() 处理
            Datastore.getServerHost(serverId).then((serverHost) => {
                // server 失效
                if (!serverHost) {
                    Datastore.removeServerFromChannel(channelName, serverId);
                } else {
                    Sender.sendChannelMessage2Server(serverHost, channelName, "show", data);
                }
            }, () => {
                // fail
            });
        });
    });

    return false;
};

module.exports = actions;
