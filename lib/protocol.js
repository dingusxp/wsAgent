
/**
 * 交互协议
 */
const fs = require('fs');
const path = require('path');
const protobuf = require("protobufjs");
const Config = require("./config.js");
const protocolConfig = Config.getConfig("protocol") || {};

/**
 * internal query action
 */
const INTERNAL_QUERY_ACTIONS = {
    AUTH: '_auth',
    SUBSCRIBE: '_subscribe',
    UNSUBSCRIBE: '_unsubscribe'
};

/**
 * internal message type
 */
const INTERNAL_MESSAGE_TYPIES = {
    CALLACK: '_callback'
};

// pb3
const protocolPath = path.join(__dirname, "../app/protocol/protocol.js");
let lastLoaded = 0;
const pb3 = {};
const doLoadPb3 = function() {
    
    // 更新间隔少于3s，不处理
    const now = (+ new Date);
    if (now - lastLoaded < 3000) {
        return;
    }
    lastLoaded = now;
    
    // 读取 loader 信息
    const content = fs.readFileSync(protocolPath, 'utf8').toString();
    const info = JSON.parse(content);
    if (typeof info !== "object" || !info["nested"] || !info["nested"]["loader"]) {
        protocolConfig.enablePb3 = false;
        return;
    }
    loaderNames = Object.keys(info["nested"]["loader"]["nested"]);

    // 加载协议
    protobuf.load(protocolPath, function(err, root) {
        
        if (err) {
            return;
        }
        pb3["protocol"] = {};
        pb3["protocol"]["Query"] = root.lookupType("protocol.Query");
        pb3["protocol"]["Message"] = root.lookupType("protocol.Message");
        pb3["loader"] = {};
        loaderNames.forEach((name) => {
            pb3["loader"][name] = root.lookupType(`loader.${name}`);
        });
    });
};

/**
 * 获取 pb3 详细协议对象
 */
const loadPb3 = function() {
    
    if (lastLoaded > 0) {
        return pb3;
    }
    
    if (!protocolConfig.enablePb3) {
        return pb3;
    }
    
    // watch protocol file
    if (protocolConfig.watch) {
        fs.watch(protocolPath, doLoadPb3);
    }
    
    doLoadPb3();
    return pb3;
}
loadPb3();

/**
 * 解析 query （如果是 pb3 格式，自动解析）
 * @param {Object} query
 */
const parseQuery = function(query) {
    
    // pb 格式
    if (query && query.constructor === Buffer && protocolConfig.enablePb3) {
        if (!pb3.protocol || !pb3.protocol.Query) {
            return false;
        }
        const newQuery = pb3.protocol.Query.decode(query);
        newQuery["param"] = pb3Data2obj(newQuery["param"]);
        // 解构可以使 pb3 与 json 格式一致
        // newQuery["param"] = {...newQuery["param"]};
        // newQuery["context"] = {...newQuery["context"]};
        return newQuery;
    }

    // 简单检查一下
    if (typeof query !== "object" || !query.id) {
        console.log("bad query", query);
        return false;
    }
    
    return query;
}

/**
 * 处理待推送的 message，如果配置了 pb3，自动编码
 * @param {Object} message
 */
const wrapMessage = function(message) {

    // 简单判断一下
    if (typeof message !== "object" || !message.id) {
        return false;
    }
    
    // 未开启 pb3 直接返回
    if (!protocolConfig.enablePb3 || !pb3.protocol || !pb3.protocol.Message) {
        return message;
    }
    
    // 如果 data 满足 pb3 Data 格式，则整个信息编码为 pb3
    if (typeof message.data === "object" && message.data.loader && message.data.buffer) {
        return pb3.protocol.Message.encode(pb3.protocol.Message.create(message)).finish();
    }

    return message;
}

/**
 * 将对象转为 pb3 Data 格式
 * @param {Object} loader
 * @param {Object} obj
 */
const obj2pb3Data = function(loader, obj) {
    
    if (!protocolConfig.enablePb3 || !pb3.loader || !pb3.loader[loader]) {
        return false;
    }
    
    return {loader, "buffer": pb3.loader[loader].encode(pb3.loader[loader].create(obj)).finish()};
}

/**
 * 解析 pb3 Data 数据为 对象
 * @param {Object} pb3Data
 *  + loader
 *  + buffer
 */
const pb3Data2obj = function(pb3Data) {
    
    if (!pb3Data.loader || !pb3Data.buffer) {
        return pb3Data;
    }
    if (!pb3.loader || !pb3.loader[pb3Data.loader]) {
        return false;
    }
    return pb3.loader[pb3Data.loader].decode(pb3Data.buffer);
}

module.exports = {
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES,
    loadPb3,
    parseQuery,
    wrapMessage,
    pb3Data2obj,
    obj2pb3Data
};