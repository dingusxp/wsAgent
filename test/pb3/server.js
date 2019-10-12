
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require("fs");
const protobuf = require("protobufjs");

// load pb3
const pb3 = {
    protocol: {
        Query2: null,
        Message2: null
    },
    loader: {
        ChatWords: null
    }
};
protobuf.load("./protocol/protocol.js", function(err, root) {
    if (err) {
        console.log("load protocol failed! " + err);
        return;
    }
    for (let ns in pb3) {
        for (let name in pb3[ns]) {
            pb3[ns][name] = root.lookupType(`${ns}.${name}`);
        }
    }
    // console.log("pb3 loaded");
});

const serverContext = {
    serverIp: "127.0.0.1",
    serverPort: 8080,
    clientCount: 0,
};

let messageId = 0;
const actionSpeak = function(data) {
    const buffer = pb3.loader.ChatWords.encode(pb3.loader.ChatWords.create(data)).finish();
    const message = {
        id: messageId++,
        type: "show",
        // data: {
        //     type: "PB",
        //     loader: "ChatWords",
        //     string: "",
        //     buffer: buffer
        // },
        data: {
            type: "JSON",
            loader: "",
            string: JSON.stringify(data),
            buffer: null
        },
        time: (+new Date),
        context: ""
    };
    io.emit("message", pb3.protocol.Message2.encode(pb3.protocol.Message2.create(message)).finish());
};

io.on('connection', function(socket) {

    socket.on("query", function(data) {
        // console.log("receive data:", data);
        console.log("receive data length: ", data.byteLength);
        /*
        // compat
        if (data.constructor !== Buffer) {
            data = Object.keys(data).map(function(k) {
                return data[k];
            });
        }
        */
        const query = pb3.protocol.Query2.decode(data);
        // console.log("decoded query", query);
        
        // decode param
        let queryData = null;
        if (query.param.type === "PB") {
            // console.log("data.buffer", query.param.buffer);
            queryData = pb3.loader[query.param.loader].decode(query.param.buffer);
        } else if (query.param.type === "JSON") {
            queryData = JSON.parse(query.param.string);
        } else {
            queryData = query.param.string;
        }
        // console.log("decoded data", queryData);

        // 分发
        if (query.action === "speak") {
            actionSpeak(queryData);
        }
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