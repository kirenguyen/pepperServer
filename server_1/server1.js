const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require("redis");
const SERVER_ID = 'SERVER_ONE';

const RedisMessage = require('../messages/redis-publisher-message');
const uuidv4 = require("uuid/v4");

const domain = 'https://roboblocks.xyz/';
const messageConstants = require('../messages/message-constants');

const DeviceParameters = require('../device_parameters');
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

// Devices connected to the other server
const secondary_devices = new Map();

const server = http.createServer(function (request, response) {
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
function serverStartCleanup() {
    const message = new RedisMessage();
    message.setOrigin(SERVER_ID);
    message.setMessageType(messageType.serverStart);
    publisher.publish('socket', message.toJSON());
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

    const connection = req.accept('rb', req.origin);
    connection.webSocketKey = req.httpRequest.headers["sec-websocket-key"];

    connection.on('message', function (message) {
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
            case messageType.requestMicrobits:
                requestAllMicrobits(connection);
                break;
            case messageType.pairDevice:
                pairLocalDevice(data, connection);
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

        // if this connection was registered before disconnection
        if (connection.hasOwnProperty('id')) {
            if(connection.id.paired) {
                unpairLocalDevice(connection);
            }

            unregisterLocalDevice(connection);

            // send message to other servers to remove device from cache
            const message = new RedisMessage();
            message.setMessageType(messageType.removeDevice);
            message.setRoomId(connection.id.room_id);
            message.setOrigin(SERVER_ID);
            message.setMessage(connection.id.toJSON());  // DeviceParameter of device to be removed
            publisher.publish('socket', message.toJSON());

        } else {
            console.log('This connection was not set up with a device');
            return false;
        }

        try {
            // don't do POST request for micro:bits (yet)
            if(connection.id.device_type === deviceType.microbit){
                return true;
            }

            // disconnect a robot from the cloud storage
            const url = domain + 'project/node/delete_user';
            const options = {
                uri: url,
                headers: {
                    "Content-type": "application/x-www-form-urlencoded",
                },
                form: {
                    "socket_id": connection.webSocketKey
                }
            };
            request.post(options, function (error, response, body) {
                console.log('!!!!!!!!!!!!!!!!!!!!!!cutting connection!!!!!!!!!!!!!!!!!!!!!!!!');
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
            if (msgObject.origin !== SERVER_ID) {
                registerGlobalDevice(msgObject.message);
                alertPeppers(msgObject.room_id, msgObject.message['uuid'],
                    msgObject.message['name'], false);
            }
            break;
        case messageType.addRobot:
            if (msgObject.origin !== SERVER_ID) {
                registerGlobalDevice(msgObject.message);
            }
            break;
        case messageType.finishPairing:
            if (msgObject.origin !== SERVER_ID) {
                pairGlobalDevice(msgObject.message);
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
                unregisterGlobalDevice(msgObject.message);
            }
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
 * then by a new respective connection id (uuid v4).
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
        if (!devices_map.has(roomID)) {
            const room_map = new Map([
                [deviceType.robot, new Map()],
                [deviceType.microbit, new Map()],
            ]);
            devices_map.set(roomID, room_map);
        }

        //identifying information to unregister device on closing
        connection.id = new DeviceParameters();
        connection.id.setRoomID(roomID);
        connection.id.setName(deviceName);
        connection.id.setDeviceType(type);
        connection.id.setUUID(uuidv4());

        devices_map.get(roomID).get(type).set(connection.id.uuid, connection);

        console.log('!!!! Devices map after registering local device: ');
        console.log(devices_map);

        // notify all peppers that a microbit was added on this server
        if (type === deviceType.microbit) {
            alertPeppers(connection.id, true);
        }
        resolve('done');
    });
}

/**
 * Log a device connected onto another server onto this server's
 * local memory for reference. The devices are stored by server id, room id, then by device type,
 * then their respective connection id (uuid v4), with the value being the device's user-chosen name.
 *
 * @param params DeviceParams object describing the device to be registered into the server's cache
 */
function registerGlobalDevice(params) {
    console.log(params);
    console.log(typeof params);


    if (!secondary_devices.has(params.room_id)) {
        console.log('Adding new room to secondary devices map');
        const room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
        ]);
        secondary_devices.set(params.room_id, room_map);
    }
    // newly instantiate all of the same data as what is stored in the connection object locally
    secondary_devices.get(params.room_id).get(params.device_type).set(params.uuid, params);

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
        console.log('REMOVED LOCAL CONNECTION FROM MEMORY:');
        console.log(devices_map);
    } catch (error) {
        console.log('Error in trying to remove device from local memory.');
        console.log(error);
    }
}

/**
 * Removes device connected to a different server from this server's local reference
 * @param params the DeviceParameter object of the device to be removed from the local memory
 */
function unregisterGlobalDevice(params) {
    try {
        secondary_devices.get(params.room_id).get(params.device_type).delete(params.uuid);
        console.log('SUCCESSFULLY UNREGISTERED SECONDARY DEVICE. Updated secondary_map for the server relating to registered device: ');
        console.log(secondary_devices);
    } catch (error) {
        console.log('Error in trying to remove device from secondary map.');
        console.log(error);
    }
}

/**
 * Updates device/connection that requested to be unpaired, and propagates the unpair request across the different servers.
 * No effect if the device was not paired to begin with.
 *
 * @param connection the registered connection of the device that requested to be unpaired
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

        connection.id.setPaired(false);
        connection.id.setPairedUUID(null);

        const pairMsg = new RedisMessage();
        pairMsg.setOrigin(SERVER_ID);
        pairMsg.setMessageType(messageType.finishUnpairing);
        pairMsg.setRoomId(connection.id.room_id);
        const robotUpdateInfo = {uuid: robotID,
            room_id: connection.id.room_id,
            device_type: deviceType.robot};

        pairMsg.setMessage(robotUpdateInfo);

        // update all the robots across servers to show this pair
        publisher.publish('socket', pairMsg.toJSON());

        // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
        const microbitUpdateInfo = {uuid: microbitID,
            room_id: connection.id.room_id,
            device_type: deviceType.microbit};
        pairMsg.setMessage(microbitUpdateInfo);
        publisher.publish('socket', pairMsg.toJSON());

        //TODO: API call?? unpair the robots and microbits?

    } catch (error) {
        console.log('Error in trying to unpair device from local memory.');
        console.log(error);
    }
}

/**
 * Cleans a device's pairDevice from memory after a(nother) device requested to be unpaired.
 * No effect if the device was not paired to begin with.
 *
 * @param roomID the room where the device requested to be unpaired (same as room of paired device)
 * @param type the type of the device that is to be cleared from pairDevice
 * @param uuid the UUID of the device that is to be cleared from pairDevice
 */
function unpairGlobalDevice(roomID, type, uuid){
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            const connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.setPaired(false);
            connection.id.setPairedUUID(null);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on devices_map');
            // console.log(connection);
            return true;
        }
    }

    if (secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            const info = secondary_devices.get(roomID).get(type).get(uuid);
            info.setPaired(false);
            info.setPairedUUID(null);

            secondary_devices.get(roomID).get(type).set(uuid, info);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on secondary_devices map');
            // console.log(info);
        } else {
            console.log("UNABLE TO UNPAIR SECOND DEVICE FOR SOME REASON");
        }
    }
}

