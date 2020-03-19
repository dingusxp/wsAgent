/**
 * 为 server实例横向扩展 提供基础数据能力支持
 *  - server 实例心跳维护；
 *  - 频道对应实例记录
 */
const RedisHelper = require("./redisHelper.js");
const Config = require("./config.js");

const redisConfig = Config.getConfig("redisDatastore") || Config.getConfig("redis") || {};
const serverTickInterval = Config.getConfig("serverContextRefreshInterval") || 10;
const serverDumpUserInterval = Config.getConfig("serverDumpUserInterval") || 120;

// const KEY_SERVER_LIST = "s_list";
const KEY_SERVER_PREFIX = "s_";
const KEY_USER_PREFIX = "u_";
// const KEY_CHANNEL_LIST = "ch_list";
const KEY_CHANNEL_PREFIX = "ch_";

const Datastore = {

    /**
     * server 实例上报信息
     * @param {Object} serverId
     * @param {Object} serverStatus
     */
    setServerStatus: function(serverId, serverStatus) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const multi = client.multi();
                const redisKey = KEY_SERVER_PREFIX + serverId;
                multi.hmset(redisKey, serverStatus);
                multi.expire(redisKey, serverTickInterval * 2);
                // multi.sadd(KEY_SERVER_LIST, serverId);
                multi.exec((err, replies) => {
                    if (err) {
                        fail(err);
                        return;
                    }
                    resolve(replies[0]);
                });
            });
        });
    },
    /**
     * 获取实例运行状态
     * @param {Object} serverId
     */
    getServerStatus: function(serverId) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const redisKey = KEY_SERVER_PREFIX + serverId;
                client.hgetall(redisKey, function(err, data) {
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
     * 获取已注册过的实例列表
    getServerIds: function() {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                client.smembers(KEY_SERVER_LIST, function(err, data) {
                    if (err) {
                        fail(err);
                        return;
                    }
                    resolve(data);
                });
            });
        });
    },
     */

    /**
     * 设置用户在实例上
     * @param {Object} userId
     * @param {Object} serverId
     */
    setUserAtServer: function(userId, serverId) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const multi = client.multi();
                const redisKey = KEY_USER_PREFIX + userId;
                multi.set(redisKey, serverId);
                multi.expire(redisKey, serverDumpUserInterval * 2);
                multi.exec((err, replies) => {
                    if (err) {
                        fail(err);
                        return;
                    }
                    resolve(replies[0]);
                });
            });
        });
    },
    /**
     * 设置实例上的所有用户
     * @param {Object} serverId
     * @param {Object} userIds
     */
    batchSetServerUsers: function(serverId, userIds) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const multi = client.multi();
                userIds.forEach((userId) => {
                    const redisKey = KEY_USER_PREFIX + userId;
                    multi.set(redisKey, serverId);
                    multi.expire(redisKey, serverDumpUserInterval * 2);
                });
                multi.exec((err, replies) => {
                    if (err) {
                        fail(err);
                        return;
                    }
                    resolve(replies);
                });
            });
        });
    },
    /**
     * 获取用户所在服务实例
     * @param {Object} userId
     */
    getUserAtServer: function(userId) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const redisKey = KEY_USER_PREFIX + userId;
                client.get(redisKey, function(err, data) {
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
     * 添加实例到指定频道
     * @param {Object} channelName
     * @param {Object} serverId
     */
    addServerToChannel: function(channelName, serverId) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const redisKey = KEY_CHANNEL_PREFIX + channelName;
                client.sadd(redisKey, serverId, function(err, data) {
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
     * 从频道中移除指定实例
     * @param {Object} channelName
     * @param {Object} serverId
     */
    removeServerFromChannel: function(channelName, serverId) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const multi = client.multi();
                const redisKey = KEY_CHANNEL_PREFIX + channelName;
                multi.srem(redisKey, serverId);
                multi.smembers(redisKey);
                multi.exec((err, replies) => {
                    if (err) {
                        fail(err);
                        return;
                    }
                    // 该集合为空了，删除掉
                    if (replies[1] && replies.length === 0) {
                        // 通过自动失效使其过期
                        client.del(redisKey, function(err, data) {
                            // 此处 有错误也忽略；后果仅是 redis 可能多一个 key
                            resolve(data);
                        });
                    } else {
                        resolve(true);
                    }
                });
            });
        });
    },
    /**
     * 获取频道对应的服务器列表
     */
    getServerIdsByChannel: function(channelName) {

        return new Promise(function(resolve, fail) {
            RedisHelper.getClient(redisConfig).then(function(client) {
                
                const redisKey = KEY_CHANNEL_PREFIX + channelName;
                client.smembers(redisKey, function(err, data) {
                    if (err) {
                        fail();
                        return;
                    }
                    resolve(data);
                });
            });
        });
    }
};

module.exports = Datastore;
