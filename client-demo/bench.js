
const Client = require("./client.js");
const wsServer = 'ws://129.204.30.59:80';

const newClient = function(i) {
    const start = (+ new Date);
    const id = i + 10000;
    const agent = new Client.Agent(wsServer);
    let room = "null98";
    const flag =  id % 10;
    if (flag) {
        room = room + '_' + flag;
    }
    const user = {
        userId: id,
        name: "random #" + id
    };

    agent.setMessageHandler("show", function(data) {
        // console.log(data);
    });
    agent.setMessageHandler("login", function() {
        agent.auth(user, function() {
            agent.subscribeChannel(room, function() {
                // console.log(user.name + " is ready, again");
            });
        });
    });
    const autoSend = function() {
        const now = (+ new Date);
        if (now - start >= 300000) {
            return;
        }
        const param = {
            channelName: room,
            name: user.name,
            words: "hello " + now 
        };
        agent.query("speak", param);
        const timeout = (10000 + parseInt(Math.random() * 1000000000) % 30000);
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

let idx = 0;
for (let i = 1; i <= 1000; i++) {
    setTimeout(function() {
        idx++;
        newClient(idx);
    }, i * 100);
}
