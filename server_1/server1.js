const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require("redis");
const SERVER_ID = 'SERVER_ONE';

const RedisMessage = require('../messages/redis-publisher-message');
const uuidv4 = require("uuid/v4");

const domain = 'https://roboblocks.xyz/';
const messageConstants = require('../messages/message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;
const SERVER_PORT = 3000;

const REDIS_PORT = 6379;
const REDIS_ENDPOINT = 'roboblocks-dev-001.pv4tra.0001.use2.cache.amazonaws.com';

// Devices connected to this server
const devices_map = new Map();

// Devices connected to the other server
const secondary_devices = new Map();



let server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Just sent the headers');
}).listen(SERVER_PORT, function() {
    console.log('Server 1 listening on port: ' + SERVER_PORT);
});

const publisher = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
const subscriber = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
subscriber.subscribe('socket');

publisher.on('error', function(err) {
    console.log('Publisher error:  ' + String(err));
});
subscriber.on('error', function(err) {
    console.log('Subscriber error: ' + String(err));
});


wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});


/**
 * Determines whether dist connection is valid/allowed
 * @param origin origin of dist's request
 * @returns {boolean}
 */
function originIsAllowed(origin) {
    return true;
}


/**
 * Called upon client connection attempt
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
            case messageType.microbitRequest:
                //data must have room_id of the pepper, TODO
                requestAllMicrobits(data, connection);
                break;
            default:
                break;
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        console.log('desc: ' + description);

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
                //TODO: finish up the clean-up
                let users = JSON.parse(body).notification;
            });
        } catch (err) {
            console.log(err);
        }
    });
});


/**
 * All messages received by subscriber must be children of 'RedisMessage' class.
 */
subscriber.on('message', function(channel, message){
    let msgObject = parseJSON(message);

    switch(msgObject.message_type) {
        case messageType.microbitRequest:
            break;
        case messageType.addMicrobit:
            if(msgObject.origin === SERVER_ID){
                console.log('RECEIVED REQUEST TO ADD MICROBIT FROM OG SERVER');
            } else {
                console.log('THE ROOM_ID OF THE MESSAGE OBJECT IS: ', msgObject.room_id);
                registerGlobalDevice(msgObject.room_id, deviceType.microbit, msgObject.message['uuid'],
                    msgObject.message['name'])
                alertPeppers(msgObject.room_id, msgObject.message['uuid'],
                    msgObject.message['name'], false);
            }
            break;
        case messageType.addRobot:
            if(msgObject.origin === SERVER_ID){
                console.log('RECEIVED REQUEST TO ADD ROBOT FROM OG SERVER');
            } else{
                registerGlobalDevice(msgObject.room_id, deviceType.robot, msgObject.message['uuid'],
                    msgObject.message['name'])
            }
            break;
        case messageType.microbitAction:
            // if microbit or robot is on this server (depending on what the action is), do the action, else ignore
            break;
        default:
            console.log('Message pubbed that fell into default case: ');
            console.log(msgObject);
            break;
    }
});


/**
 *
 *
 * @param data
 * @connection the websocket connection object of Pepper that sent the request for all Microbits
 */
