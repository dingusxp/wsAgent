
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const serverContext = {
    serverHost: "127.0.0.1:8888",
    clientCount: 0,
};
io.on('connection', function(socket) {

    const clientId = socket.id;

});

// listen
http.listen(8888, function() {
    log.info(`agent server is ready: ws://${serverContext.serverHost}}/`);
});