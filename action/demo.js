
const Message = require("../message.js");

const actions = {};

actions.speak = function(param) {
    
    const channelName = (param.channelName || "default");
    const data = {
        name: (param.name || "noname"),
        words: param.words
    };
    // console.log('[info] ' + data.name + " says to @" + channelName + ": " + data.words);
    this.socketIo.to(channelName).emit("message", Message.create('show', data));
    return false;
};

module.exports = actions;