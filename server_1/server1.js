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
const publisher = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
const subscriber = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
subscriber.subscribe('socket');

publisher.on('error', function (err) {
    console.log('Publisher error:  ' + String(err));
});
subscriber.on('error', function (err) {
    console.log('Subscriber error: ' + String(err));
});

// Devices connected to this server
const devices_map = new Map();

// Devices connected to the other servers
const secondary_devices = new Map();

let server = http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Just sent the headers');
}).listen(SERVER_PORT, function () {
    console.log('Server 1 listening on port: ' + SERVER_PORT);
    serverStartCleanup();
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
 * Sends a message to other server that this server has just (re)started
 * to clear cache of any devices that may have once been registered to this server.
 *
 */
function serverStartCleanup(){
    let message = new RedisMessage();
    message.setOrigin(SERVER_ID);
    message.setMessageType(messageType.serverStart);
    publisher.publish('socket', message.toJson());
}

/**
 * Called upon client connection attempt
 */
wss.on('request', function (req) {
    if (!originIsAllowed(req.origin)) {
        req.reject();
        console.log((new Date()) + ' Connection from origin ' + req.origin + ' rejected.');
        return;
    }

    let connection = req.accept('rb', req.origin);
    connection.webSocketKey = req.httpRequest.headers["sec-websocket-key"];

    connection.on('message', function (message) {
        console.log('MESSAGE RECEIVED FROM CLIENT');
        let data = parseJSON(message.utf8Data);
        if (!data) {
            return false;
        }

        switch (data['message_type']) {
            case messageType.login:
                login(data, connection);
                break;
            case messageType.handshake:
                handshake(data, connection);
                break;
            case messageType.action:
                break;
            case messageType.pairing:
                pairLocalDevice(data, connection);
                break;
            case messageType.requestMicrobits:
                requestAllMicrobits(connection);
                break;
            case messageType.unpairDevice:
                unpairLocalDevice(connection);
                break;
            default:
                console.log('Websocket message that failed to meet a case: ');
                console.log(data);
                break;
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        console.log('desc: ' + description);

        // if this connection was registered before disconnection
        if (connection.hasOwnProperty('id')) {
            if(connection.id.paired) {
                unpairLocalDevice(connection);
            }

            unregisterLocalDevice(connection);

            // send message to other servers to remove device from cache
            let message = new RedisMessage();
            message.setMessageType(messageType.removeDevice);
            message.setRoomId(connection.id.room_id);
            message.setOrigin(SERVER_ID);
            let deviceInfo = {uuid: connection.id.uuid, device_type: connection.id.device_type,
                room_id: connection.id.room_id};
            message.setMessage(deviceInfo);
            publisher.publish('socket', message.toJson());
        }

        try {
            // don't do POST request for micro:bits
            if(connection.id.device_type === deviceType.microbit){
                return true;
            }

            // disconnect a robot from the cloud storage
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
                console.log('!!!!!!!!!!!!!!!!!!!!!!cutting connection!!!!!!!!!!!!!!!!!!!!!!!!')
                console.log('Cutting robots connection; BODY (unparsed):');
                console.log(body);
            });
        } catch (err) {
            console.log('Disconnecting a robot from the server failed');
            console.log(err);
        }
    });
});


/**
 * All messages received by subscriber must be children of 'RedisMessage' class.
 */
subscriber.on('message', function (channel, message) {
    let msgObject = parseJSON(message);

    switch (msgObject.message_type) {
        case messageType.serverStart:
            if (msgObject.origin !== SERVER_ID) {
                // initialize to new empty map after other server's startup
                console.log('RESETTING SECONDARY DEVICE MAP');
                secondary_devices.clear();
            }
            break;
        case messageType.addMicrobit:
            if (msgObject.origin === SERVER_ID) {
                console.log('RECEIVED REQUEST TO ADD MICROBIT FROM OG SERVER');
            } else {
                registerGlobalDevice(msgObject.origin, msgObject.room_id, deviceType.microbit, msgObject.message['uuid'],
                    msgObject.message['name']);
                alertPeppers(msgObject.room_id, msgObject.message['uuid'],
                    msgObject.message['name'], false);
            }
            break;
        case messageType.addRobot:
            if (msgObject.origin === SERVER_ID) {
                console.log('RECEIVED REQUEST TO ADD ROBOT FROM OG SERVER');
            } else {
                registerGlobalDevice(msgObject.origin, msgObject.room_id, deviceType.robot, msgObject.message['uuid'],
                    msgObject.message['name'])
            }
            break;
        case messageType.finishPairing:
            if (msgObject.origin !== SERVER_ID) {
                pairGlobalDevice(msgObject.room_id, msgObject.message['device_type'],
                    msgObject.message['uuid'], msgObject.message['paired_uuid']);
            }
            break;
        case messageType.finishUnpairing:
            if (msgObject.origin !== SERVER_ID) {
                unpairGlobalDevice(msgObject.room_id, msgObject.message['device_type'], msgObject.message['uuid']);
            }
            break;
        case messageType.removeDevice:
            // unregister device connected to other server
            if (msgObject.origin !== SERVER_ID){
                unregisterGlobalDevice(msgObject.message.room_id, msgObject.message['device_type'],
                    msgObject.message['uuid']);
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
function registerLocalDevice(roomID, type, connection, deviceName) {
    return new Promise(function (resolve) {
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
            paired: false,
            paired_uuid: null,
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
 * local memory for reference. The devices are stored by server id, room id, then by device type,
 * then their respective connection id (uuid v4), with the value being the device's user-chosen name.
 *
 * @param serverID the server that the device was originally connected to
 * @param roomID room ID the device was registered to
 * @param type the deviceType of the registered device (deviceType.microbit or deviceType.robot)
 * @param uuid uuid that the device was associated with when it was registered on the other server
 * @param deviceName name(s) (not necessarily unique) the device was associated with by the user
 */
function registerGlobalDevice(serverID, roomID, type, uuid, deviceName) {

    if (!secondary_devices.has(roomID)) {
        console.log('Adding new room to secondary devices map');
        let room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
        ]);
        secondary_devices.set(roomID, room_map);
    }

    // newly instantiate all of the same data as what is stored in the connection object locally
    let deviceInfo = {
        device_type: type,
        uuid: uuid,
        name: deviceName,
        paired: false,
        paired_uuid: null,
    };

    secondary_devices.get(roomID).get(type).set(uuid, deviceInfo);

    console.log('UPDATED SECONDARY MAP for the server of the registered device: ');
    console.log(secondary_devices);
}

/**
 * Unregisters device's connection from local memory upon closing of connection.
 * @param connection websocket connection object that was previously registered
 */
function unregisterLocalDevice(connection) {
    try{
        devices_map.get(connection.id.room_id).get(connection.id.device_type).delete(connection.id.uuid);
        console.log('REMOVED LOCAL CONNECTION FROM MEM: ');
        console.log(devices_map);
    } catch (error) {
        console.log('Error in trying to remove device from local memory.');
        console.log(error);
    }
}

/**
 * Removes device connected to a different server from this server's local reference
 * @param roomID id of the room of device to remove
 * @param type type of device to remove
 * @param uuid uuid v4 associated with device at connection time
 */
function unregisterGlobalDevice(roomID, type, uuid) {
    console.log('TRYING TO UNREGISTER DEVICE GLOBALLY');
    console.log(roomID, type, uuid);
    console.log(secondary_devices);
    try {
        secondary_devices.get(roomID).get(type).delete(uuid);
        console.log('SUCCESSFULLY UNREGISTERED SECONDARY DEVICE. Updated secondary_map for the server relating to registered device: ');
        console.log(secondary_devices);
    } catch (error) {
        console.log('Error in trying to remove device from secondary map.')
        console.log(error);
    }
}

/**
 * Updates device/connection that requested to be unpaired, and propagates the unpair request across the different servers.
 *
 * @param connection the registered connection of the device that requested to be unpaired
 * @return boolean TODO
 */
function unpairLocalDevice(connection){
    try{
        let oppositeType;
        let robotID;
        let microbitID;
        if (connection.id.device_type === deviceType.robot){
            oppositeType = deviceType.microbit;
            robotID = connection.id.uuid;
            microbitID = connection.id.paired_uuid;
        } else {
            oppositeType = deviceType.robot;
            robotID = connection.id.paired_uuid;
            microbitID = connection.id.uuid;
        }

        // clear the memory of the paired device as well
        unpairGlobalDevice(connection.id.room_id, oppositeType, connection.id.paired_uuid);

        connection.id.paired = false;
        connection.id.paired_uuid = null;

        console.log('UNPAIRED LOCAL CONNECTION FROM MEM: ');
        console.log(devices_map);

        let pairMsg = new RedisMessage();
        pairMsg.setOrigin(SERVER_ID);
        pairMsg.setMessageType(messageType.finishUnpairing);
        pairMsg.setRoomId(connection.id.room_id);
        let robotUpdateInfo = {uuid: robotID,
            room_id: connection.id.room_id,
            device_type: deviceType.robot};
        pairMsg.setMessage(robotUpdateInfo);

        // update all the robots across servers to show this pair
        publisher.publish('socket', pairMsg.toJson());

        // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
        let microbitUpdateInfo = {uuid: microbitID,
            room_id: connection.id.room_id,
            device_type: deviceType.microbit};
        pairMsg.setMessage(microbitUpdateInfo);
        publisher.publish('socket', pairMsg.toJson());

        //TODO: API call?? pair up the robots and microbits?

    } catch (error) {
        console.log('Error in trying to unpair device from local memory.');
        console.log(error);
    }
}

/**
 * Cleans a device's pairing from memory after a(nother) device requested to be unpaired.
 *
 * @param roomID the room where the device requested to be unpaired (same as room of paired device)
 * @param type the type of the device that is to be cleared from pairing
 * @param uuid the UUID of the device that is to be cleared from pairing
 */
function unpairGlobalDevice(roomID, type, uuid){
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            let connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.paired = false;
            connection.id.paired_uuid = false;

            console.log('SUCCESSFULLY CLEANED UP PAIRING on devices_map: ');
            console.log(devices_map);
            return true;
        }
    }

    if (secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            let info = secondary_devices.get(roomID).get(type).get(uuid);
            info.paired = false;
            info.paired_uuid = false

            secondary_devices.get(roomID).get(type).set(uuid, info);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on secondary_devices map');
            console.log(secondary_devices);

        } else {
            console.log("UNABLE TO UNPAIR SECOND DEVICE FOR SOME REASON");
        }
    }

}

/**
 * Asserts that the target Micro:Bit for pairing is available
 * @param roomID the room of the device that requested to be paired
 * @param microbitUUID the target UUID of the Micro:Bit to be paired
 * @return boolean true if the Micro:Bit is available for pairing, false otherwise
 */
function checkValidPairing(roomID, microbitUUID) {
    if (devices_map.get(roomID).get(deviceType.microbit).has(microbitUUID)){
        return !devices_map.get(roomID).get(deviceType.microbit).get(microbitUUID).id.paired;
    } else if (secondary_devices.get(roomID).get(deviceType.microbit).has(microbitUUID)){
        return !secondary_devices.get(roomID).get(deviceType.microbit).get(microbitUUID).paired;
    } else {
        return false;
    }
}

/**
 *  Robot on this server wants to pair with a Micro:Bit in the room, send notice to all servers
 *  to update pairing upon success.
 *
 *  @param data Pepper's message contents (RoboMessage)
 *  @param connection Pepper's registered connection that requested to pair with a Micro:Bit
 *  @return boolean false if the target device cannot be paired, true if successful
 *          //TODO: consider sending a more refined failed connection
 */
function pairLocalDevice(data, connection) {
    try{

        if (!checkValidPairing(connection.id.room_id, data.microbit_id)){
            connection.sendUTF('Selected Micro:Bit is not available to be paired with');
            return false;
        }

        connection.id.paired = true;
        connection.id.paired_uuid = data.microbit_id;

        // register that the Micro:Bit is now paired to this Pepper
        pairGlobalDevice(connection.id.room_id, deviceType.microbit, connection.id.paired_uuid, connection.id.uuid);

        console.log('PAIRED LOCAL CONNECTION FROM MEM: ');
        console.log(devices_map.get(connection.id.room_id).get(deviceType.robot).get(connection.id.uuid));
        console.log(devices_map.get(connection.id.room_id).get(deviceType.robot).get(connection.id.uuid) === connection);

        let pairMsg = new RedisMessage();
        pairMsg.setOrigin(SERVER_ID);
        pairMsg.setMessageType(messageType.finishPairing);
        pairMsg.setRoomId(connection.id.room_id);
        let robotUpdateInfo = {paired_uuid: connection.id.paired_uuid, uuid: connection.id.uuid,
            room_id: connection.id.room_id,
            device_type: deviceType.robot};
        pairMsg.setMessage(robotUpdateInfo);

        // update all the robots across servers to show this pair
        publisher.publish('socket', pairMsg.toJson());


        // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
        let microbitUpdateInfo = {uuid: connection.id.paired_uuid, paired_uuid: connection.id.uuid,
            room_id: connection.id.room_id,
            device_type: deviceType.microbit};
        pairMsg.setMessage(microbitUpdateInfo);
        publisher.publish('socket', pairMsg.toJson());

        //TODO: API call?? pair up the robots and microbits?

    } catch (error) {
        console.log('Error in trying to pair device on this servers local memory.');
        console.log(error);
    }
}

/**
 * Finishes up pairing by updating the correct pairs in the local memory.
 * @param roomID the roomID of the device pair
 * @param type deviceType of the device to be updated
 * @param uuid the UUID of the device to update its pairing
 * @param paired_uuid the UUID of the device it will be paired with
 *
 */
function pairGlobalDevice(roomID, type, uuid, paired_uuid){
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            let connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.paired = true;
            connection.id.paired_uuid = paired_uuid;

            console.log('SUCCESSFULLY UPDATED PAIRING on devices_map: ');
            console.log(devices_map);
            return true;
        }
    }

    if (secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            let info = secondary_devices.get(roomID).get(type).get(uuid);
            info.paired = true;
            info.paired_uuid = paired_uuid;

            secondary_devices.get(roomID).get(type).set(uuid, info);

            console.log('SUCCESSFULLY UPDATED PAIRING on secondary_devices map');
            console.log(secondary_devices);
        }
    }
    else {
        console.log("UNABLE TO SUCCESSFULLY PAIR DEVICE FOR SOME REASON");
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
    request.post(options, function (error, response, body) {
        if (error) {
            console.error(error);
        }

        responseBody = parseJSON(body);
        // console.log('Parsed POST body:');
        // console.log(responseBody);

        const failedLogin = '900';
        if (!responseBody || responseBody.result === failedLogin) {
            console.log('Failed to authenticate: ' + body);
            return false;
        }

        registerLocalDevice(responseBody.room_id, deviceType.microbit, connection, data.microbit_name).then(
            success => console.log('registerLocalDevice function has been called for microbit:', success)
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
    if (data['device_type'] !== deviceType.robot) {
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

        if (responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        } else if (!responseBody) {
            connection.sendUTF('Room is full.');
            return false;
        }

        console.log('ROBOT HANDSHAKE TIMEEEEEEEEEEEEE');
        console.log(responseBody);

        let names = {
            robot_name_ja: response['robot_name_ja'],
            robot_name_en: response['robot_name_en']
        };

        console.log(names);

        registerLocalDevice(data.room_id, deviceType.robot, connection, names).then(
            success => {
                let robotInfo = {
                    name: names,
                    room_id: data.room_id,
                    uuid: connection.id.uuid,
                    paired: false,
                    paired_uuid: null,
                };

                let message = new RedisMessage();
                message.setMessageType(messageType.addRobot);
                message.setRoomId(data.room_id);
                message.setMessage(robotInfo);
                message.setOrigin(SERVER_ID);

                publisher.publish('socket', message.toJson());
                console.log(success, ': sent message to add Pepper globally');
            });

    });
}

/**
 * Sends list of microbits to the Pepper that requested the list; Pepper and Micro:Bits will all be in the same room.
 *
 * @param connection the websocket connection object of Pepper that sent the request for all Microbits
 * @return object with room id and list of microbit info objects; format is as following:
 *  { room_id: <var> ,                       // room ID of the microbits returned (same as the room Pepper is in)
 *    microbit_list: [{
 *          uuid: <uuid version 4>          // uuid assigned to the microbit when it connected to a server
 *          name: <string>                  // user chosen name
 *          paired: true || false           // whether or not the microbit is already paired
 *          paired_uuid: <uuid version 4 if a device is paired to it, null otherwise>,
 *      }, ... ... ]
 *   }
 */
function requestAllMicrobits(connection) {
    let data = {
        room_id: connection.id.room_id,
        microbit_list: [],
    };

    // Collect all microbits on this server in the same room as connection.id.room_id
    if (devices_map.has(connection.id.room_id)) {
        devices_map.get(connection.id.room_id).get(deviceType.microbit).forEach((value) => {
            // value is the connection object stored after registration of microbit
            data.microbit_list.push({
                uuid: value.id.uuid,
                name: value.id.name,
                paired: value.id.paired,
                paired_uuid: value.id.paired_uuid,
            });
        });
    }

    // Collect all microbits from other servers in the same room
    if(secondary_devices.has(connection.id.room_id)) {
        secondary_devices.get(connection.id.room_id).get(deviceType.microbit).forEach((microbit) => {
            data.microbit_list.push({
                uuid: microbit.uuid,
                name: microbit.name,
                paired: microbit.paired,
                paired_uuid: microbit.paired_uuid,
            });
        });
    }

    connection.sendUTF(JSON.stringify(data));
    console.log('REQUEST FOR ALL MICROBITS PROCESSED: ');
    console.log(JSON.stringify(data));
    return data;
}



/////////////////////// MISC FUNCTIONS /////////////////////////////



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
 * Alerts all Peppers in the same room as the *newly* added micro:bit
 * that it been added/alerts the other server of the micro:bit's presence for reference.
 *
 * @param roomID room ID of micro:bit that was newly registered with registerLocalDevice()
 * @param uuid the value of the ID the micro:bit is uniquely mapped to assigned during registerLocalDevice()
 * @param name (s) of the micro:bit assigned to by the user
 * @param broadcast true for alerting other server (micro:bit was added to this server), false to just alert
 *        peppers on the server this function is called.
 */
function alertPeppers(roomID, uuid, name, broadcast) {

    // what the other server will instantiate for this newly added microbit
    let microbitInfo = {uuid: uuid, name: name, room_id: roomID, paired: false, paired_uuid: null};

    if (devices_map.has(roomID)) {
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

        publisher.publish('socket', message.toJson());
    }
}

