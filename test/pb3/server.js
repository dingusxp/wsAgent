
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const protobuf = require("protobufjs");

const protocol = {
    Query: null,
    Message: null
};
protobuf.load("./protocol/protocol.js", function(err, root) {
    if (err) {
        console.log("load protocol failed! " + err);
        return;
    }
    protocol.Query = root.lookupType("protocol.Query");
    protocol.Message = root.lookupType("protocol.Message");
    console.log("protocol loaded");
});

const serverContext = {
    serverIp: "127.0.0.1",
    serverPort: 8080,
    clientCount: 0,
};

let messageId = 0;
const broadcastMessage = function(data) {
    const message = {
        id: messageId++,
        type: "show",
        data: JSON.stringify(data),
        time: (+new Date),
        context: ""
    };
    // console.log("send message: ", JSON.stringify(message));
    const buffer = protocol.Message.encode(protocol.Message.create(message)).finish();
    io.emit("message", buffer);
};

io.on('connection', function(socket) {

    socket.on("query", function(data) {
        // console.log("receive data:", data);
        // compat
        if (data.constructor !== Buffer) {
            data = Object.keys(data).map(function(k) {
                return data[k];
            });
        }
        const query = protocol.Query.decode(data);
        // console.log("decoded query", query);

        broadcastMessage(JSON.parse(query.param));
    });
});

// http static server
// simple chatroom, just for fun
let resourceCache = {};
const allowStaticResources = [
    '/test.html',
    '/protobuf.min.js',
    '/protocol/protocol.js'
];
allowStaticResources.forEach(function(path) {
    (function() {
        let reqPath = path;
        app.get(reqPath, function(req, res) {
            res.send(fs.readFileSync(__dirname + path, 'utf8').toString());
        });
    })();
});

// listen
http.listen(serverContext.serverPort, function() {
    console.log(`test server is ready: http://${serverContext.serverIp}:${serverContext.serverPort}/test.html`);
});