/**
 * Asserts that a device is available for pairDevice
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param targetUUID the UUID of the device to be paired to
 * @return boolean true if the Micro:Bit is available for pairDevice, false otherwise
 */
function checkValidPairing(roomID, type, targetUUID) {
    if (devices_map.get(roomID).get(type).has(targetUUID)){
        return !devices_map.get(roomID).get(type).get(targetUUID).id.paired;
    } else if (secondary_devices.get(roomID).get(type).has(targetUUID)){
        return !secondary_devices.get(roomID).get(type).get(targetUUID).paired;
    } else {
        return false;
    }
}

/**
 *  Robot on this server wants to pair with a Micro:Bit in the room, send notice to all servers
 *  to update pairDevice upon success.
 *
 *  @param data Pepper's message contents (RoboMessage)
 *  @param connection Pepper's registered connection that requested to pair with a Micro:Bit
 *  @return boolean false if the target device cannot be paired, true if successful
 */
function pairLocalDevice(data, connection) {
    try{
        // check if the micro:bit is free
        if (!checkValidPairing(connection.id.room_id, deviceType.microbit, data.microbit_id)){
            connection.sendUTF('Selected Micro:Bit is not available to be paired with');
            console.log('The selected Micro:Bit is already paired');
            return false;
        }

        // check if this Pepper is free
        if (!checkValidPairing(connection.id.room_id, deviceType.robot, connection.id.uuid)){
            connection.sendUTF('Pepper is already paired! Please unpair first before attempting again');
            console.log('Pepper is already paired with a Micro:Bit. Please unpair first before attempting again');
            return false;
        }

        connection.id.setPaired(true);
        connection.id.setPairedUUID(data.microbit_id);

        // register that the Micro:Bit is now paired to this Pepper
        pairGlobalDevice(connection.id);

        console.log('PAIRED LOCAL CONNECTION FROM MEM');
        console.log('CHECKING that the map entry is equivalent to the updated connection after pairDevice');
        console.log(devices_map.get(connection.id.room_id).get(deviceType.robot).get(connection.id.uuid) === connection);

        const pairMessage = new RedisMessage();
        pairMessage.setOrigin(SERVER_ID);
        pairMessage.setMessageType(messageType.finishPairing);
        pairMessage.setRoomId(connection.id.room_id);
        pairMessage.setMessage(connection.id.toJSON()); // Pepper's deviceParameters

        // update all the robots across servers to show this pair
        publisher.publish('socket', pairMessage.toJSON());

        // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
        const microbitUpdate = new DeviceParameters();
        microbitUpdate.setUUID(connection.id.paired_uuid);
        microbitUpdate.setPairedUUID(connection.id.uuid);
        microbitUpdate.setDeviceType(deviceType.microbit);
        microbitUpdate.setRoomID(connection.id.room_id);

        pairMessage.setMessage(microbitUpdate);
        publisher.publish('socket', pairMessage.toJSON());

        //TODO: API call?? pair up the robots and microbits?

        return true;
    } catch (error) {
        console.log('Error in trying to pair device on this servers local memory.');
        console.log(error);
    }
}

