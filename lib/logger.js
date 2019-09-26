

const Config = require("./config.js");

/**
 * logger
 */

const LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    NOTICE: 'notice',
    WARNING: 'warning',
    ERROR: 'error'
};

let defaultLogHandler = null;

const Logger = {
    
    LEVELS,
    
    /**
     * [TODO] load specified LogHandler by config
     */
    factory: function(config = {}) {
        
        const LogHandler = require("./loghandler/consoleLogHandler.js");
        return new LogHandler(config);
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