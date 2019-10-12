
const protobuf = require("protobufjs");

// util.js
const NUMBER_FORMATS = {};
NUMBER_FORMATS.STORAGE = {
    'TB': 1024 * 1024 * 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'MB': 1024 * 1024,
    'KB': 1024,
    'Byte': 1
};
NUMBER_FORMATS.TIMECOST = {
    ' hours(s)': 3600000,
    ' minute(s)': 60000,
    ' second(s)': 1000,
    ' micro second(s)': 1
};
const formatNumber = function(number, conf) {

    for (let unit in conf) {
        if (number >= conf[unit]) {
            return parseInt(number / conf[unit]) + unit;
        }
    }
    return number;
}

// load pb3
const pb3 = {
    protocol: {
        Message: null,
        Message2: null
    },
    loader: {
        UserList: null,
        User: null
    }
};
protobuf.load("./protocol/protocol.js", function(err, root) {
    if (err) {
        console.log("load protocol failed! " + err);
        return;
    }
    for (let ns in pb3) {
        for (let name in pb3[ns]) {
            pb3[ns][name] = root.lookupType(`${ns}.${name}`);
        }
    }
    console.log("protocol loaded");
    
    // test
    console.log("====== test big content ========");
    let message = {
        id: 123456,
        type: "user.note",
        data: "this is a tets string.\n".repeat(256),
        time: (+new Date),
        context: ""
    };
    let testCount = 100000;

    // json format
    console.log("json format start...");
    let totalSize = 0;
    let startTime = (+new Date);
    for (let i = 0; i < testCount; i++) {
        const string = JSON.stringify(message);
        totalSize += string.length;
        JSON.parse(string);
    }
    let diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
    
    console.log("pb3 format start...");
    totalSize = 0;
    startTime = (+new Date);
    for (let i = 0; i < testCount; i++) {
        const buffer = pb3.protocol.Message.encode(pb3.protocol.Message.create(message)).finish();
        totalSize += buffer.byteLength;
        pb3.protocol.Message.decode(buffer);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
            
    
    
    console.log("====== test complex content ========");
    const user = {
        id:1,
        name: "王小二",
        age: 33,
        phone: "13456789012",
        gender: 1,
        regtime: parseInt((+new Date) / 1000)
    };
    const userList = {
        list: [],
        total: 0
    };
    for (let i = 0; i < 10; i++) {
        userList.total++;
        userList.list.push(user);
    }
    message = {
        id: 123456,
        type: "top.userlist",
        data: {
            type: "JSON",
            loader: "",
            string: "",
            buffer: null
        },
        time: (+new Date),
        context: ""
    };
    testCount = 100000;
    
    // json format
    console.log("json format start...");
    totalSize = 0;
    startTime = (+new Date);
    for (let i = 0; i < testCount; i++) {
        message.data.string = JSON.stringify(userList);
        const string = JSON.stringify(message);
        totalSize += string.length;
        const data = JSON.parse(string);
        JSON.parse(data.data.string);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);

    message = {
        id: 123456,
        type: "show",
        data: {
            type: "PB",
            loader: "UserList",
            string: "",
            buffer: null
        },
        time: (+new Date),
        context: ""
    };
    console.log("pb3 format start...");
    totalSize = 0;
    startTime = (+new Date);
    for (let i = 0; i < testCount; i++) {
        message.data.buffer = pb3.loader.UserList.encode(pb3.loader.UserList.create(userList)).finish();
        const buffer = pb3.protocol.Message2.encode(pb3.protocol.Message2.create(message)).finish();
        totalSize += buffer.byteLength;
        const data = pb3.protocol.Message2.decode(buffer);
        pb3.loader.UserList.decode(data.data.buffer);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
            
});