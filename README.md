# wsAgent
## 介绍
 > 一个 nodejs 写的 websocket 用户服务中间层，维护与端用户的长连接，以方便系统处理用户请求或主动推送消息给用户。

### 依赖
 - npm package: 见 package.json
 - redis server
 - nginx （如果开启集群模式）

### 功能：
 - 客户端：与服务端建立长连接，注册用户ID，订阅频道，发送请求，接收推送；
 - 服务端：接收客户端连接，维护用户连接态，维护频道，按配置转发请求，接收（系统）推送请求发送消息至用户；
 - 服务端扩展 action：服务端支持动态加载 action 下的脚本，并处理分发过来的实时请求；
 - 服务端扩展 consumer：服务端提供一种简易队列消费方式，支持扩展脚本，异步处理加入队列的请求；

### 特点：
 - 支持同步方式（action）和异步方式（队列）处理请求；
 - action 机制支持热更新和失败自动重启；
 - 支持三种维度（clientId/userId/channelId）向用户端推送信息；
 - 支持服务状态查看，动态服务限流、预警；
 - 支持服务能力横向扩展（配合 redis 与 nginx）；
 - 支持 json、PB3 格式协议；

### 性能：


## 开始使用
### 服务端
安装 git；

安装 nodejs；

安装 redis 服务并启动；

下载代码并启动服务：
```sh
git clone https://github.com/dingusxp/wsAgent.git
cd wsAgent
npm install

cp _config.sample.js _config.js
# 查看 _config.js 并根据注释修改必要项

# 启动单实例
node ./server.js > /tmp/server.log & 

# 启动多实例
sh cluster.sh
```
说明：windows（不建议用于生产环境）可使用 git bash 执行上述命令。

### 客户端：
原生引用：



vue 引用：

