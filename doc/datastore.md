# redis 存储说明
## 总览
 - s_list  set  <serverId1, serverId2, ...>
 - s_[serverId]  hash  {host, last_active, connections, ...}
 - u_[userId]  string  serverId
 - ch_list  set  <channelName1, channelName2, ...>
 - ch_[channelName]  set  <serverId, serverId2, ...>

说明：
 - server 启动时，上报 serverId 到 s_list； 
 - server 启动后，每N秒更新信息到 s_[serverId]，设置过期时间为 N*5；
 - server 启动后，每M秒更新当前的连接（clientId/userId/channelNames）信息到 redis，设置过期时间为 M*5；
 - 定时任务：每分钟，获取 s_list 的 serverId 列表，并检查对应 s_[serverId] 是否尚存在，如果已经不存在，从 s_list 及 ch_[channelName] 中移除；

## s_list set  <serverId1, serverId2, ...>
 - 用途：总览当前的所有运行实例；方便定时脚本遍历检查 server 活跃状况
 - 添加：实例启动时
 - 更新：定时脚本根据 s_list，检查对应 s_[serverId]，如果发现已经失效，则从 s_list 中删除该 serverId；
 - 删除：定时脚本删除 serverId 后如果列表为空，删除该 key（非必要，也不太可能触发）

## s_[serverId]  hash  {host, last_active, connections, ...}
 - 用途：记录运行实例的活跃状态
 - 添加：实例启动时
 - 更新：实例定时（如每分钟）添加
 - 删除：自动失效（添加/更新时设置过期时间）

## u_[userId] string serverId , 存储user对应的server
 - 用途：push下发的时候根据userid查找server使用
 - 添加：用户连接时
 - 更新：server进程定时上报该进程所有的userId
 - 删除：自动失效（添加/更新时设置过期时间）

## ch_[channelName] set  <serverId, serverId2, ...>
 - 用途：push下发的时候根据channel查找server使用
 - 添加：当前实例的用户加入新房间时（即 实例 维护了一个当前实例对应的所有房间列表： channels{ channelName -> [userId List] }）
 - 更新：1，实例维护的房间里的用户数变为 0 时，从对应key中删除当前实例 serverId；2，定时脚本检测到实例时失效时，把该实例加入的房间都清掉。
 - 删除：删除 serverId 后，集合为空，则删除 key

## ch_list  set  <channelName1, channelName2, ...>
 - 用途：下面定时检查channel的消息队列需要遍历
 - 添加：当前实例的用户加入新房间时（同上）
 - 更新：删除 channelName 时
 - 删除：删除 channelName 后集合为空时
