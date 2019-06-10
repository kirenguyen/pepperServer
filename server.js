const WebSocket = require('ws');

// Amazon Elasticache
const redis = require('redis');
const redisEndpoint = 'pepper-redis.ajwjwr.clustercfg.apne1.cache.amazonaws.com:6379';
const redisPort = 6379;

const server = new WebSocket.Server({
    // 'Private DNS' of EC2 instance, must NOT contain a slash at the end
    'host': 'ip-172-31-37-215.ap-northeast-1.compute.internal',
    'port' : 3000,
});

server.on('connection', function (client){
    console.log('Client connection opened!');

    server.emit('ping', 'Pinging the client');

    client.on('message', function (data){
        console.log('Client message received: ' + data);
    });

});

server.on('listening', function (){
    console.log('Server listening...');
});

server.on('error', function (err){
    console.log('Server error', err);
});

console.log('Initialization done');