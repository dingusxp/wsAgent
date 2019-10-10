
const Message = require("../lib/message.js");
const Pusher = require("../lib/pusher.js");
const Sender = require("../lib/sender.js");
const Context = require("../lib/context.js");
const Datastore = require("../lib/datastore.js");

const serverContext = Context.getServerContext();

const actions = {};

actions.speak = function(param) {
    
    // 未登录
    if (!this.userId) {
        this.socket.emit("message", Message.create('login', {}));
        return false;
    }
    
    const channelName = (param.channelName || "default");
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
                return;
            }
            Sender.sendChannelMessage2Server(serverId, channelName, "show", data);
        });
    });
    
    return false;
};

module.exports = actions;