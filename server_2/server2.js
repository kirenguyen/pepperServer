const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require('redis');
const SERVER_ID = 'SERVER_TWO';

const RedisMessage = require('../messages/redis-message');
const uuidv4 = require('uuid/v4');

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
const REDIS_CHANNEL = 'socket';
subscriber.subscribe(REDIS_CHANNEL);

publisher.on('error', function (err) {
    console.log('Publisher error:  ' + String(err));
});
subscriber.on('error', function (err) {
    console.log('Subscriber error: ' + String(err));
});

// Devices connected to this server; contains connections where connection.id == DeviceParameter class objects
const devices_map = new Map();

// Devices connected to the other server; contains DeviceParameter class objects
const secondary_devices = new Map();

const server = http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Just sent the headers');
}).listen(SERVER_PORT, function () {
    console.log('Server 2 listening on port: ' + SERVER_PORT);
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
 */
function serverStartCleanup() {
    const message = new RedisMessage();
    message.setOrigin(SERVER_ID);
    message.setMessageType(messageType.serverStart);
    publisher.publish(REDIS_CHANNEL, message.toJSON());
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
    connection.webSocketKey = req.httpRequest.headers['sec-websocket-key'];

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
                const microbitList = requestAllMicrobits(connection, messageType.requestMicrobits);
                connection.sendUTF(JSON.stringify(microbitList));
                console.log(microbitList);
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
            message.setMessageType(messageType.connectionClosed);
            message.setRoomId(connection.id.room_id);
            message.setOrigin(SERVER_ID);
            message.setMessage(connection.id.build());
            publisher.publish(REDIS_CHANNEL, message.toJSON());

        } else {
            console.log('This connection was not set up with a device');
            connection.sendUTF(failedResponse('This connection was not set up with a device',
                messageType.connectionClosed));
            return false;
        }

        try {
            // disconnect device from the cloud storage
            const url = domain + 'project/node/delete_user';
            const options = {
                uri: url,
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                },
                form: {
                    'socket_id': connection.webSocketKey
                }
            };
            request.post(options, function (error, response, body) {
                console.log('!!!!!!!!!!!!!!!!!!!!!!cutting connection!!!!!!!!!!!!!!!!!!!!!!!!');
                console.log(body);
            });
        } catch (err) {
            console.log('Disconnecting a robot from the server failed');
            console.log(err);
            connection.sendUTF(failedResponse('Disconnecting a robot from the server failed',
                messageType.connectionClosed));
        }
    });
});


/**
 * All messages received by subscriber must be children of 'RedisMessage' class.
 */