/**
 * Finishes up pairDevice by updating the correct pairs in the local memory.
 * @param params the DeviceParameters of the Pepper that sent the pair request
 * @return boolean true if successful pairDevice, false otherwise
 */
function pairGlobalDevice(params) {
    const roomID = params.room_id;
    const type = params.device;
    const uuid = params.uuid;
    const pairedUUID = params.paired_uuid;

    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            const connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.setPaired(true);
            connection.id.setPairedUUID(pairedUUID);

            console.log('SUCCESSFULLY UPDATED PAIRING on devices_map!');
            // console.log(connection);
            return true;
        }
    }

    if (secondary_devices.has(roomID)) {
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            const info = secondary_devices.get(roomID).get(type).get(uuid);
            info.setPaired(true);
            info.setPairedUUID(pairedUUID);

            secondary_devices.get(roomID).get(type).set(uuid, info);

            console.log('SUCCESSFULLY UPDATED PAIRING on secondary_devices map!');
            // console.log(info);
            return true;
        }
    }
    else {
        console.log("UNABLE TO SUCCESSFULLY PAIR DEVICE FOR SOME REASON");
        return false;
    }
}


/**
 * Handles login attempts of micro:bit.
 * @param data message object of micro:bit containing device_type, room_id, microbit_name, password, etc.
 * @param connection socket connection object
 */
