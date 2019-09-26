
const Message = require("../lib/message.js");
const Pusher = require("../lib/pusher.js");

const actions = {};

actions.speak = function(param) {
    
    const channelName = (param.channelName || "default");
    const data = {
        name: (param.name || "noname"),
        words: param.words
    };
    
    const message = Message.create('show', data);
    Pusher.pushMessage2Channel(channelName, message);
    return false;
};

module.exports = actions;