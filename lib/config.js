
const config = require("../app/_config.js");

/**
 * 获取配置项
 * @param {Object} key
 */
const getConfig = function(key) {
    
    return config[key];
};

/**
 * 合并命令行参数，当前仅允许：
 *   --serverIp=127.0.0.1
 *   --serverPort=8888
 * @param {Object} commands
 */
const mergeCommandArgs = function(commandLine) {
	
	if (!commandLine) {
		return;
	}
	const re = /--(serverIp|serverPort|maxPushQPS|maxQueryQPS|maxConnectionCount|pushMessageTimeout|pushMessageMaxRetry|serverContextRefreshInterval|serverDumpUserInterval)=([\w\.]+)/;
	commandLine.forEach(function(arg) {
		const check = re.exec(arg);
		if (!check) {
			return;
		}
        const field = check[1];
        const value = check[2];
		switch (field) {
			case "serverIp":
			  config[field] = "" + value;
			  break;
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
		}
	});
};

module.exports = {
    getConfig,
	mergeCommandArgs
};