
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
const protocol = {
    Query: null,
    Message: null,
    Query2: null,
    Message2: null,
    SampleData: null
};
protobuf.load("./protocol/protocol.js", function(err, root) {
    if (err) {
        console.log("load protocol failed! " + err);
        return;
    }
    protocol.Query = root.lookupType("protocol.Query");
    protocol.Message = root.lookupType("protocol.Message");
    protocol.Query2 = root.lookupType("protocol.Query2");
    protocol.Message2 = root.lookupType("protocol.Message2");
    protocol.SampleData = root.lookupType("protocol.SampleData");
    // protocol.DataType = root.lookupType("protocol.DataType");
    console.log("protocol loaded");
    
    // test
    console.log("====== test big content ========");
    let message = {
        id: 123456,
        type: "show",
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
        const buffer = protocol.Message.encode(protocol.Message.create(message)).finish();
        totalSize += buffer.byteLength;
        protocol.Message.decode(buffer);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
            
    
    
    console.log("====== test complex content ========");
    const sample = {
        id:1,
        name: "王小二",
        age: 33,
        gender: "sale",
        birthday: "2010-01-01",
        phone: "13456789012",
        email: "wangxiaoer@domain.com",
        address: "anywhere",
        note: "",
        regtime: (+new Date)
    };
    message = {
        id: 123456,
        type: "show",
        data: {
            type: "JSON",
            loader: "",
            string: JSON.stringify(sample),
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
        const string = JSON.stringify(message);
        totalSize += string.length;
        JSON.parse(string);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
    
    const sampleBuffer = protocol.SampleData.encode(protocol.SampleData.create(sample)).finish();
    message = {
        id: 123456,
        type: "show",
        data: {
            type: "PB",
            loader: "SampleData",
            string: "",
            buffer: sampleBuffer
        },
        time: (+new Date),
        context: ""
    };
    console.log("pb3 format start...");
    totalSize = 0;
    startTime = (+new Date);
    for (let i = 0; i < testCount; i++) {
        const buffer = protocol.Message2.encode(protocol.Message2.create(message)).finish();
        totalSize += buffer.byteLength;
        protocol.Message2.decode(buffer);
    }
    diffTime = (+new Date) - startTime;
    console.log(`result: \n`
            + `  total size: ${formatNumber(totalSize, NUMBER_FORMATS.STORAGE)}\n`
            + `  cost: ${formatNumber(diffTime, NUMBER_FORMATS.TIMECOST)}\n`);
            
    
});

