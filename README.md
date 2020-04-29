# wsAgent
## 介绍
 > 一个 nodejs 写的 websocket 用户服务中间层，维护与端用户的长连接，方便系统处理用户请求或主动推送消息给用户。

### 依赖
 - npm package: 见 package.json
 - redis server
 - nginx （如果开启集群模式，建议搭配使用）

### 功能：
 - 客户端：与服务端建立长连接，注册用户ID，订阅/取消订阅频道，发送请求，接收推送；
 - 服务端：与客户端建立长连接，维护用户连接态，维护频道，处理请求，接收（其它系统）推送请求转发消息至用户；
 - 服务端扩展 action：服务端支持（动态）加载 action 下的脚本，扩展对用户请求的处理能力；
 - 服务端扩展 consumer：服务端提供一种简易队列消费方式，支持扩展脚本，异步处理加入队列的请求；

![输入图片说明](https://images.gitee.com/uploads/images/2020/0429/162931_999ea976_8578.png "wsAgent 功能图.png")

### 特点：
 - 支持 json、pb3 格式协议；
 - 支持扩展实例的方式实现服务能力横向扩展；
 - action 处理 和 pb3协议定义 支持自动检测变更并重新加载；
 - 支持三种维度（clientId/userId/channelId）主动向用户端推送消息；
 - 支持 服务状态监控、访问控制、日志配置 等服务治理辅助手段；

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

cp app/config.sample.js app/config.js
# 查看 config.js 并根据注释修改必要项

# 启动单实例
npm run start

# 启动多实例
# sh cluster.sh
```
说明：windows（不建议用于生产环境）可使用 git bash 执行上述命令。

### 客户端：
#### 原生引用
```html
<script src="https://cdn.bootcss.com/socket.io/2.0.4/socket.io.js"></script>
<script src="./protobuf.min.js"></script><!-- // 如果需要 pb3格式协议支持 // -->
<script src="./client.js"></script>
```

详细参见 client-demo/index.html ，

#### vue 引用
```javascript
// 请先用 npm 安装 socket.io-client  和 protobufjs
// 然后引用即可
import {Agent, Protocol} from '/lib/client.js';
```

使用上参考 client-demo/index.html，修改一些回调函数内的写法，将直接操作 dom 改为 MVVM 模式即可。

#### node cli 引用
```javascript
// 请先用 npm 安装 socket.io-client  和 protobufjs
const Client = require("/lib/client.js");
const Agent = Client.Agent;
const Protocol = Client.Protocol;
```

使用同上，参考即可。

