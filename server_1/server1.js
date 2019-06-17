const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require("redis");
const ip = require("ip");
const uuidv4 = require("uuid/v4");

const domain = 'https://roboblocks.xyz/';
const messageConstants = require('../client/message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;
const serverPort = 3000;

// const redisPort = 6379;
// const redisURL = 'pepperredis.ajwjwr.ng.0001.apne1.cache.amazonaws.com';

const devices_map = new Map();

let server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end('Just sent the headers');
}).listen(serverPort, function() {
    console.log('Server 1 listening on port: ' + serverPort);
    serverStartup();
});


// const publisher = redis.createClient(redisPort, redisURL); // 送信用 (そうしんよう) : for sending
// const subscriber = redis.createClient(redisPort, redisURL); // 受け取り用 （うけとりよう） : for accepting
//
// subscriber.subscribe('socket');
//
// publisher.on('error', function(err) {
//     console.log('Publisher error:  ' + String(err));
// });
// subscriber.on('error', function(err) {
//     console.log('Subscriber error: ' + String(err));
// });


wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});

/**
 * Handles server cleanup upon server startup (or rebooting after failure). //TODO: rewrite this
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

    connection.on('message', function(message) {
        console.log('MESSAGE RECEIVED FROM CLIENT');
        let data = parseJSON(message.utf8Data);
        if(!data) {
            return false;
        }

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
        //TODO: close connection, save information of the respective connection to unregister device from device_maps
        if(connection.hasOwnProperty('id')){
            unregisterDevice(connection);
        }
        try {
            let url = domain + 'project/node/delete_user';
            let options = {
                uri: url,
                headers: {
                    "Content-type": "application/x-www-form-urlencoded",
                },
                form: {
                    "socket_id": connection.webSocketKey
                }
            };
            request.post(options, function (error, response, body) {
                console.log('Deleting user, post request unparsed body: ');
                console.log(body);
                let users = JSON.parse(body).notification;
                console.log('what users means: ');
                console.log(users);
            });
        } catch (err) {
            console.log(err);
        }
    });
});


// subscriber.on('message', function(channel, message){
//     let msgObject = parseJSON(message);
//
//     //TODO: what happens when there's no response???? Do we want to do a timer to for how long it may take to respond???
//     if(msgObject['origin_ip'] === ip.address()){
//         // same server reading the request for the first time
//     } else {
//         // different server requested, fill object with this server's local micro:bits
//     }
//
// });


/**
 * Sends message to other servers to collect micro:bits???
 * @param roomID
 */
function getAllMicrobits(roomID) {
    let microbitsMessage = {
        message_type: messageType.microbitRequest,
        room_id: roomID,
        origin_ip: ip.address(),
        reply_ip: null,
        microbits: []
    };

    devices_map.get(roomID).get(deviceType.microbit).forEach((value, key) => {
        let microbit = {key: value.id['name']}; //uuid: user-chosen name
        microbitsMessage.microbits.push(microbit);
    });

    // publisher.publish('request', JSON.stringify((microbitsMessage)));
}














///////////////////////////////////////////////////

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
 * The devices are stored by room id, then by device type,
 * then their respective connection id (uuid v4).
 *
 * @param roomID ID of room that the device logged in to, unique to room
 * @param type type of device (DeviceType.robot, DeviceType.microbit, DeviceType.browser)
 * @param connection socket connection object
 * @param deviceName device name, not necessarily unique
 */
function registerDevice(roomID, type, connection, deviceName) {
    console.log('REGISTERING DEVICE');
    if (!devices_map.has(roomID)) {
        let room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
        ]);
        devices_map.set(roomID, room_map);
    }
    //identifying information to unregister device on closing
    connection.id = {
        room_id: roomID,
        device_type: type,
        name: deviceName,
        uuid: uuidv4(),
    };
    devices_map.get(roomID).get(type).set(connection.id.uuid, connection);

    // TODO: register to REDIS???
    // save microbit's ID to redis for _this_ server's runtime
    // 1. use union of _this_ server's runtime and other server's runtime redis-data to return all registered microbits
    // 2. save microbit to set that represent everything among all servers; upon startup,
    //    take difference between previous runtime redis and global to update global
    console.log('!!!! Devices map: ');
    console.log(devices_map);

    if (devices_map.get(roomID).get(type).size >= 2){
        alertPeppers(roomID);
    }
}

/**
 * Unregisters device's connection from local memory upon closing of connection
 * @param connection websocket connection object that was previously registered
 */
function unregisterDevice(connection){
    if(!connection.hasOwnProperty('id')){
        console.log('This connection was not registered');
        return false;
    }

    if (!devices_map.has(connection.id.room_id)){
        console.log('Room does not exist');
    }
    let success = devices_map.get(connection.id.room_id).get(connection.id.device_type).delete(connection.id.uuid);

    //debug lines
    if (!success) {
        console.log('Device was not registered; unregister unsuccessful');
    } else {
        console.log('Successfully unregistered. Updated local mem: ');
        console.log(devices_map);
    }
}


/**
 * Handles login attempts of micro:bit
 * @param data message object of micro:bit containing device_type, room_id, microbit_name, password, etc.
 * @param connection socket connection object
 */
function login(data, connection) {
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

        registerDevice(responseBody.room_id, deviceType.microbit, connection, data.microbit_name);
        console.log('registerDevice function has been called for microbit');
    });

}


/**
 * Saves the robot to a room/this server (handshake procedure)
 *
 * @param data parsed message object sent from Pepper
 * @param connection socket connection object
 */
function handshake(data, connection) {
    if (data['device_type'] !== deviceType.robot){
        return false;
    }

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
        if (error) {
            console.error(error);
            connection.sendUTF('database connection failed');
        }



        let responseBody = parseJSON(body);

        console.log('BODY of POST response: ');
        console.log(responseBody);
        console.log('---------------------------------');

        const failedLogin = '900';
        if(responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        } else if (!responseBody) {
            connection.sendUTF('Room is full.');
        } else {
            let names = {jp: response['robot_name_ja'],
                        eng: response['robot_name_en']}
            registerDevice(data.room_id, deviceType.robot, connection, names);
            connection.sendUTF(body);
        }
    });

}


/**
 * Alerts Peppers in the same room that a newly registered micro:bit
 * that it has been added.
 *
 * @param roomID the unique room ID to alert the peppers in. Must be the
 * same ID as the micro:bit
 */
function alertPeppers(roomID){
    devices_map.get(roomID).get(deviceType.robot).forEach((value, key) => {
        value.sendUTF('This is how we would alert all the Peppers! If only I knew how...');
    });
}


