/**
 * 请求异步化支持（队列）
 * 
 */
const RedisHelper = require("./redisHelper.js");
const Config = require("./config.js");

const redisConfig = Config.getConfig("redis") || {};
const KEY_QUERY_QUEUE_PREFIX = 'qq_';

const queryQueueConfig = Config.getConfig("queryQueue") || {};
const actionMapping = {};
Object.keys(queryQueueConfig).forEach(function(queueName) {
    if (!queryQueueConfig[queueName]["actions"]) {
        return;
    }
    queryQueueConfig[queueName]["actions"].forEach(function(actionName) {
        actionMapping[actionName] = queueName;
    });
});
const DEFAULT_QUEUE_NAME = "default";

const queryQueue = {
    
    /**
     * @param {Object} query
     */
    addQueryToQueue: function(query) {
        
        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                const actionName = query.action;
                const hashKey = actionMapping[actionName] || DEFAULT_QUEUE_NAME;
                const redisKey = KEY_QUERY_QUEUE_PREFIX + hashKey;
                client.rpush(redisKey, JSON.stringify(query), function(err, data) {
                    if (err) {
                        fail();
                        return;
                    }
                    resolve(data);
                });
            });
        });
    },
    
    /**
     * 获取一个请求人物以便处理
     */
    popQueryFromQueue: function(queueName) {
        
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
    }
};

module.exports = queryQueue;
