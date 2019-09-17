
let messageId = 0;

const Message = {
    
    /**
     * @param {Object} type
     * @param {Object} data
     * @param {Object} context
     */
    create: function(type, data, context = {}) {
        
        messageId++;
        return {
            id: messageId,
            type,
            data,
            context,
            time: (+new Date)
        };
    }
};

module.exports = Message;

/**

Redis design

1, server conn info:
  i_list  set  <serverId1, serverId2, ...>
  i_[serverId]  string/hash  JSON: {host, last_active, connections, ...}
  u_[userId]  string  serverId
  ch_list  set  <channelName1, channelName2, ...>
  ch_[channelName]  set  <serverId, serverId2, ...>

说明：
  server 启动时，上报 serverId 到 i_list； 
  server 启动后，每N秒更新信息到 i_[serverId]，设置过期时间为 N*5；
  server 启动后，每M秒更新当前的连接（clientId/userId/channelNames）信息到 redis，设置过期时间为 M*5；
  定时任务：每分钟，获取 i_list 的 serverId 列表，并检查对应 i_[serverId] 是否尚存在，如果已经不存在，从 i_list 及 ch_[channelName] 中移除；
  i_list 为并非必要 key，仅仅是方便查看当前活跃的 server 数目；
  
2，message queue
  mq_c_[clientId]  list  <message1, message2, ...>
  mq_u_[userId]  list  <message1, message2, ...>
  mq_ch_[channelName]  zset  <[message1, timestamp1], [message2, timestamp2], ...>
  qq_p[N]  list  <[query1, serverId1], [query2, serverId1], ...>

说明：
  后端服务推送：1，信息推送到 redis 中；2，调用接口通知对应 server 对应 key 有数据更新；
  server 维护一个 待推送任务表结构，以一定策略轮询执行推送任务；
  mq_c_[clientId] / mq_u[userId]，当信息取出推送给用户后即出栈；
  mq_ch_[channelName] 取当前该channel最后一条已获取message对应的时间戳之后的信息，批量推送给用户，并缓存最后一条 message；（待考虑：极端情况，一个时间戳对应多条信息的判重策略？）
  定时任务：每5分钟 遍历 ch_list 内的所有 channelName，检查对应 mq_ch_[channelName] 里的信息：1，如果最后一条信息已经是 30分钟前的，清除该key；2，如果该集合元素超过 1000 条，只保留最近的 1000条；
  qq_p[N] 为对时效性要求不高的客户端请求，也可选择推送到标准 MQ 服务而非 redis；

 */