let RedisHelper = require('../lib/RedisHelper.js');

let conf = {};

RedisHelper.getClient(conf).then(function(client) {
    
    const doMget = (callback = null) => {
        client.mget(['test_room1', 'test_room2'], (err, data) => {
            if (err) {
                console.log("mget error: " + err);
                return;
            }
            console.log("mget-data", data);
            if (callback) {
                callback();
            }
        });
    };
    
    client.multi()
        .set('test_room1', (+new Date))
        .expire('test_room1', 2)
        .set('test_room2', (+new Date))
        .expire('test_room2', 5)
        .exec((err, replies) => {
            if (err) {
                console.log("multi exec error: " + err);
                return;
            }
            doMget();
            setTimeout(doMget, 3000);
            setTimeout(() => {
                doMget(() => {
                    client.quit();
                });
            }, 6000);
        });
});
