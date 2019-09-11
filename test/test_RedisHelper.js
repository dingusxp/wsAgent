let RedisHelper = require('../lib/RedisHelper.js');

let conf = {};

RedisHelper.getClient(conf).then(function(client) {
    
    let key = 'name';
    client.get(key, function(err, data) {

        console.log("name get: " + data);

        let value = 'random#' + (+(new Date));
        client.set(key, value, function(err, data) {

            console.log("name set as: " + value);

            client.quit();
        });
    });
});
