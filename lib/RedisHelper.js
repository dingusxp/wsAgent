
let redis = require('redis');

const clients = {};
let RedisHelper = {
};
RedisHelper.getClient = function(conf) {
    
    const server = conf.server || '127.0.0.1';
    const port = conf.port || 6379;
    const dsn = server + ':' + port;
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
        client = redis.createClient(port, server);
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