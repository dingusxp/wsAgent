
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
     * [TODO] load specified LogHandler by options
     */
    factory: function(options = {}) {
        
        const LogHandler = require("./loghandler/consoleLogHandler.js");
        return new LogHandler(options);
    }
};

module.exports = Logger;