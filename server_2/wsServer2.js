const WebSocket = require('ws');

// Amazon Elasticache
const redis = require('redis');
// must be an unclustered version
const redisURL = 'pepperredis.ajwjwr.ng.0001.apne1.cache.amazonaws.com'; //no port at the end
const redisPort = 6379;

const redisClient = redis.createClient(redisPort, redisURL);


let serverTwoObject = {
    mom: 'ty',
    dad: 'chuck',
    children: ['jodie', 'kire'],
    pets: ['ninja'],
    ages: {
        mom: 48,
        dad: 60,
        jodie: 18,
        tran: 21,
        ninja: 9,
    },
};

redisClient.set('jsonObject2', JSON.stringify(serverTwoObject));

// This will return a JavaScript String
redisClient.get('jsonObject', function (err, reply) {
    console.log(reply.toString()); // Will print `hi mom`
});


const server = new WebSocket.Server({
    // 'Private DNS' of EC2 instance; nothing at beginning ('http') or end ('/')
    'host': 'ip-172-31-34-41.ap-northeast-1.compute.internal',
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

