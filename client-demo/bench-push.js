
const Sender = require("../lib/sender.js");

const servers = [
    '127.0.0.1:8880',
    '127.0.0.1:8881'
];
const rooms = [
    'room_1'
];
const roomNum = 10;
const pushInterval = 10;
const maxPushCount = 10000;

const messageType = 'show';
const messageData = {
    name: "noname",
    words: "this is a test"
};
const pushIndex = 0;
function sendOnebyOne() {
    pushIndex++;
    if (pushIndex >= maxPushCount) {
        console.log('all done');
        return;
    }
    
    let expectCnt = 0;
    let successCnt = 0;
    let completeCnt = 0;
    servers.forEach((server) => {
        rooms.forEach((room) => {
            expectCnt++;
            Sender.sendChannelMessage2Server(server, room, messageType, messageData).then(function() {
                successCnt++;
                completeCnt++;
            }, function() {
                completeCnt++;
            });
        });
    });
    let maxTry = 5;
    const nextSend = function() {
        if (completeCnt >= expectCnt) {
            setTimeout(sendOnebyOne, pushInterval);
            return;
        }
        maxTry--;
        if (maxTry > 0) {
            setTimeout(nextSend, pushInterval);
            return;
        }
        console.log(`#${pushIndex} | failed: ${successCnt} : ${completeCnt} / ${expectCnt}`);
    };
    nextSend();
}
sendOnebyOne();
