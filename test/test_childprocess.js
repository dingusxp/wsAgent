
let cp = require('child_process');

const app = require('express')();
const http = require('http').Server(app);

let child = cp.fork('./_child.js');

// 请求转发与接收
const querySet = {};
let queryId = 0;
child.on('message', function(msg) {
    const queryId = msg.queryId;
    if (querySet[queryId]) {
        const res = querySet[queryId]["res"];
        delete querySet[queryId];
        res.send(msg.content);
    }
});
const checkQueryTimeout = function(queryId) {
    setTimeout(function() {
        if (!querySet[queryId]) {
            return;
        }
        const res = querySet[queryId]["res"];
        delete querySet[queryId];
        res.send("timeout...");
    }, 5000);
};

// http api
app.get('/', function(req, res) {
    
    const html = `
<html>
<head>
  <title>test</title>
</head>
<body>
  <h4>test links</h4>
  <p>
    <a href="/test1">定时延迟</a> <br />
    <a href="/test2">对象传递</a> <br />
    <a href="/test3">异步超时</a> <br />
    <a href="/test4">异步直出</a> <br />
  </p>
</body>
</html>
    `;
    res.send(html);
});
app.get('/test1', function(req, res) {
    
    setTimeout(function() {
        res.send("this is a test");
    }, 2000);
});
app.get('/test2', function(req, res) {
    
    queryId++;
    querySet[queryId] = {
        queryAt: (+new Date),
        res: res
    };
    const query = {
        queryId,
        status: 2,
        param: req.query || {}
    };
    child.send(query);
    checkQueryTimeout(queryId);
});
app.get('/test3', function(req, res) {
    
    queryId++;
    querySet[queryId] = {
        queryAt: (+new Date),
        res: res
    };
    const query = {
        queryId,
        param: req.query || {},
        status: 3
    };
    child.send(query);
    checkQueryTimeout(queryId);
});
app.get('/test4', function(req, res) {
    
    const query = {
        status: 4,
        res: res
    };
    child.send(query);
});

// listen
http.listen(8080, function() {
    console.log(`server is ready: http://127.0.0.1:8080/`);
});