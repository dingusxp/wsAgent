const http = require('http');

const messageData = {
    name: "system",
    words: "this is a message from system!"
};
const requestData = {
    channelName: "null98",
    type: "show",
    data: messageData
};

const content = JSON.stringify(requestData);
const options = {
    hostname: '127.0.0.1',
    port: 8888,
    path: '/message2channel',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=UTF-8'
    }
};

const req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
        console.log('BODY: ' + chunk);
    });
});
req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});
req.write(content);
req.end();