subscriber.on('message', function (channel, message) {
    if(channel !== REDIS_CHANNEL){
        console.log('Message was not from me! Channel:');
        console.log(channel);
        return false;
    }

    let msgObject = parseJSON(message);

    switch (msgObject.message_type) {
        case messageType.serverStart:
            if (msgObject.origin !== SERVER_ID) {
                // initialize to new empty map after other server's startup
                console.log('RESETTING SECONDARY DEVICE MAP');
                secondary_devices.clear();
            }
            break;
        case messageType.login:
            if (msgObject.origin !== SERVER_ID) {
                registerGlobalDevice(msgObject.message);
            }
            alertPeppers(msgObject.room_id, messageType.login);
            break;
        case messageType.handshake:
            if (msgObject.origin !== SERVER_ID) {
                registerGlobalDevice(msgObject.message);
            }
            break;
        case messageType.pairDevice:
            if (msgObject.origin !== SERVER_ID) {
                pairGlobalDevice(msgObject.message);
            }
            if ( msgObject.message.device_type === deviceType.microbit) {
                alertPeppers(msgObject.room_id, messageType.pairDevice);
            }
            break;
        case messageType.unpairDevice:
            if (msgObject.origin !== SERVER_ID) {
                unpairGlobalDevice(msgObject.room_id, msgObject.message['device_type'], msgObject.message['uuid']);
            }
            if ( msgObject.message.device_type === deviceType.microbit) {
                alertPeppers(msgObject.room_id, messageType.unpairDevice);
            }
            break;
        case messageType.connectionClosed:
            // unregister device connected to other server
            if (msgObject.origin !== SERVER_ID){
                unregisterGlobalDevice(msgObject.message);
            }
            if ( msgObject.message.device_type === deviceType.microbit) {
                alertPeppers(msgObject.room_id, messageType.connectionClosed);
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
        const stringRoomID = roomID.toString();

        if (!devices_map.has(stringRoomID)) {
            const room_map = new Map([
                [deviceType.robot, new Map()],
                [deviceType.microbit, new Map()],
            ]);
            devices_map.set(stringRoomID, room_map);
        }

        //identifying information to unregister device on closing
        connection.id = new DeviceParameters();
        connection.id.setRoomID(stringRoomID);
        connection.id.setName(deviceName);
        connection.id.setDeviceType(type);
        connection.id.setUUID(uuidv4());
        connection.id.setWebsocketKey(connection.webSocketKey);

        devices_map.get(stringRoomID).get(type).set(connection.id.uuid, connection);

        console.log('!!!! Devices map after registering local device: ');
        console.log(devices_map);

        // notify all peppers that a microbit was added on this server
        if (type === deviceType.microbit) {
            const message = new RedisMessage();
            message.setMessageType(messageType.login);
            message.setRoomId(stringRoomID);
            message.setMessage(connection.id.build());
            message.setOrigin(SERVER_ID);

            publisher.publish(REDIS_CHANNEL, message.toJSON());
        }
        resolve('done');
    });
}

/**
 * Log a device connected onto another server onto this server's
 * local memory for reference. The devices are stored by server id, room id, then by device type,
 * then their respective connection id (uuid v4), with the value being the device's user-chosen name.
 *
 * Information will be stored as DeviceParameter object.
 *
 * @param params DeviceParams-like object describing the device to be registered into the server's cache
 */
function registerGlobalDevice(params) {
    let roomID = params.room_id.toString();

    if (!secondary_devices.has(roomID)) {
        console.log('Adding new room to secondary devices map');
        const room_map = new Map([
            [deviceType.robot, new Map()],
            [deviceType.microbit, new Map()],
        ]);
        secondary_devices.set(roomID, room_map);
    }

    const deviceInfo = new DeviceParameters();
    deviceInfo.setDeviceType(params.device_type);
    deviceInfo.setRoomID(roomID);
    deviceInfo.setUUID(params.uuid);
    deviceInfo.setName(params.name);
    deviceInfo.setWebsocketKey(params.websocket_key);

    // newly instantiate all of the same data as what is stored in the connection object locally
    secondary_devices.get(roomID).get(params.device_type).set(params.uuid, deviceInfo);

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
    let oppositeType;
    let robotID;
    let microbitID;
    let robotWebsocketKey;
    let microbitWebsocketKey
    if (connection.id.device_type === deviceType.robot){
        oppositeType = deviceType.microbit;
        robotID = connection.id.uuid;
        microbitID = connection.id.target_uuid;
        robotWebsocketKey = connection.id.webSocketKey;
        microbitWebsocketKey = getWebsocketKey(connection.id.room_id, deviceType.microbit, connection.id.target_uuid);
    } else {
        oppositeType = deviceType.robot;
        robotID = connection.id.target_uuid;
        microbitID = connection.id.uuid;
        robotWebsocketKey = getWebsocketKey(connection.id.room_id, deviceType.robot, connection.id.target_uuid);
        microbitWebsocketKey = connection.id.webSocketKey;
    }

    // do not attempt unpairing if both devices are not paired
    if (!checkIfPaired(connection.id.room_id, deviceType.robot, robotID) ||
        !checkIfPaired(connection.id.room_id, deviceType.microbit, microbitID)){
        connection.sendUTF(failedResponse('This device is not in a valid pair', messageType.unpairDevice));
        return false;
    }

    // clear the memory of the paired device as well
    unpairGlobalDevice(connection.id.room_id, oppositeType, connection.id.target_uuid);

    connection.id.setPaired(false);
    connection.id.setPairedUUID(null);

    console.log('Unpaired device that sent unpair request.');

    const pairMsg = new RedisMessage();
    pairMsg.setOrigin(SERVER_ID);
    pairMsg.setMessageType(messageType.unpairDevice);
    pairMsg.setRoomId(connection.id.room_id);
    const robotUpdateInfo = {uuid: robotID,
        room_id: connection.id.room_id,
        device_type: deviceType.robot};

    pairMsg.setMessage(robotUpdateInfo);

    // update all the robots across servers to show this pair
    publisher.publish(REDIS_CHANNEL, pairMsg.toJSON());

    // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
    const microbitUpdateInfo = {uuid: microbitID,
        room_id: connection.id.room_id,
        device_type: deviceType.microbit};
    pairMsg.setMessage(microbitUpdateInfo);
    publisher.publish(REDIS_CHANNEL, pairMsg.toJSON());

    const body = {
        'room_id': connection.id.room_id,
        'socket_id': microbitWebsocketKey,  //Micro:Bit's websocket
        'robot_id': robotWebsocketKey,
    };

    const options = {
        uri: domain + 'project/node/delete_pair',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
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
            console.log('Failed deletion of pair ' + body);
            return false;
        }
        responseBody['message_type'] = messageType.unpairDevice;
        connection.send(JSON.stringify(responseBody));

    });
    return true;
}

