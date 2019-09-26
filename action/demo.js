
const Message = require("../lib/message.js");
const Pusher = require("../lib/pusher.js");

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
    
    Pusher.pushMessage2Channel(channelName, Message.create('show', data));
    return false;
};

module.exports = actions;