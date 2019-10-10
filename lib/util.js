const NUMBER_FORMATS = {};
NUMBER_FORMATS.STORAGE = {
    'TB': 1024 * 1024 * 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'MB': 1024 * 1024,
    'KB': 1024,
    'Byte': 1
};
NUMBER_FORMATS.TIMECOST = {
    ' year(s)': 365 * 86400,
    ' month(s)': 30 * 86400,
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
const _fillPrefixZero = function(n) {
    if (n < 10) {
        return "0" + n;
    }
    return n;
};
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
        timezonePart = prefix + _fillPrefixZero(timezone) + "00";
    }
    return `${dt.getFullYear()}-${_fillPrefixZero(1 + dt.getMonth())}-${_fillPrefixZero(dt.getDate())}` +
        `T${_fillPrefixZero(dt.getHours())}:${_fillPrefixZero(dt.getMinutes())}:${_fillPrefixZero(dt.getSeconds())}.${dt.getMilliseconds()}` +
        `${timezonePart}`;
};

module.exports = {
    NUMBER_FORMATS,
    formatNumber,
    json2obj,
    getIsoTime
};