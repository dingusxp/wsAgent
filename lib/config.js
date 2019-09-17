
const config = require("../_config.js");

/**
 * 获取配置项
 * @param {Object} key
 */
const getConfig = function(key) {
    
    return config[key];
};

module.exports = {
    getConfig
};