# wsAgent
一个 nodejs 写的 websocket server，特点：
 - 客户端与服务端通过固定协议 query/message 交换数据；
 - 服务端提供接口，支持其他系统推送数据到指定用户/频道；
 - 可开启多实例实现横向扩展，通过redis共享实例运行及客户端连接信息给其他系统；
