
const Config = require("./config.js");

/**
 * logger
 */
const LEVELS = {
    OFF: 'off',
    TRACE: 'trace',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal'
};
const levelRanks = {};
levelRanks[LEVELS.TRACE] = 1;
levelRanks[LEVELS.DEBUG] = 2;
levelRanks[LEVELS.INFO] = 4;
levelRanks[LEVELS.ERROR] = 8;
levelRanks[LEVELS.FATAL] = 16;
levelRanks[LEVELS.OFF] = 1024;

let defaultLogHandler = null;
const Logger = {
    
    LEVELS,
    
    /**
     * 比较两个 level 级别：相同返回 0，1大于2返回 1，1小于2返回 -1
     * @param {Object} level1
     * @param {Object} level2
     */
    compareLevel: function(level1, level2) {
        
        return levelRanks[level1] === levelRanks[level2] ? 0 : 
            (levelRanks[level1] > levelRanks[level2]) ? 1 : -1;
    },
    
    /**
     * load specified LogHandler by config
     */
    avaiableHandlers: {
        consoleLog: "consoleLogHandler",
        log4js: "log4jsHandler"
    },
    factory: function(config = {}) {
        
        if (!config.handler || !this.avaiableHandlers[config.handler]) {
            config = {handler: "consoleLog", options: {level: LEVELS.NONE}};
        }
        const LogHandler = require("./loghandler/" + this.avaiableHandlers[config.handler] + ".js");
        return new LogHandler(config.options || {});
    },

    /**
     * default log handler
     */
    getDefaultLogHandler: function() {

        if (defaultLogHandler) {
            return defaultLogHandler;
        }

        const loggerConfig = Config.getConfig("logger") || {};
        defaultLogHandler = Logger.factory(loggerConfig);
        return defaultLogHandler;
    },
};

module.exports = Logger;