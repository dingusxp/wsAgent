
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

const Logger = {
    
    LEVELS,
    
    /**
     * [TODO] load specified LogHandler by config
     */
    factory: function(config = {}) {
        
        const LogHandler = require("./loghandler/consoleLogHandler.js");
        return new LogHandler(config);
    }
};

module.exports = Logger;