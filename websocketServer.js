const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const serverPort = 3000;

// Amazon Elasticache
const redis = require('redis');
// must be an unclustered version
const redisURL = 'pepperredis.ajwjwr.ng.0001.apne1.cache.amazonaws.com'; //no port at the end
const redisPort = 6379;

const redisClient = redis.createClient(redisPort, redisURL);

let testObject = {
    mom: 'yen',
    dad: 'chau',
    children: ['ngoc', 'tran'],
    pets: ['ninja'],
    ages: {
        mom: 48,
        dad: 60,
        jodie: 18,
        tran: 21,
        ninja: 9,
    },
};

redisClient.set('jsonObject', JSON.stringify(testObject));

// This will return a JavaScript String
redisClient.get('jsonObject', function (err, reply) {
    console.log(reply.toString()); // Will print `hi mom`
    redisClient.del('jsonObject');
});


let server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end('Just sent the headers');

}).listen(serverPort, function() {
    console.log('Listening on port: ' + serverPort);
});

wsServer = new WebSocketServer({
    httpServer: server,

    autoAcceptConnections: false,
});

/**
 * Determines whether client connection is valid/allowed
 * @param origin origin of client's request
 * @returns {boolean}
 */
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

/**
 * Called upon client connection attempt
 */
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    let connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});