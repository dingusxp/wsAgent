
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
const SEND_TIMEOUT = 5000;
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
    let start = (+new Date);
    const nextSend = function() {
        // 已经全部完成，下一组
        if (completeCnt >= expectCnt) {
            setTimeout(sendOnebyOne, pushInterval);
            return;
        }
        let now = (+new Date);
        // 持续检查，直到 全部完成 或 超时
        if (now - start < SEND_TIMEOUT) {
            setTimeout(nextSend, pushInterval);
            return;
        }
        console.log(`#${pushIndex} | failed: ${successCnt} : ${completeCnt} / ${expectCnt}`);
        setTimeout(sendOnebyOne, pushInterval);
    };
    nextSend();
}
sendOnebyOne();
