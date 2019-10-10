## 1, server conn info:
 - s_list  set  <serverId1, serverId2, ...>
 - s_[serverId]  string/hash  JSON: {host, last_active, connections, ...}
 - u_[userId]  string  serverId
 - ch_list  set  <channelName1, channelName2, ...>
 - ch_[channelName]  set  <serverId, serverId2, ...>

说明：
 - server 启动时，上报 serverId 到 i_list； 
 - server 启动后，每N秒更新信息到 i_[serverId]，设置过期时间为 N*5；
 - server 启动后，每M秒更新当前的连接（clientId/userId/channelNames）信息到 redis，设置过期时间为 M*5；
 - 定时任务：每分钟，获取 i_list 的 serverId 列表，并检查对应 i_[serverId] 是否尚存在，如果已经不存在，从 i_list 及 ch_[channelName] 中移除；
 - i_list 为并非必要 key，仅仅是方便查看当前活跃的 server 数目；

### s_list：存储所有server的set
 - 用途：总览当前的所有运行实例；方便定时脚本遍历检查 server 活跃状况
 - 添加：实例启动时
 - 更新：定时脚本根据 s_list，检查对应 s_[serverId]，如果发现已经失效，则从 s_list 中删除该 serverId；
 - 删除：定时脚本删除 serverId 后如果列表为空，删除该 key（非必要，也不太可能触发）

### s_[serverId]  string/hash  JSON: {host, last_active, connections, ...}
 - 用途：记录运行实例的活跃状态
 - 添加：实例启动时
 - 更新：实例定时（如每分钟）添加
 - 删除：自动失效（添加/更新时设置过期时间）

### u_[userId] string serverId , 存储user对应的server
 - 用途：push下发的时候根据userid查找server使用
 - 添加：用户连接时
 - 更新：server进程定时上报该进程所有的userId
 - 删除：自动失效（添加/更新时设置过期时间）

### ch_[channelName] set  <serverId, serverId2, ...>
 - 用途：push下发的时候根据channel查找server使用
 - 添加：当前实例的用户加入新房间时（即 实例 维护了一个当前实例对应的所有房间列表： channels{ channelName -> [userId List] }）
 - 更新：1，实例维护的房间里的用户数变为 0 时，从对应key中删除当前实例 serverId；2，定时脚本检测到实例时效时，把该实例加入的房间都清掉。
 - 删除：删除 serverId 后，集合为空，则删除 key

### ch_list  set  <channelName1, channelName2, ...>
 - 用途：下面定时检查channel的消息队列需要遍历
 - 添加：当前实例的用户加入新房间时（同上）
 - 更新：删除 channelName 时
 - 删除：删除 channelName 后集合为空时


## 2，message queue
 - mq_c_[clientId]  list  <message1, message2, ...>
 - mq_ch_[channelName]  zset  <[message1, queueId1], [message2, queueId2], ...>
 - qq_[N]  list  <{query1, context1, queryAt1}, {query2, context2, queryAt2}, ...>

说明：
 - 后端服务推送：1，信息推送到 redis 中；2，调用接口通知对应 server 对应 key 有数据更新；
 - server 维护一个 待推送任务表结构，以一定策略轮询执行推送任务；
 - mq_c_[clientId]，当信息取出推送给用户后即出栈；
 - mq_ch_[channelName] 取当前该channel最后一条已获取message对应的时间戳之后的信息，批量推送给用户，并缓存最后一条 message；（待考虑：极端情况，一个时间戳对应多条信息的判重策略？）
 - 定时任务：每5分钟 遍历 ch_list 内的所有 channelName，检查对应 mq_ch_[channelName] 里的信息：1，如果最后一条信息已经是 30分钟前的，清除该key；2，如果该集合元素超过 1000 条，只保留最近的 1000条；
 - qq_s[N] 为对时效性要求不高的客户端请求，也可选择推送到标准 MQ 服务而非 redis；

### mq_c_[clientId]  list  <message1, message2, ...>
 - 用途：单播的情况
 - 添加：后台push过来的时候添加入栈，并发送通知给server，
 - 更新：实例收到消息，主动过来取集合的消息（出栈）推送给用户
 - 删除：每次集合里的信息取完就设置一个过期时间（如 1分钟），让其自动过期

### mq_ch_[channelName]  zset  <[message1, queueId1], [message2, queueId2], ...>
 - 用途：用于频道消费消息的情况
 - 添加：后台push的时候入栈，并发送通知给sever，server中的每个连接需要记录当前正在消费的queueId，和最新的queueId，如果当前有最新id小于当前的值，则需要继续消费。
 - 更新：定时检查消息队列（需要依赖当前连接的所有的channel），集合超过一定量（如 1w条）则删除多余的（按 queueId 倒序）；
 - 删除：每个实例在获取信息之后，都给集合设置一个较长的过期时间（如 1小时）
