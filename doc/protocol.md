
## 通讯协议
client -> server: query
 -  id
 -  action
 -  param
 -  time
 -  context

server -> client: message
 -  id
 -  type
 -  data
 -  time
 -  context

### 使用 pb3 格式
1. 定义自己的 数据格式 于 app/protocol/loader.proto （或其它 .proto 文件，但需要确保 package=loader）
2. 运行 npm run pbjs 编译 proto 为 js 文件；
3. 配置 config.js 开启 pb3 支持