/**
 * config
 */
module.exports = {
    
    // server 
    serverIp: "127.0.0.1",
    serverPort: 8888,
    
    // redis conf
    redis: {
        ip: "127.0.0.1",
        port: 6379
    },
    // 在 datastore 和 queryQuery 中需要用到 redis；可分别配置
    // redisQueryQueue: {},
    // redisDatastore: {},
    
    // logger
    logger: {
        handler: "consoleLog",
        options: {
            level: "info"
        }
    },
    
    // action 配置
    action: {
        // 开启监听，目录内文件发生变化，将会重新加载 actions
        watch: false,
    },
    
    // protocol 配置
    protocol: {
        // 是否开启 pb3 支持
        enablePb3: false, 
        // 监听协议变更（仅 pb3 需要）
        watch: false,
    },
    
    // server context refresh time interval
    serverContextRefreshInterval: 10,
    serverDumpUserInterval: 120
};