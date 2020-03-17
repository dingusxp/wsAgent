const Message = require("../../lib/message.js");
const Protocol = require("../../lib/protocol.js");
const Pusher = require("../../lib/pusher.js");
const Sender = require("../../lib/sender.js");
const Context = require("../../lib/context.js");
const Datastore = require("../../lib/datastore.js");
const serverContext = Context.getServerContext();

// actions
const actions = {};
actions.speak = function(param) {

    // 未登录，不允许发言
    if (!this.userId) {
        return false;
    }

    const room = (param.room || "default");
    const data = {
        name: (param.name || "noname"),
        words: param.words
    };

    // 发送给频道对应的所有实例
    Datastore.getServerIdsByChannel(room).then(function(serverIds) {
        if (!serverIds) {
            return;
        }
        serverIds.forEach(function(serverId) {
            if (serverId === serverContext.serverId) {
                Pusher.pushMessage2Channel(room, Message.create('show', data));
                // Note: if build data as pb3 Data, the message will be sent as a pb3 Message.
                // const pb3Data = Protocol.obj2pb3Data("ChatWords", data);
                // Pusher.pushMessage2Channel(room, Message.create('show', pb3Data));
                return;
            }
            Sender.sendChannelMessage2Server(serverId, room, "show", data);
        });
    });

    return false;
};

module.exports = actions;
