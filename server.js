// const WebSocket = require('ws');
//
// // Amazon Elasticache
// const redis = require('redis');
// const redisEndpoint = 'pepper-redis.ajwjwr.clustercfg.apne1.cache.amazonaws.com:6379';
// const redisPort = 6379;
//
// const server = new WebSocket.Server({
//     // 'Private DNS' of EC2 instance; nothing at beginning ('http') or end ('/')
//     'host': 'ip-172-31-37-215.ap-northeast-1.compute.internal',
//     'port' : 3000,
// });
//
// server.on('connection', function (client){
//     console.log('Client connection opened!');
//
//     client.on('message', function (data){
//         console.log('Client message received:');
//         console.log('    >' + data);
//     });
// });
//
// server.on('listening', function (){
//     console.log('Server listening...');
// });
//
// server.on('error', function (err){
//     console.log('Server error', err);
// });
//
// server.listen(3000);
//
// console.log('Initialization done');

////////////

const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const serverPort = 3000;


let server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end('Just sent the headers');

}).listen(serverPort, function() {
    console.log('Listening on port: ' + serverPort);
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    let connection = request.accept('TBD-protocol', request.origin);
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