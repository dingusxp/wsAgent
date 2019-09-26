process.on('message', function(query) {
    
    if (query.status && query.status === 3) {
        return;
    }
    if (query.status && query.status === 4) {
        const res = query.res;
        res.send("this is the message from child process!");
        return;
    }
    
    // default status=2
    if (!query.queryId) {
        return;
    }
    const content = "Request param: " + JSON.stringify(query.param);
    const message = {
        queryId: query.queryId,
        content
    };
    process.send(message);
});
