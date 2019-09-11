
let app = require('express')();
let http = require('http').Server(app);
let fs = require('fs');

// http static server
// simple chatroom, just for fun
let resourceCache = {};
const allowStaticResources = [
    '/index.html',
    '/client.js'
];
allowStaticResources.forEach(function(path) {
    resourceCache[path] = fs.readFileSync(__dirname + path, 'utf8').toString();
    
    // register
    (function() {
        let reqPath = path;
        app.get(reqPath, function(req, res) {
            res.send(resourceCache[reqPath]);
        });
    })();
});

http.listen(8080, function() {
    console.log('chatroom is ready. please visit: http://127.0.0.1:8080/index.html');
});