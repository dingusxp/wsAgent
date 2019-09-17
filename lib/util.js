
const NUMBER_FORMATS = {};
NUMBER_FORMATS.STORAGE = {
    'TB': 1024 * 1024 * 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'MB': 1024 * 1024,
    'KB': 1024,
    'Byte': 1
};
NUMBER_FORMATS.TIMECOST = {
    ' year(s)': 365*86400,
    ' month(s)': 30*86400,
    ' day(s)': 86400,
    ' hours(s)': 3600,
    ' minute(s)': 60,
    ' second(s)': 1
};
const formatNumber = function(number, conf) {
    
    for (let unit in conf) {
        if (number >= conf[unit]) {
            return parseInt(number / conf[unit]) + unit;
        }
    }
    return number;
}

const json2obj = function(jsonString) {
    
    if (jsonString && jsonString.startsWith("{") && jsonString.endsWith("}")) {
        return JSON.parse(jsonString);
    }
    return jsonString;
}

/**
 * ISO8601 Time
 */
const getIsoTime = function(dt) {
    
    dt = dt || (new Date());
    let timezone = (0 - dt.getTimezoneOffset()) / 60;
    let timezonePart = 'Z';
    if (timezone !== 0) {
        let prefix = '+';
        if (timezone < 0) {
            prefix = '-';
            timezone = 0 - timezone;
        }
        timezonePart = prefix + (timezone >= 10 ? timezone : "0" + timezone);
    }
    return `${dt.getFullYear()}-${db.getMonth() + 1}-${dt.getDate()}`
        + `T${db.getHours()}:${db.getMinutes()}:${db.getSeconds()}.${db.getMilliseconds()}`
        + `${timezonePart}`;
};

module.exports = {
    NUMBER_FORMATS,
    formatNumber,
    json2obj
};