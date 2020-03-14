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
    
    // logger
    logger: {
        handler: "consoleLog",
        options: {
            level: "info"
        }
    },
    
    // query queue
    queryQueue: {
        // 自定义队列1
        queueName1: {
            actions: ["actionName1", "actionName2"],
            workerOption: {
                isSequential: true
            }
        },
        // 默认队列 必须！
        default: {
            workerOption: {
                isSequential: false
            }
        }
    },
    
    // server context refresh time interval
    serverContextRefreshInterval: 5,
    serverDumpUserInterval: 120
    
};