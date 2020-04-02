/**
 * 请求异步化支持（队列），redis 实现
 */
const RedisHelper = require("./redisHelper.js");
const Config = require("./config.js");

const redisConfig = Config.getConfig("redisQueryQueue") || Config.getConfig("redis") || {};
const KEY_QUERY_QUEUE_PREFIX = 'qq_';
const KEY_ID_PREFIX_PREFIX = 'idp_';
const idPrefixTickInterval = 3600;

/**
 * 获取全局唯一 QueueId
 * 固定24位字符串，组成：
 * 前缀     8位，每个进程唯一
 * 时间戳   13位，到毫秒
 * 自增     3位，毫秒内自增
 */
let idPrefix = "";
let idTimestamp = 0;
let idIncrment = 0;
const getIdPrefix = function() {
    
    return new Promise(function(resolve, fail) {
        
        let maxTry = 10;
        applyIdPrefix = function() {
            // 已经申请到了；直接返回
            if (idPrefix) {
                resolve(idPrefix);
                return;
            }
            // 超过最大尝试次数，失败
            if (maxTry <= 0) {
                fail();
                return;
            }
            // 随机生成一个，去redis检查一下
            const tryIdPrefix = ('0'.repeat(8) + parseInt(Math.pow(2, 40) * Math.random()).toString(32)).slice(-8);
            RedisHelper.getClient(redisConfig).then(function(client) {
                const redisKey = KEY_ID_PREFIX_PREFIX + tryIdPrefix;
                client.incr(redisKey, function(err, value) {
                    if (err) {
                        fail();
                        return;
                    }
                    if (value > 1) {
                        // 已经被占用，另找一个吧
                        maxTry--;
                        applyIdPrefix();
                        return;
                    }
                    // 占用，设置过期时间，并定时刷新
                    const lockIdPrefix = function() {
                        client.expire(redisKey, idPrefixTickInterval * 2);
                        setTimeout(lockIdPrefix, idPrefixTickInterval);
                    };
                    lockIdPrefix();
                    idPrefix = tryIdPrefix;
                    resolve(idPrefix);
                });
            }, function() {
                maxTry--;
                applyIdPrefix();
            });
        };
        applyIdPrefix();
    });
}
const getQueueId = function() {
    
    return new Promise(function(resolve, fail) {
        RedisHelper.getClient(redisConfig).then(function(client) {
            getIdPrefix().then((idPrefix) => {
                const ts = (+new Date);
                if (ts === idTimestamp) {
                    idIncrment++;
                } else {
                    idTimestamp = ts;
                    idIncrment = 0;
                }
                const id = idPrefix 
                    + (Math.pow(10, 13) + idTimestamp).toString().substr(1)
                    + (Math.pow(10, 3) + idIncrment).toString().substr(1);
                resolve(id);
            }, () => {
                fail();
            });
        });
    });
};

/**
 * 添加一个请求到队列
 * @param {Object} query
 */
const addQueryToQueue = function(queueName, query) {
        
    return new Promise(function(resolve, fail) {
        RedisHelper.getClient(redisConfig).then(function(client) {
            getQueueId().then((id) => {
                const redisKey = KEY_QUERY_QUEUE_PREFIX + queueName;
                const value = JSON.stringify({id, query});
                client.rpush(redisKey, value, function(err, data) {
                    if (err) {
                        fail();
                        return;
                    }
                    resolve(data);
                });
            }, () => {
                fail();
            });
        }, () => {
            fail();
        });
    });
};

/**
 * 从队列取出一个请求任务以便处理
 * @return object
 *  + id  // 自动生成的任务id
 *  + query  // 扔进队列的原始内容
 */
const popQueryFromQueue = function(queueName) {
        
    return new Promise(function(resolve, fail) {
        RedisHelper.getClient(redisConfig).then(function(client) {
            const redisKey = KEY_QUERY_QUEUE_PREFIX + queueName;
            client.lpop(redisKey, function(err, value) {
                if (err) {
                    fail("lpop failed: " + err);
                    return;
                }
                if (!value) {
                    fail("bad value: empty");
                    return;
                }
                const info = JSON.parse(value);
                if (info && typeof info === "object" && info.id && info.query) {
                    resolve(info);
                } else {
                    fail("bad value: invalid format");
                }
            });
        }, function(err) {
            fail("get client failed: " + err);
        });
    });
};

module.exports = {
    addQueryToQueue,
    popQueryFromQueue
};
