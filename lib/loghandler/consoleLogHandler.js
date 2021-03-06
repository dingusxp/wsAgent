
const Util = require("../util.js");
const Logger = require("../logger.js");


/**
 * console log
 * @param {Object} options
 */
const ConsoleLogHandler = function(options) {
    
    const configLevel = options.level || Logger.LEVELS.OFF;
    this.log = function(level, msg, context = null) {
        
        // 检查日志等级
        if (Logger.compareLevel(level, configLevel) < 0) {
            return;
        }

        const time = Util.getIsoTime();
        const content = `[${level}] - ${time} : ${msg}` + (context ? " | " + JSON.stringify(context) : "");
        console.log(content);
    };
    this.trace = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.TRACE, msg, context);
    };
    this.debug = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.DEBUG, msg, context);
    };
    this.info = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.INFO, msg, context);
    };
    this.warn = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.WARN, msg, context);
    };
    this.error = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.ERROR, msg, context);
    };
    this.fatal = function(msg, context = null) {
        
        return this.log(Logger.LEVELS.FATAL, msg, context);
    };
};

module.exports = ConsoleLogHandler;