/**
 * Cleans a device's partner/pair from memory after a(nother) device requested to be unpaired.
 * No effect if the device was not paired to begin with.
 *
 * @param roomID the room where the device requested to be unpaired (same as room of paired device)
 * @param type the type of the device that is to be cleared from partner
 * @param uuid the UUID of the device that is to be cleared from partner
 * @return boolean true if successful unpairing, false otherwise
 */
function unpairGlobalDevice(roomID, type, uuid){
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            const connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.setPaired(false);
            connection.id.setPairedUUID(null);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on devices_map');
            return true;
        }
    }
    if (secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            const info = secondary_devices.get(roomID).get(type).get(uuid);
            info.setPaired(false);
            info.setPairedUUID(null);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on secondary_devices map');
            return true;
        }
    }
    console.log('Unsuccessfully attempted to unpair global device');
    return false;
}

/**
 * Grabs the websocket key of the device.
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param targetUUID the UUID of the device to be paired to
 * @return boolean websocket_key if the Micro:Bit is available for pairDevice, false otherwise
 */
function getWebsocketKey(roomID, type, targetUUID) {
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(targetUUID)){
            return devices_map.get(roomID).get(type).get(targetUUID).id.websocket_key;
        }
    }
    if(secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(targetUUID)){
            return secondary_devices.get(roomID).get(type).get(targetUUID).websocket_key;
        }
    }
    return false;
}

/**
 * Return the status of a device's pairing
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param targetUUID the UUID of the device to be paired to
 * @return boolean true if the Micro:Bit is paired, false otherwise
 */
function checkIfPaired(roomID, type, targetUUID) {
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(targetUUID)){
            return devices_map.get(roomID).get(type).get(targetUUID).id.paired;
        }
    }
    if(secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(targetUUID)){
            return secondary_devices.get(roomID).get(type).get(targetUUID).paired;
        }
    }
    return false;
}

/**
 * Asserts that a device assigned to the UUID exists
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param targetUUID the UUID of the device to be paired to
 * @return boolean true if the device exists, false otherwise
 */
function checkDeviceExists(roomID, type, targetUUID) {
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(targetUUID)){
            return true;
        }
    }
    if(secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(targetUUID)){
            return true;
        }
    }
    return false;
}

/**
 *  Pepper on this server wants to pair with a Micro:Bit in the room, send notice to all servers
 *  to update pairDevice upon success.
 *
 *  @param data Pepper's message contents (RoboMessage)
 *  @param connection Pepper's registered connection that requested to pair with a Micro:Bit
 *  @return boolean false if the target device cannot be paired, true if successful
 */
