
let messageId = 0;

let Message = {
    
    /**
     * @param {Object} type
     * @param {Object} data
     * @param {Object} context
     */
    create: function(type, data, context = {}) {
        
        messageId++;
        return {
            id: messageId,
            type,
            data,
            context,
            time: (+new Date)
        };
    }
};

module.exports = Message;
