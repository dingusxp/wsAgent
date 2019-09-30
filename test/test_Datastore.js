
const Datastore = require("../lib/datastore.js");

const serverId = "192.168.0.168:8888";
const serverStatus = {
    serverId,
    runAt: (+ new Date),
    userIds: [1, 2, 3, 4, 5],
    channelNames: {"room1": 123, "room2": 345}
};

Datastore.setServerStatus(serverId, serverStatus).then(function() {
    
    console.log("set server status succeed!");
    
    Datastore.getServerStatus(serverId).then(function(data) {
        console.log("get server info succeed");
        console.log(data);
    }, function(err) {
        console.log("get server info failed..." + err);
    });
    
    Datastore.getServerIds().then(function(data) {
        console.log("get serverids succeed");
        console.log(data);
    }, function(err) {
        console.log("get serverids failed..." + err);
    });
}, function(err) {
    console.log("set server status failed..." + err);
});

setInterval(function() {
    
    Datastore.getServerStatus(serverId).then(function(data) {
        console.log("get server info succeed");
        console.log(data);
    }, function(err) {
        console.log("get server info failed..." + err);
    });
}, 5000);