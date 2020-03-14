
const Logger = require("../logger.js");

/**
 * log4js log
 * @param {Object} options
 */
const Log4jsHandler = function(options) {
    
    const log4js = require('log4js');
    
    // 完整配置（完整 configure，且确保 category 包含 default） 或者 简配（仅需设置 appender）
    if (options.configure) {
        log4js.configure(options.configure);
    } else if (options.appender) {
        log4js.configure({
            appenders: {default: options.appender},
            categories: {default: { appenders: ["default"], level: "trace" }}            
        });
    }
    const logger = log4js.getLogger("default");
    
    const configLevel = options.level || Logger.LEVELS.OFF;
    this.log = function(level, msg, context = null) {
        
        // 检查日志等级
        if (Logger.compareLevel(level, configLevel) < 0) {
            return;
        }
        const content = msg + (context ? " | " + JSON.stringify(context) : "");
        logger[level](content);
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

module.exports = Log4jsHandler;