const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require("redis");
const ip = require("ip");

const domain = 'https://roboblocks.xyz/';
const messageConstants = require('../client/message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;
const serverPort = 3000;

const redisPort = 6379;
const redisURL = 'pepperredis.ajwjwr.ng.0001.apne1.cache.amazonaws.com';

const devices_map = new Map();

let server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end('Just sent the headers');
}).listen(serverPort, function() {
    console.log('Server 1 listening on port: ' + serverPort);
    serverStartup();
});


const publisher = redis.createClient(redisPort, redisURL); // 送信用 (そうしんよう) : for sending
const subscriber = redis.createClient(redisPort, redisURL); // 受け取り用 （うけとりよう） : for accepting
const writer = redis.createClient(redisPort, redisURL); // for writing information to persist on redis DB
subscriber.subscribe('socket');


wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});

/**
 * Handles server cleanup upon server startup (or rebooting after failure).
 * Removes 'zombie' micro:bits from redis (micro:bits accepted from server's previous runtime).
 */
function serverStartup() {
    console.log('ip of this server: ' + ip.address());  //constant, even after rebooting

}



/**
 * Determines whether dist connection is valid/allowed
 * @param origin origin of dist's request
 * @returns {boolean}
 */
function originIsAllowed(origin) {
    console.log('origin of request: ');
    console.log(origin);
    return true;
}


/**
 * Called upon dist connection attempt
 */
wss.on('request', function(req) {
    if (!originIsAllowed(req.origin)) {
        req.reject();
        console.log((new Date()) + ' Connection from origin ' + req.origin + ' rejected.');
        return;
    }

    let connection = req.accept('rb', req.origin);
    connection.webSocketKey = req.httpRequest.headers["sec-websocket-key"];

    console.log((new Date()) + ': Connection accepted.');

    connection.on('message', function(message) {
        console.log('MESSAGE RECEIVED FROM CLIENT');
        let data = parseJSON(message.utf8Data);

        if(!data) {
            return false;
        }

        console.log('Parsed message: ');
        console.log(data);
        switch(data['message_type']){
            case messageType.login:
                login(data, connection);
                break;
            case messageType.handshake:
                handshake(data, connection);
                break;
            case messageType.action:
                break;
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        console.log('desc: ' + description);
    });
});

/**
 * Determines if the micro:bit successfully logged into the server
 * @param data parsed JSON object of microbit's initial message
 * @returns {boolean} json object of micro:bit message if successfully authenticated,
 *          false otherwise
 */
function authenticate(data){
    let body = {
        'room_name': data.room_name,
        'password': data.password,
    };

    let options = {
        uri: domain + 'project/login',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        form: body
    };

    let responseBody = null;
    request.post(options, function(error, response, body){
        if (error){
            console.error(error);
        }

        responseBody = parseJSON(body);
        console.log('Parsed POST body:');
        console.log(responseBody);

        const failedLogin = '900';
        if(!responseBody || responseBody.result === failedLogin) {
            console.log('Failed to authenticate: ' + body);
            return false;
        }
        /* After parsing: {
         result: '000',
        room_id: 1 }
         */
    });
    return responseBody;
}

/**
 * Attempts to parse a string into a JSON object
 * @param data JSON string that can be parsed back into an object
 * @returns JSON object if data was parsable, false otherwise
 */
function parseJSON(data) {
    try {
        return JSON.parse(data);
    } catch (err) {
        console.log('Data was not a parsable JSON');
        console.log(err);
    }
}

/**
 * Registers successful connection of device to redis and local memory
 * @param roomID ID of room that the device logged in to
 * @param type type of device (DeviceType.robot, DeviceType.microbit, DeviceType.browser)
 * @param deviceName device's name, must be unique to the device
 * @param connection socket connection object
 *
 */
function registerDevice(roomID, type, deviceName, connection) {
    if (!devices_map.has(roomID)) {
        let room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
            [deviceType.browser, new Map()]
        ]);
        devices_map.set(roomID, room_map);

        devices_map.get(roomID).get(type).set(deviceName, connection);

        // TODO: register to REDIS
        // save microbit's ID to redis for _this_ server's runtime
        // 1. use union of _this_ server's runtime and other server's runtime redis-data to return all registered microbits
        // 2. save microbit to set that represent everything among all servers; upon startup,
        //    take difference between previous runtime redis and global to update global
    }
}

/**
 * Handles login attempts of different devices
 * @param data message object of micro:bit containing device_type, room_id, microbit_name, password, etc.
 * @param connection socket connection object
 */
function login(data, connection) {
    switch (data['device_type']) {
        case deviceType.microbit:
            console.log('device type is microbit');
            let response = authenticate(data);  // {room_id: ##, response: "000"}
            if (response) {
                registerDevice(response['room_id'], deviceType.microbit, data['microbit_name'], connection);
                console.log('Registered a microbit, devices_map: ');
                console.log(devices_map);
                //TODO: alert peppers in correct room that a microbit has been successfully added

            }
            break;
        case deviceType.robot:
            break;
        case deviceType.browser:
            break;
        default:
            console.log('device type failed to match');
            break;
    }
}

/**
 * Saves the robot to this room (handshake procedure)
 * @param data parsed message object sent from Pepper
 * @param connection socket connection object
 */
function handshake(data, connection) {
    registerDevice(data.room_id, deviceType.robot, data.robot_id, connection);

    let body = {
        "room_id": data.room_id,
        "user_id": data.user_id,
        "socket_id": connection.webSocketKey,
        "device_type": data.device_type,
        "robot_id": data.robot_id
    };

    let options = {
        uri: domain + 'project/node/save_user',
        headers: {
            "Content-type": "application/x-www-form-urlencoded",
        },
        form: body
    };

    request.post(options, function (error, response, body) {
        // console.log(error,response,body)

        console.log('BODY of POST response: ');
        console.log(body);
        console.log('---------------------------------');

        if (error) {
            console.error(error);
            connection.sendUTF('database connection failed');
        }
        if (data.device_type === deviceType.robot && !body) {
            connection.sendUTF('room is full.');
        } else {
            connection.sendUTF(body);
        }
    });
}

module.exports.login = login;
module.exports.authenticate = authenticate;

