const Client = require("./client.js");
const Config = {
    wsServer: '127.0.0.1',
    wsPortBase: 8888,
    serverCount: 1,
    totalRoom: 10,
    clientSpeakInterval: 10,
    benchId: 0,
    benchBatch: 1000
};

// merge config
const commandLine = process.argv.splice(2);
const re = /--(wsServer|wsPortBase|serverCount|totalRoom|clientSpeakInterval|benchId|benchBatch)=([\w\.\:\/]+)/;
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
        case "benchId":
        case "benchBatch":
          Config[field] = parseInt(value);
          break;
    }
});
console.log(Config);

const newClient = function(benchId) {
    const start = (+new Date);
    const userId = benchId + 1000000;
    const port = Config.wsPortBase + (userId % Config.serverCount);
    const agent = new Client.Agent(Config.wsServer + ":" + port);
    let room = "room";
    const flag = userId % Config.totalRoom;
    room = room + '_' + flag;
    const user = {
        userId: userId,
        name: "random #" + userId
    };
    const doLogin = function() {
        agent.auth(user, function() {
            agent.subscribeChannel(room, function() {
                // console.log(user.name + " has logined");
            });
        });
    };
    agent.onConnected(doLogin);

    agent.setMessageHandler("show", function(data) {
        // console.log(data);
    });
    const autoSend = function() {
        const now = (+new Date);
        if (now - start >= 600000) {
            return;
        }
        const param = {
            channelName: room,
            name: user.name,
            words: "hello " + now
        };
        agent.query("speak", param);
        setTimeout(autoSend, Config.clientSpeakInterval*1000);
    };
    // 稍微延迟
    const timeout = (100 + parseInt(Math.random() * 1000000000) % 10000);
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