function pairLocalDevice(data, connection) {
    if(connection.id.device_type === deviceType.microbit){
        console.log('Error: Tried to connect a Micro:Bit with a Micro:Bit');
        return false;
    }

    if(!checkDeviceExists(connection.id.room_id, deviceType.microbit, data.microbit_id)){
        console.log('Attempted to connect to an invalid Micro:Bit UUID');
        connection.sendUTF(failedResponse('Attempted to connect to an invalid Micro:Bit UUID', messageType.pairDevice));
        return false;
    }

    // check if the micro:bit is free, grab the microbit websocket ID;
    if (checkIfPaired(connection.id.room_id, deviceType.microbit, data.microbit_id)){
        console.log('The selected Micro:Bit is already paired');
        connection.sendUTF(failedResponse('The selected Micro:Bit is already paired',
            messageType.pairDevice));
        return false;
    }

    // check if this Pepper is free
    if (checkIfPaired(connection.id.room_id, deviceType.robot, connection.id.uuid)){
        console.log('Pepper is already paired with a Micro:Bit. Please unpair first before attempting again');
        connection.sendUTF(failedResponse('Pepper is already paired with a Micro:Bit. ' +
            'Please unpair before attempting to connect again', messageType.pairDevice));
        return false;
    }

    connection.id.setPaired(true);
    connection.id.setPairedUUID(data.microbit_id);

    const updateMicrobit = new DeviceParameters();
    updateMicrobit.setUUID(connection.id.target_uuid);
    updateMicrobit.setPairedUUID(connection.id.uuid);
    updateMicrobit.setRoomID(connection.id.room_id);
    updateMicrobit.setDeviceType(deviceType.microbit);

    // register that the Micro:Bit is now paired to this Pepper with the correct information
    pairGlobalDevice(updateMicrobit);

    console.log('CHECKING that the map entry is equivalent to the updated connection after pairDevice');
    console.log(devices_map.get(connection.id.room_id).get(deviceType.robot).get(connection.id.uuid) === connection);

    const pairMessage = new RedisMessage();
    pairMessage.setOrigin(SERVER_ID);
    pairMessage.setMessageType(messageType.pairDevice);
    pairMessage.setRoomId(connection.id.room_id);
    pairMessage.setMessage(connection.id.build()); // Pepper's deviceParameters

    // update all the robots across servers to show this pair
    publisher.publish(REDIS_CHANNEL, pairMessage.toJSON());

    // update all the microbits across servers to show this pair (reverse the paired uuid's/type)
    const microbitUpdate = new DeviceParameters();
    microbitUpdate.setUUID(connection.id.target_uuid);
    microbitUpdate.setPairedUUID(connection.id.uuid);
    microbitUpdate.setDeviceType(deviceType.microbit);
    microbitUpdate.setRoomID(connection.id.room_id);

    pairMessage.setMessage(microbitUpdate.build());
    publisher.publish(REDIS_CHANNEL, pairMessage.toJSON());

    const microbitKey = getWebsocketKey(connection.id.room_id, deviceType.microbit, data.microbit_id);

    const body = {
        'room_id': connection.id.room_id,
        'socket_id': microbitKey,
        'robot_id': connection.webSocketKey,
    };

    const options = {
        uri: domain + 'project/node/save_pair',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
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
            console.log('Failed pairing ' + body);
            return false;
        }

        responseBody['message_type'] = messageType.pairDevice;
        connection.sendUTF(JSON.stringify(responseBody));
        console.log('successfully paired pepper to a micro:bit');

    });
    return true;
}

/**
 * Finishes up pairDevice by updating the correct pairs in the local memory.
 * @param params the DeviceParameters object of the Device describing how the local memory
 *        will be updated
 * @return boolean true if successful pairDevice, false otherwise
 */
function pairGlobalDevice(params) {
    const roomID = params.room_id;
    const type = params.device_type;
    const uuid = params.uuid;
    const pairedUUID = params.target_uuid;

    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(uuid)) {
            const connection = devices_map.get(roomID).get(type).get(uuid);
            connection.id.setPaired(true);
            connection.id.setPairedUUID(pairedUUID);

            console.log('SUCCESSFULLY UPDATED PAIRING on devices_map!');
            return true;
        }
    }

    if (secondary_devices.has(roomID)) {
        if (secondary_devices.get(roomID).get(type).has(uuid)) {
            const info = secondary_devices.get(roomID).get(type).get(uuid);
            info.setPaired(true);
            info.setPairedUUID(pairedUUID);

            console.log('SUCCESSFULLY UPDATED PAIRING on secondary_devices map!');
            return true;
        }
    }
    else {
        console.log('UNABLE TO SUCCESSFULLY PAIR DEVICE FOR SOME REASON');
        return false;
    }
}