function requestAllMicrobits(data, connection) {
    const roomID = data['room_id']; //TODO: figure out how to get the correct room ID

    let microbitsMessage = new RedisMessage();
    microbitsMessage.setMessageType(messageType.microbitRequest);
    microbitsMessage.setRoomId(roomID);
    microbitsMessage.setOrigin(SERVER_ID);
    microbitsMessage['microbits']  = [];

    devices_map.get(roomID).get(deviceType.microbit).forEach((value, key) => {
        let microbit = {paired: false};   //TODO: add more parameters for each microbit (ex: whether or not it's already paired)
        microbit[key] = value.id['name']; //uuid: user-chosen name

        microbitsMessage.microbits.push(microbit);
    });



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
 * Registers successful connection of device to local memory
 * The devices are stored by room id, then by device type,
 * then their respective connection id (uuid v4).
 *
 * Information is also sent to the other server to store reference.
 *
 * @param roomID ID of room that the device logged in to, unique to room
 * @param type type of device (DeviceType.robot, DeviceType.microbit, DeviceType.browser)
 * @param connection socket connection object
 * @param deviceName device name(s), not necessarily unique
 */
function registerDevice(roomID, type, connection, deviceName) {
    return new Promise(function(resolve) {
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

        console.log('!!!! Devices map: ');
        console.log(devices_map);

        // notify all peppers that a microbit was added on this server
        if (type === deviceType.microbit) {
            alertPeppers(roomID, connection.id.uuid, deviceName, true);
        }

        resolve('done');
    });
}

/**
 * Log a device connected onto another server onto this server's
 * local memory for reference. The devices are stored by room id, then by device type,
 * then their respective connection id (uuid v4), with the value being the device's user-chosen name.
 *
 * @param roomID room ID the device was registered to
 * @param type the deviceType of the registered device (deviceType.microbit or deviceType.robot)
 * @param uuid uuid that the device was associated with when it was registered on the other server
 * @param deviceName name(s) (not necessarily unique) the device was associated with by the user
 */
function registerGlobalDevice(roomID, type, uuid, deviceName) {
    console.log('REGISTERING DEVICE FROM OTHER SERVER');

    if (!secondary_devices.has(roomID)) {
        console.log('Adding new room to secondary devices map');
        let room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
        ]);
        secondary_devices.set(roomID, room_map);
    }
    secondary_devices.get(roomID).get(type).set(uuid, deviceName);

    console.log('UPDATED SECONDARY MAP: ');
    console.log(secondary_devices);
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
 * Handles login attempts of micro:bit.
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

        registerDevice(responseBody.room_id, deviceType.microbit, connection, data.microbit_name).then(
            success => console.log('registerDevice function has been called for microbit:', success)
        )

    });
}


/**
 * Saves Pepper to a room on this server (handshake procedure)
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
        const failedLogin = '900';

        if(responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        } else if (!responseBody) {
            connection.sendUTF('Room is full.');
        } else {
            let names = {robot_name_ja: response['robot_name_ja'],
                robot_name_en: response['robot_name_en']};
            registerDevice(data.room_id, deviceType.robot, connection, names).then(
                success => {
                    let robotInfo = {
                        name: names,
                        room_id: data.room_id,
                        uuid: connection.id['uuid'],
                    };

                    let message = new RedisMessage();
                    message.setMessageType(messageType.addRobot);
                    message.setRoomId(data.room_id);
                    message.setMessage(robotInfo);
                    message.setOrigin(SERVER_ID);

                    publisher.publish('socket', message.toJson());
                    console.log(success, ': sent message to add pepper globally');
                });
        }
    });

}


/**
 * Alerts all Peppers in the same room as the newly added micro:bit
 * that it been added/alerts the other server of the micro:bit's presence for reference.
 *
 * @param roomID room ID of micro:bit that was newly registered with registerDevice()
 * @param uuid the value of the ID the micro:bit is uniquely mapped to assigned during registerDevice()
 * @param name (s) of the micro:bit assigned to by the user
 * @param broadcast true for alerting other server (micro:bit was added to this server), false to just alert
 *        peppers on the server this function is called.
 */
function alertPeppers(roomID, uuid, name, broadcast){

    // what the other server will get about this microbit's information
    let microbitInfo = {uuid: uuid, name: name, room_id:roomID};

    if(devices_map.has(roomID)){
        // alert on this server
        devices_map.get(roomID).get(deviceType.robot).forEach((value) => {
            value.sendUTF('This is how we would alert all the Peppers! If only I knew how to exactly...');
            value.sendUTF(JSON.stringify(microbitInfo))
        });
    }


    if (broadcast) {
        let message = new RedisMessage();
        message.setMessageType(messageType.addMicrobit);
        message.setRoomId(roomID);
        message.setMessage(microbitInfo);
        message.setOrigin(SERVER_ID);

        console.log('PUBLISHING MESSAGE FROM INSIDE ALERT PEPPERS: ');

        publisher.publish('socket', message.toJson());
    }
}


