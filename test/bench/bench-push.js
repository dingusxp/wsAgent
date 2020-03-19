/**
 * 主动推送消息测试
 * 可配合 bench.js 使用（关闭 bench.js 的定时 speak）
 */
const process = require('process');
const Sender = require("../../lib/sender.js");

const host = '127.0.0.1';
const startPort = 8888;
const serverNum = 1;
const roomNum = 100;
// 每一批（所有server的所有room）推送间隔
// 此处使用 timeout，所以实际间隔还要加上调用推送接口的时间
const pushInterval = 1000;
// 总的推送批次数
const maxPushCount = 100;

const servers = [];
let i = 0;
while (i++ < serverNum) {
    servers.push(host + ':' + (startPort + i - 1))
}
const rooms = [];
i = 0;
while (i < roomNum) {
    rooms.push('room_' + i);
    i++;
}
// console.log('config', {servers,rooms,pushInterval});

const messageType = 'show';
const messageData = {
    name: "noname",
    words: "this is a test"
};
let pushIndex = 0;
const SEND_TIMEOUT = 5000;
const reportInfo = {
    pushIndex: 0,
    totalExpectCount: 0,
    totalSuccessCount: 0,
    totalCompleteCount: 0
};
function sendOnebyOne() {
    pushIndex++;
    reportInfo.pushIndex = pushIndex;
    if (pushIndex >= maxPushCount) {
        console.log('all done');
        process.exit(0);
        return;
    }
    
    let expectCnt = 0;
    let successCnt = 0;
    let completeCnt = 0;
    servers.forEach((server) => {
        rooms.forEach((room) => {
            reportInfo.totalExpectCount++;
            expectCnt++;
            Sender.sendChannelMessage2Server(server, room, messageType, messageData).then(function() {
                successCnt++;
                completeCnt++;
                reportInfo.totalSuccessCount++;
                reportInfo.totalCompleteCount++;
            }, function() {
                completeCnt++;
                reportInfo.totalCompleteCount++;
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

setInterval(() => {
    console.log("report", reportInfo);
}, 5000);
