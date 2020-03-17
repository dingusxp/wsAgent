
const protobuf = require("protobufjs");

// load pb3
const pb3 = {
    demo: {
        // Gender: null,
        User: null
    },
};
protobuf.load("./_pb3.demo.proto", function(err, root) {
    if (err) {
        console.log("load protocol failed! " + err);
        return;
    }
    for (let ns in pb3) {
        for (let name in pb3[ns]) {
            pb3[ns][name] = root.lookupType(`${ns}.${name}`);
        }
    }
    // console.log("pb3 loaded", pb3);

    // test encode
    const data = {
        id: 123,
        name: 'test',
        phone: '1357924680',
        gender: 1,
        regtime: 1234567890
    };
    const buffer = pb3.demo.User.encode(pb3.demo.User.create(data)).finish();
    console.log("buffer", buffer);
    
    const jsonStr = JSON.stringify(buffer);
    console.log("jsonStr", jsonStr);
    const tmpBuffer = JSON.parse(jsonStr);
    const parsedBuffer = Buffer.from(tmpBuffer.data);
    console.log("parsedBuffer", parsedBuffer);

    // test decode
    const user = pb3.demo.User.decode(parsedBuffer);
    console.log("decodedData", user);
});

