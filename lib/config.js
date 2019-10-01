
const config = require("../_config.js");

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
	const re = /--(serverIp|serverPort)=([\w\.]+)/;
	commandLine.forEach(function(arg) {
		const check = re.exec(arg);
		if (!check) {
			return;
		}
		switch (check[1]) {
			case "serverIp":
			  config["serverIp"] = "" + check[2];
			  break;
			case "serverPort":
			  config["serverPort"] = parseInt(check[2]);
			  break;
		}
	});
};

module.exports = {
    getConfig,
	mergeCommandArgs
};