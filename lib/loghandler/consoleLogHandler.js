
const Util = require("./lib/util.js");

/**
 * console log
 * @param {Object} options
 */
const ConsoleLogHandler = function(options) {
    
    this.log = function(level, msg, context = {}) {
        
        const time = Util.getIsoTime();
        const content = `[${level}] - ${time} : ${msg} | ${JSON.stringify(context)}`;
        console.log(content);
    };
    this.debug = function(msg, context = {}) {
        
        return this.log(LEVELS.DEBUG, msg, context);
    };
    this.info = function(msg, context = {}) {
        
        return this.log(LEVELS.INFO, msg, context);
    };
    this.notice = function(msg, context = {}) {
        
        return this.log(LEVELS.NOTICE, msg, context);
    };
    this.warning = function(msg, context = {}) {
        
        return this.log(LEVELS.WARNING, msg, context);
    };
    this.error = function(msg, context = {}) {
        
        return this.log(LEVELS.ERROR, msg, context);
    };
};

module.exports = ConsoleLogHandler;