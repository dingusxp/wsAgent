const Client = require("./client.js");
const wsServer = 'ws://127.0.0.1:';
const wsPortBase = 8888;
const serverCount = 1;

const args = process.argv.splice(2);
let id = parseInt(args[0] || 0);
const batch = parseInt(args[1] || 1000);

const newClient = function(i) {
    const start = (+new Date);
    const id = i + 1000000;
    const port = wsPortBase + (id % serverCount);
    const agent = new Client.Agent(wsServer + port);
    let room = "null98";
    const flag = id % 10;
    if (flag) {
        room = room + '_' + flag;
    }
    const user = {
        userId: id,
        name: "random #" + id
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
        if (now - start >= 300000) {
            return;
        }
        const param = {
            channelName: room,
            name: user.name,
            words: "hello " + now
        };
        agent.query("speak", param);
        const timeout = (2000 + parseInt(Math.random() * 1000000000) % 8000);
        setTimeout(autoSend, timeout);
    };
    // register && subscribe
    agent.auth(user, function() {
        agent.subscribeChannel(room, function() {
            // console.log(user.name + " is ready");
            autoSend();
        });
    });
};

for (let i = 1; i <= batch; i++) {
    setTimeout(function() {
        id++;
        newClient(id);
    }, i * 10);
}
