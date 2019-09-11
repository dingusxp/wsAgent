
/**
 * client <-> server 通讯协议
 * 
 * client -> server: query
 *   + id
 *   + action
 *   + param
 *   + time
 *   + priority
 *   + context
 * 
 * server -> client: message
 *   + id
 *   + type
 *   + data
 *   + time
 *   + context
 */

/**
 * query priority
 */
const QUERY_PRIORITIES = {
    LEVEL_IMMIDIATE: 0,
    // LEVEL_QUEUE: 1,
    // LEVEL_UNNESSARY: 9
};

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
    QUERY_PRIORITIES,
    INTERNAL_QUERY_ACTIONS,
    INTERNAL_MESSAGE_TYPIES
};