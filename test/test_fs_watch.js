
const fs = require("fs");

const watchDir = "../app/action";

fs.watch(watchDir, function(type, name) {
    console.log(`dir changed: type=${type} & name=${name}`);
});