/**
 * Handles login attempts of micro:bit, which is a combination of TWO API calls.
 * @param data message object of micro:bit containing device_type, room_id, microbit_name, password, etc.
 * @param connection socket connection object of Pepper logging in
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

    request.post(options, function (error, response, body) {
        if (error) {
            console.error(error);
            connection.sendUTF(body);
        }

        const responseBody = parseJSON(body);

        const failedLogin = '900';
        if (!responseBody || responseBody.result === failedLogin) {
            console.log('Failed to authenticate: ' + body);
            return false;
        }

        responseBody['message_type'] = messageType.login;
        connection.sendUTF(JSON.stringify(responseBody));   //send Microbit back the API response

        registerLocalDevice(responseBody.room_id, deviceType.microbit, connection, data.microbit_name).then(
            success => {console.log('registerLocalDevice function has been called for microbit:', success)}
        ).then(success => {
            const body = {
                'room_id': connection.id.room_id,
                'user_id': 0,
                'socket_id': connection.webSocketKey,
                'device_type': 2,   //device_type code for Micro:Bit
                'robot_id': 0,
            };

            const options = {
                uri: domain + 'project/node/save_user',
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                },
                form: body
            };
            request.post(options, function (error, response, body) {
                if (error) {
                    console.error(error);
                    connection.sendUTF('database connection failed');
                }

                if (!body) {
                    connection.sendUTF(failedResponse('Micro:Bit handshake failed',
                        messageType.login));
                    return false;
                }

                let responseBody = JSON.parse(body);
                responseBody['message_type'] = messageType.login;

                connection.sendUTF(JSON.stringify(responseBody));   //send Micro:Bit response
            });
        });
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
        'room_id': data.room_id,
        'user_id': data.user_id,
        'socket_id': connection.webSocketKey,
        'device_type': 1,   //legacy device_type code for robot
        'robot_id': data.robot_id
    };

    const options = {
        uri: domain + 'project/node/save_user',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        form: body
    };

    request.post(options, function (error, response, body) {
        if (error) {
            console.error(error);
            connection.sendUTF('database connection failed');
        }

        if (!body) {
            connection.sendUTF('room is full.');
            return false;
        }

        const responseBody = parseJSON(body);
        const failedLogin = '900';

        connection.sendUTF(body);   //send back Flower names or legacy error response

        if (responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        }


        let names = {};
        Object.keys(responseBody).forEach(function (key) {
            if(key.startsWith('robot_name')){
                names[key] = responseBody[key];
            }
        });

        registerLocalDevice(data.room_id, deviceType.robot, connection, names).then(
            success => {

                const message = new RedisMessage();
                message.setMessageType(messageType.handshake);
                message.setRoomId(data.room_id);
                message.setMessage(connection.id.build());  // DeviceParameters class object to register globally; build into object
                message.setOrigin(SERVER_ID);

                publisher.publish(REDIS_CHANNEL, message.toJSON());
            });

    });
}

/**
 * Builds list of microbits to the Pepper that requested the list; Pepper and Micro:Bits will all be in the same room.
 *
 * @param connection the websocket connection object of Pepper that sent the request for all Microbits
 * @param type messageType of the request that triggered this function call
 *
 * @return object with room id and list of microbit info objects; format is as following:
 *  { result: '000',                        // string code for success
 *    room_id: <var> ,                      // room ID of the microbits returned (same as the room Pepper is in)
 *    microbit_list: [{
 *          roomID: <var>                   // roomID that this microbit is in
 *          uuid: <uuid version 4>          // uuid assigned to the microbit when it connected to a server
 *          name: <string>                  // user chosen name
 *          paired: true || false           // whether or not the microbit is already paired
 *          target_uuid: <uuid version 4 of Pepper is paired to it, null otherwise>,
 *      }, ... ... ]
 *   }
 *
 *   microbit_list will be filled with multiple DeviceParameter objects describing the Micro:Bit.
 */
function requestAllMicrobits(connection, type) {
    const data = {
        result: '000',
        message_type: type,
        room_id: connection.id.room_id,
        microbit_list: [],
    };

    // Collect all microbits on this server in the same room as connection.id.room_id
    if (devices_map.has(connection.id.room_id)) {
        devices_map.get(connection.id.room_id).get(deviceType.microbit).forEach((value) => {
            // value is the connection object stored after registration of microbit
            data.microbit_list.push(value.id.build());
        });
    }

    // Collect all microbits from other servers in the same room
    if(secondary_devices.has(connection.id.room_id)) {
        secondary_devices.get(connection.id.room_id).get(deviceType.microbit).forEach((microbit) => {
            data.microbit_list.push(microbit.build());
        });
    }
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
 * Sends Peppers in specified room updated list of Micro:Bits.
 * @param roomID alert Peppers in room with this ID
 * @param msgType the messageType that triggered this alert
 */
function alertPeppers(roomID, msgType) {
    roomID = roomID.toString();
    if (devices_map.has(roomID)) {
        // notifyPepper on this server
        devices_map.get(roomID).get(deviceType.robot).forEach((connection) => {
            connection.sendUTF(JSON.stringify(requestAllMicrobits(connection, msgType)));
        });
    }
}

/**
 * Creates a string JSON failed response to send back if a device failed.
 * @param message a string description of when, where, or why the request failed
 * @param msgType the messageType of the original request that led to this failure
 * @returns {string} failed response object with failed result code '900'
 */
function failedResponse(message, msgType){
    const failureObject = {
        result: '900',
        failure_message: message,
        message_type: msgType,
    };
    return JSON.stringify(failureObject);
}