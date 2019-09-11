
const config = {
    // server host
    // serverHost: "i1.domain.com",
    
    // server context refresh time interval
    serverContextRefreshInterval: 10
};

/**
 * 获取配置项
 * [TODO] 支持 层级 key； 支持 从配置文件读取（区分环境）
 * @param {Object} key
 */
const getConfig = function(key) {
    
    return config[key];
};

module.exports = {
    getConfig
};