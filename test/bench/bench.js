const Client = require("../../client-demo/client.js");
const Config = {
    wsServer: '127.0.0.1',
    wsPortBase: 8888,
    // server 固定，且 端口为连续时测试用（不建议）
    // 多 server 时，推荐使用 nginx 负载均衡方式 部署
    serverCount: 1,
    // 房间数
    totalRoom: 200,
    // 每个client发言频率 及 发言动作关闭时间 （单位：s）
    // 可以设为 0，表示都不发言
    clientSpeakInterval: 60,
    speakLastTime: 600,
    // 批量开 测试用例 时设置
    benchId: 0,
    // （一个测试实例）开启多少个连接
    benchBatch: 10000
};

// merge config
const commandLine = process.argv.splice(2);
const re = /--(wsServer|wsPortBase|serverCount|totalRoom|clientSpeakInterval|speakLastTime|benchId|benchBatch)=([\w\.\:\/]+)/;
commandLine.forEach(function(arg) {
    const check = re.exec(arg);
    if (!check) {
        return;
    }
    const field = check[1];
    const value = check[2];
    switch (field) {
        case "wsServer":
          Config[field] = "" + value;
          break;
        case "wsPortBase":
        case "serverCount":
        case "totalRoom":
        case "clientSpeakInterval":
        case "speakLastTime":
        case "benchId":
        case "benchBatch":
          Config[field] = parseInt(value);
          break;
    }
});
// console.log(Config);

const reportInfo = {
    connectedCount: 0,
    disconnectedCount: 0,
    reconnectCount: 0,
    authCount: 0,
    joinRoomCount: 0,
    sendSpeakCount: 0,
    totalQueryCount: 0,
    totalMessageCount: 0
};
const newClient = function(benchId) {

    const start = (+new Date);
    const userId = benchId + 100000000;
    const port = Config.wsPortBase + (userId % Config.serverCount);
    const agent = new Client.Agent(Config.wsServer + ":" + port);
    const room = "room_" + (userId % Config.totalRoom);
    const user = {
        userId: userId,
        name: "random #" + userId
    };
    agent.enablePb3("../../client-demo/protocol.js", ["ChatWords"]);
    const doLogin = function() {
        reportInfo.totalQueryCount++;
        agent.auth(user, function() {
            reportInfo.authCount++;
            reportInfo.totalQueryCount++;
            agent.subscribeChannel(room, function() {
                reportInfo.joinRoomCount++;
                // console.log(user.name + " has logined");
            });
        });
    };
    agent.onConnected(() => {
        reportInfo.connectedCount++;
        doLogin();
    });
    agent.onReconnect(() => {
        reportInfo.reconnectCount++;
    });
    agent.onDisconnect(() => {
        reportInfo.disconnectedCount++;
    });

    agent.setMessageHandler("show", function(data) {
        // console.log("show", [room, userId, {...data}]);
        reportInfo.totalMessageCount++;
    });
    
    // 定时自动发消息
    if (Config.clientSpeakInterval <= 0) {
        return;
    }
    const autoSend = function() {
        const now = (+new Date);
        if (now - start >= Config.speakLastTime * 1000) {
            return;
        }
        const param = {
            room: room,
            name: user.name,
            words: "report time: " + now
        };
        reportInfo.totalQueryCount++;
        agent.query("speak", param);
        // test pb3
        // agent.query("speak", Client.Protocol.obj2pb3Data('ChatWords', param));
        reportInfo.sendSpeakCount++;
        setTimeout(autoSend, Config.clientSpeakInterval*1000);
    };
    // 稍微延迟，并将发言时间打散
    const timeout = 1000 * (1 + parseInt(Math.random() * 100000000) % Config.clientSpeakInterval);
    setTimeout(autoSend, timeout);
};

let clientIdx = 0;
const createClient = function() {
    const clientId = Config.benchId + clientIdx;
    newClient(clientId);
    clientIdx++;
    if (clientIdx < Config.benchBatch) {
        setTimeout(createClient, 10);
    }
};
createClient();

setInterval(() => {
    console.log("report", reportInfo);
}, 5000);