function login(data, connection) {
    const body = {
        'room_name': data.room_name,
        'password': data.password,
    };

    const options = {
        uri: domain + 'project/login',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        form: body
    };

    request.post(options, function (error, response, body) {
        if (error) {
            console.error(error);
        }

        const responseBody = parseJSON(body);

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

    const body = {
        "room_id": data.room_id,
        "user_id": data.user_id,
        "socket_id": connection.webSocketKey,
        "device_type": data.device_type,
        "robot_id": data.robot_id
    };

    const options = {
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

        const responseBody = parseJSON(body);
        const failedLogin = '900';

        if (responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        } else if (!responseBody) {
            connection.sendUTF('Room is full.');
            return false;
        }

        const names = {
            robot_name_ja: responseBody['robot_name_ja'],
            robot_name_en: responseBody['robot_name_en']
        };

        registerLocalDevice(data.room_id, deviceType.robot, connection, names).then(
            success => {

                const message = new RedisMessage();
                message.setMessageType(messageType.addRobot);
                message.setRoomId(data.room_id);
                message.setMessage(connection.id.toJSON());  // DeviceParameters of the object to register globally
                message.setOrigin(SERVER_ID);

                publisher.publish('socket', message.toJSON());
                console.log(success, ': sent message to add Pepper globally');
            });

    });
}

/**
 * Sends list of microbits to the Pepper that requested the list; Pepper and Micro:Bits will all be in the same room.
 *
 * @param connection the websocket connection object of Pepper that sent the request for all Microbits
 * @return object with room id and list of microbit info objects; format is as following:
 *  { room_id: <var> ,                      // room ID of the microbits returned (same as the room Pepper is in)
 *    microbit_list: [{
 *          roomID: <var>                   // roomID that this microbit is in
 *          uuid: <uuid version 4>          // uuid assigned to the microbit when it connected to a server
 *          name: <string>                  // user chosen name
 *          paired: true || false           // whether or not the microbit is already paired
 *          paired_uuid: <uuid version 4 if a device is paired to it, null otherwise>,
 *      }, ... ... ]
 *   }
 *
 *   microbit_list will be filled with multiple DeviceParameter objects describing the Micro:Bit.
 */
function requestAllMicrobits(connection) {
    const data = {
        room_id: connection.id.room_id,
        microbit_list: [],
    };

    // Collect all microbits on this server in the same room as connection.id.room_id
    if (devices_map.has(connection.id.room_id)) {
        devices_map.get(connection.id.room_id).get(deviceType.microbit).forEach((value) => {
            // value is the connection object stored after registration of microbit
            console.log(typeof value.id);
            data.microbit_list.push(value.id);
        });
    }

    // Collect all microbits from other servers in the same room
    if(secondary_devices.has(connection.id.room_id)) {
        secondary_devices.get(connection.id.room_id).get(deviceType.microbit).forEach((microbit) => {
            data.microbit_list.push(microbit);
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
 * @returns JSON object if data was parsable, nothing otherwise
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
 * @param params DeviceParameters object describing the Micro:Bit that was just added
 * @param broadcast true for alerting other server (micro:bit was added to this server), false to just alert
 *        peppers on the server this function is called.
 *
 */
function alertPeppers(params, broadcast) {
    if (devices_map.has(params.room_id)) {
        // alert on this server
        devices_map.get(params.room_id).get(deviceType.robot).forEach((connection) => {
            connection.sendUTF('Alerting Peppers in room of new Microbit added!');
            connection.sendUTF(params.toJSON())
        });
    }

    if (broadcast) {
        const message = new RedisMessage();
        message.setMessageType(messageType.addMicrobit);
        message.setRoomId(params.room_id);
        message.setMessage(params.toJSON());
        message.setOrigin(SERVER_ID);

        publisher.publish('socket', message.toJSON());
    }
}