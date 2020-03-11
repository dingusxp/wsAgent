
const app = require('express')();
const http = require('http').Server(app);
const fs = require('fs');

const cp = require('child_process');

// 请求转发与接收
const querySet = {};
let queryId = 0;
let child = null;
let loadChildFork = () => {
    child = cp.fork('./_child.js');
    child.on('message', (msg) => {
        const queryId = msg.queryId;
        if (querySet[queryId]) {
            const res = querySet[queryId]["res"];
            const action = querySet[queryId]["action"];
            const start = querySet[queryId]["start"];
            delete querySet[queryId];
            res.send(msg.content);
            
            const end = (+new Date);
            costStats[action] = costStats[action] || {"total": 0, "cnt": 0};
            costStats[action]["total"] += (end - start);
            costStats[action]["cnt"]++;
            costStats[action]["avg"] = costStats[action]["total"] / costStats[action]["cnt"];
        }
    });
};
loadChildFork();

const checkQueryTimeout = (queryId) => {
    setTimeout(function() {
        if (!querySet[queryId]) {
            return;
        }
        const res = querySet[queryId]["res"];
        const action = querySet[queryId]["action"];
        const start = querySet[queryId]["start"];
        delete querySet[queryId];
        res.send("timeout...");
        
        const end = (+new Date);
        costStats[action] = costStats[action] || {"total": 0, "cnt": 0};
        costStats[action]["total"] += (end - start);
        costStats[action]["cnt"]++;
        costStats[action]["avg"] = costStats[action]["total"] / costStats[action]["cnt"];
    }, 3000);
};

// http api
const costStats = {};
app.get('/', function(req, res) {
    
    let costShow = '';
    for (let id in costStats) {
        costShow += `${id} : total cnt: ${costStats[id]["cnt"]}, avg cost: ${costStats[id]["avg"]} <br />`;
    }
    // costShow = JSON.stringify(costStats);
    const html = `
<html>
<head>
  <title>test</title>
</head>
<body>
  <h4>test links</h4>
  <p>
    <a href="/test1">直接输出</a> <br />
    <a href="/test2">对象传递</a> <br />
    <a href="/test3">异步超时</a> <br />
    <a href="/test4">异步崩溃</a> <br />
    <a href="/test5">动态加载</a> <br />
  </p>
  <p>
  ${costShow}
  </p>
</body>
</html>
    `;
    res.send(html);
});
app.get('/test1', function(req, res) {
    
    const start = (+new Date);
    res.send("this is a test");
    const end = (+new Date);
    costStats["test1"] = costStats["test1"] || {"total": 0, "cnt": 0};
    costStats["test1"]["total"] += (end - start);
    costStats["test1"]["cnt"]++;
    costStats["test1"]["avg"] = costStats["test1"]["total"] / costStats["test1"]["cnt"];
});
app.get('/test2', function(req, res) {
    
    queryId++;
    querySet[queryId] = {
        queryAt: (+new Date),
        action: "test2",
        start: (+ new Date),
        res: res
    };
    const query = {
        queryId,
        status: 2,
        param: req.query || {}
    };
    
    try {
        child.send(query);
    } catch (e) {
        console.log("Exception: " + e);
        // reload
        loadChildFork();
    }
    checkQueryTimeout(queryId);
});
app.get('/test3', function(req, res) {
    
    queryId++;
    querySet[queryId] = {
        queryAt: (+new Date),
        action: "test3",
        start: (+ new Date),
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
    
    queryId++;
    querySet[queryId] = {
        queryAt: (+new Date),
        action: "test4",
        start: (+ new Date),
        res: res
    };
    const query = {
        status: 4
    };
    // let child = cp.fork('./_child.js');
    child.send(query);
    checkQueryTimeout(queryId);
});
app.get('/test5', function(req, res) {
    
    const start = (+new Date);
    const query = {
        status: 5
    };
    const path = './_child.js';
    if (fs.existsSync(path)) {
        const c = cp.fork('./_child.js');
        c.on('message', (msg) => {
            res.send(msg);
            const action = "test5";
            const end = (+new Date);
            costStats[action] = costStats[action] || {"total": 0, "cnt": 0};
            costStats[action]["total"] += (end - start);
            costStats[action]["cnt"]++;
            costStats[action]["avg"] = costStats[action]["total"] / costStats[action]["cnt"];
        });
        c.send(query);
    }
});

// listen
http.listen(8080, function() {
    console.log(`server is ready: http://127.0.0.1:8080/`);
});