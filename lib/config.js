
const config = require("../app/config.js");

/**
 * 获取配置项
 * @param {Object} key
 */
const getConfig = function(key) {
    
    return config[key];
};

/**
 * 合并命令行参数
 * @param {Object} commands
 */
const mergeCommandArgs = function(commandLine) {
	
	if (!commandLine) {
		return;
	}
	const re = /--(\w+)=([\w\.]+)/;
	commandLine.forEach(function(arg) {
		const check = re.exec(arg);
		if (!check) {
			return;
		}
        const field = check[1];
        const value = check[2];
		switch (field) {
			case "serverPort":
            case "maxPushQPS":
            case "maxQueryQPS":
            case "maxConnectionCount":
            case "pushMessageTimeout":
            case "pushMessageMaxRetry":
            case "serverContextRefreshInterval":
            case "serverDumpUserInterval":
			  config[field] = parseInt(value);
			  break;
            default:
              config[field] = "" + value;
		}
	});
};

module.exports = {
    getConfig,
	mergeCommandArgs
};