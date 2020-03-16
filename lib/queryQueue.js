/**
 * 请求异步化支持（队列），redis 实现
 */
const RedisHelper = require("./redisHelper.js");
const Config = require("./config.js");

const redisConfig = Config.getConfig("redisQueryQueue") || Config.getConfig("redis") || {};
const KEY_QUERY_QUEUE_PREFIX = 'qq_';

/**
 * @param {Object} query
 */
const addQueryToQueue = function(queueName, query) {
        
    return new Promise(function(resolve, fail) {
        RedisHelper.getClient(redisConfig).then(function(client) {
            const redisKey = KEY_QUERY_QUEUE_PREFIX + queueName;
            client.rpush(redisKey, JSON.stringify(query), function(err, data) {
                if (err) {
                    fail();
                    return;
                }
                resolve(data);
            });
        });
    });
};

/**
 * 获取一个请求人物以便处理
 */
const popQueryFromQueue = function(queueName) {
        
    return new Promise(function(resolve, fail) {
        RedisHelper.getClient(redisConfig).then(function(client) {
            const redisKey = KEY_QUERY_QUEUE_PREFIX + queueName;
            client.lpop(redisKey, function(err, data) {
                if (err) {
                    fail("lpop failed: " + err);
                    return;
                }
                resolve(data);
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
