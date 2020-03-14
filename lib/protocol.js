
/**
 * client <-> server 通讯协议
 * 
 * client -> server: query
 *   + id
 *   + action
 *   + param
 *   + time
 *   + context
 * 
 * server -> client: message
 *   + id
 *   + type
 *   + data
 *   + time
 *   + context
 * 
 * 注意：如果使用 pb3，请参考 app/protocol/protocol.proto 进行编码
 */

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

module.exports = {
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES
};