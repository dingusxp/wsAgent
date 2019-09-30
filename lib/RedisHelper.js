
let redis = require('redis');

const clients = {};
let RedisHelper = {};
RedisHelper.getClient = function(config) {
    
    const ip = config.ip || '127.0.0.1';
    const port = config.port || 6379;
    const dsn = ip + ':' + port;
    return new Promise(function(resolve, reject) {
        
        let client = null;
        if (clients[dsn]) {
            client = clients[dsn];
            if (client.isConnected) {
                return resolve(client);
            }
            client.connectedCallback.push(resolve);
            return;
        }
        client = redis.createClient(port, ip);
        clients[dsn] = client;
        client.isConnected = false;
        client.connectedCallback = [];
        client.on('connect', function () {
            
            client.isConnected = true;
            resolve(client);
            let callback = client.connectedCallback.shift();
            while (callback) {
                callback(client);
                callback = client.connectedCallback.shift();
            }
            return;
        });
    });
};

module.exports = RedisHelper;