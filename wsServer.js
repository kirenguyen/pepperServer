const WebSocket = require('ws');

// Amazon Elasticache
const redis = require('redis');
const redisURL = 'pepperredis.ajwjwr.ng.0001.apne1.cache.amazonaws.com'; //no port at the end
const redisPort = 6379;

const redisClient = redis.createClient(redisPort, redisURL);

redisClient.set('foo_rand000000000000', 'hi mom');

// This will return a JavaScript String
redisClient.get('foo_rand000000000000', function (err, reply) {
    console.log(reply.toString()); // Will print `hi mom`
});

redisClient.get('tranSet', function(err, reply){
    console.log(reply.toString()); // should print smth...
})


const server = new WebSocket.Server({
    // 'Private DNS' of EC2 instance; nothing at beginning ('http') or end ('/')
    'host': 'ip-172-31-37-215.ap-northeast-1.compute.internal',
    'port' : 3000,
});

server.on('connection', function (client){
    console.log('Client connection opened!');

    client.on('message', function (data){
        console.log('Client message received:');
        console.log('    >' + data);
    });
});

server.on('listening', function (){
    console.log('Server listening...');
});

server.on('error', function (err){
    console.log('Server error', err);
});

console.log('Initialization done');

