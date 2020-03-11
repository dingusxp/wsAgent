
let counter = 0;
process.on('message', function(query) {
    
    counter++;
    if (query.status && query.status === 3) {
        return;
    }
    if (query.status && query.status === 4) {
        throw "I am crashed!";
    }
    if (query.status && query.status === 5) {
        process.send("this is a random response for once! counter: " + counter);
        return;
    }
    
    // default status=2
    if (!query.queryId) {
        return;
    }
    const content = "Request param: " + JSON.stringify(query.param) + "; counter: " + counter;
    const message = {
        queryId: query.queryId,
        content
    };
    process.send(message);
});
