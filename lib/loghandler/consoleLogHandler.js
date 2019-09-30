
const Util = require("../util.js");
const Logger = require("../logger.js");

/**
 * console log
 * @param {Object} options
 */
const ConsoleLogHandler = function(options) {
    
    // [TODO]
    // 控制打印的级别
    // 消息落地机制：N条或者S秒
    
    this.log = function(level, msg, context = {}) {
        
        // return;

        const time = Util.getIsoTime();
        const content = `[${level}] - ${time} : ${msg} | ${JSON.stringify(context)}`;
        console.log(content);
    };
    this.debug = function(msg, context = {}) {
        
        return this.log(Logger.LEVELS.DEBUG, msg, context);
    };
    this.info = function(msg, context = {}) {
        
        return this.log(Logger.LEVELS.INFO, msg, context);
    };
    this.notice = function(msg, context = {}) {
        
        return this.log(Logger.LEVELS.NOTICE, msg, context);
    };
    this.warning = function(msg, context = {}) {
        
        return this.log(Logger.LEVELS.WARNING, msg, context);
    };
    this.error = function(msg, context = {}) {
        
        return this.log(Logger.LEVELS.ERROR, msg, context);
    };
};

module.exports = ConsoleLogHandler;