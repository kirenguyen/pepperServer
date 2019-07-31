const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const redis = require('redis');
const SERVER_ID = 'SERVER_ONE';

const RedisMessage = require('../messages/redis-message');

const domain = 'https://roboblocks.xyz/';
const messageConstants = require('../messages/message-constants');

const DeviceParameters = require('../device_parameters');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;
const stringParams = messageConstants.stringParameters;
const SERVER_PORT = 3000;

const REDIS_PORT = 6379;
const REDIS_ENDPOINT = 'roboblocks-dev-001.pv4tra.0001.use2.cache.amazonaws.com';
const publisher = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
const subscriber = redis.createClient(REDIS_PORT, REDIS_ENDPOINT);
const REDIS_CHANNEL = 'testing-socket';
subscriber.subscribe(REDIS_CHANNEL);

publisher.on('error', function (err) {
    console.log('Publisher error:  ' + String(err));
});
subscriber.on('error', function (err) {
    console.log('Subscriber error: ' + String(err));
});


// Peppers and Micro:Bits connected to this server; contains connections where connection.id == DeviceParameter class objects
const devices_map = new Map();

// Devices connected to the other server; contains DeviceParameter class objects
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

        if (!connection.hasOwnProperty('id')){
            if (data.message_type !== messageType.login && data.message_type !== messageType.handshake) {
                console.log('Cannot perform action for connection that has not registered and is attempting to perform an action');
                return false;
            }
        }

        switch (data.message_type) {
            case messageType.login:
                validateMicrobitLogin(data, connection);
                break;
            case messageType.handshake:
                handshake(data, connection);
                break;
            case messageType.requestMicrobits:
                const microbitList = requestAllMicrobits(connection, messageType.requestMicrobits);
                connection.sendUTF(JSON.stringify(microbitList));
                console.log(microbitList);
                break;
            case messageType.requestPeppers:
                const pepperList = requestAllPeppers(connection);
                connection.sendUTF(JSON.stringify(pepperList));
                console.log(pepperList);
                break;
            case messageType.action:
                //send the ENTIRE message, not just the embedded message
                receivedActionMessage(data, connection);
                break;
            case messageType.pairDevice:
                pairLocalDevice(data.target_id, connection);
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
                    'socket_id': connection.webSocketKey,
                }
            };
            request.post(options, function (error, response, body) {
                console.log('!!!!!!!!!!!!!!!!!!!!!!cutting connection!!!!!!!!!!!!!!!!!!!!!!!!');
                console.log(body);
            });
        } catch (err) {
            console.log('Disconnecting a device from the server failed');
            console.log(err);
            connection.sendUTF(failedResponse(connection.id.device_type, 'Disconnecting a device from the server failed',
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
        case messageType.action:
            forwardActionMessage(msgObject.message);
            break;
        case messageType.sendACKMessage:
            sendACKMessage(msgObject.message);
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
                unpairGlobalDevice(msgObject.room_id, msgObject.message['device_type'], msgObject.message['device_id']);
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
 * then by a respective connection id (websocket key)
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
                [deviceType.browser, new Map()]
            ]);
            devices_map.set(stringRoomID, room_map);
        }

        //identifying information to unregister device on closing
        connection.id = new DeviceParameters();
        connection.id.setRoomID(stringRoomID);
        connection.id.setName(deviceName);
        connection.id.setDeviceType(type);
        connection.id.setDeviceID(connection.webSocketKey);

        devices_map.get(stringRoomID).get(type).set(connection.id.device_id, connection);

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
 * then their respective connection id (websocket key), with the value being the device's user-chosen name.
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
            [deviceType.browser, new Map()]
        ]);
        secondary_devices.set(roomID, room_map);
    }

    const deviceInfo = new DeviceParameters();
    deviceInfo.setDeviceType(params.device_type);
    deviceInfo.setRoomID(roomID);
    deviceInfo.setDeviceID(params.device_id);
    deviceInfo.setName(params.name);

    // newly instantiate all of the same data as what is stored in the connection object locally
    secondary_devices.get(roomID).get(params.device_type).set(params.device_id, deviceInfo);

    console.log('UPDATED SECONDARY MAP for the server of the registered device: ');
    console.log(secondary_devices);
}


/**
 * Unregisters device's connection from local memory upon closing of connection.
 * @param connection websocket connection object that was previously registered
 */
function unregisterLocalDevice(connection) {
    try{
        devices_map.get(connection.id.room_id).get(connection.id.device_type).delete(connection.id.device_id);
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
        secondary_devices.get(params.room_id).get(params.device_type).delete(params.device_id);
        console.log('SUCCESSFULLY UNREGISTERED SECONDARY DEVICE. ' +
            'Updated secondary_map for the server relating to registered device: ');
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
    const oppositeType = connection.id.paired_type;
    const oppositeID = connection.id.paired_id;

    // do not attempt unpairing if both devices are not paired
    if (!checkIfPaired(connection.id.room_id, connection.id.device_type, connection.id.device_id) ||
        !checkIfPaired(connection.id.room_id, oppositeType, oppositeID)){
        connection.sendUTF(failedResponse(connection.id.device_type,
            'This device is not in a valid pairing', messageType.unpairDevice));
        console.log('This device is not in a valid pairing');
        return false;
    }

    // clear the memory of the paired device first
    unpairGlobalDevice(connection.id.room_id, oppositeType, oppositeID);

    connection.id.setPaired(false);
    connection.id.setPairedType(null);
    connection.id.setPairedID(null);

    console.log('Unpaired device that sent unpair request.');

    const pairMsg = new RedisMessage();
    pairMsg.setOrigin(SERVER_ID);
    pairMsg.setMessageType(messageType.unpairDevice);
    pairMsg.setRoomId(connection.id.room_id);
    const connectionUpdateInfo = {
        device_id: connection.id.device_id,
        room_id: connection.id.room_id,
        device_type: connection.id.device_type,
    };

    // update the server to clear connection's pairing
    pairMsg.setMessage(connectionUpdateInfo);
    publisher.publish(REDIS_CHANNEL, pairMsg.toJSON());

    // update servers to clear pair (reverse the paired device_id's/type)
    const oppositeInfo = {
        device_id: oppositeID,
        room_id: connection.id.room_id,
        device_type: oppositeType,
    };
    pairMsg.setMessage(oppositeInfo);
    publisher.publish(REDIS_CHANNEL, pairMsg.toJSON());

    if(connection.id.device_type === deviceType.browser || oppositeType === deviceType.browser){
        console.log('Done, no need to use API to finish unpairing since pair is with a browser');
        return true;
    }

    let robotWebsocketKey;
    let microbitWebsocketKey;
    if (connection.id.device_type === deviceType.robot){
        robotWebsocketKey = connection.id.device_id;
        microbitWebsocketKey = oppositeID;
    } else if (connection.id.device_type === deviceType.microbit) {
        robotWebsocketKey = oppositeID;
        microbitWebsocketKey = connection.id.device_id;
    }

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

        sendUnpairMessage(connection);

        if (responseBody.result === failedLogin) {
            console.log('Failed deletion of pair ' + body);
            return false;
        }

    });
    return true;
}

/**
 * Cleans a device's partner/pair from memory after a(nother) device requested to be unpaired.
 * No effect if the device was not paired to begin with.
 *
 * @param roomID the room where the device requested to be unpaired (same as room of paired device)
 * @param type the type of the device that is to be cleared from partner
 * @param deviceID the id of the device that is to be cleared from partner
 * @return boolean true if successful unpairing, false otherwise
 */
function unpairGlobalDevice(roomID, type, deviceID){
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(deviceID)) {
            const connection = devices_map.get(roomID).get(type).get(deviceID);
            connection.id.setPaired(false);
            connection.id.setPairedID(null);
            connection.id.setPairedType(null);

            sendUnpairMessage(connection);
            console.log('SUCCESSFULLY CLEANED UP PAIRING on devices_map');
            return true;
        }
    }
    if (secondary_devices.has(roomID)){
        if (secondary_devices.get(roomID).get(type).has(deviceID)) {
            const info = secondary_devices.get(roomID).get(type).get(deviceID);
            info.setPaired(false);
            info.setPairedID(null);
            info.setPairedType(null);

            console.log('SUCCESSFULLY CLEANED UP PAIRING on secondary_devices map');
            return true;
        }
    }
    console.log('!!!!!!!!! Unsuccessfully attempted to unpair global device');
    return false;
}


/**
 * Return the status of a device's pairing, if it exists
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param deviceID the ID of the device to check
 * @return boolean true if the Micro:Bit is paired, false if ID doesn't exist or is paired
 */
function checkIfPaired(roomID, type, deviceID) {
    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(deviceID)){
            return devices_map.get(roomID).get(type).get(deviceID).id.paired;
        }
    }
    if(secondary_devices.has(roomID)) {
        if (secondary_devices.get(roomID).get(type).has(deviceID)){
            return secondary_devices.get(roomID).get(type).get(deviceID).paired;
        }
    }
    return false;
}


/**
 * Asserts that a device assigned to the id exists and is logged in the local memory.
 *
 * @param roomID the room of the device that requested to be paired
 * @param type the deviceType of the target device
 * @param deviceID the id of the device to check if it exists
 * @return boolean true if the device exists, false otherwise
 */
function checkDeviceExists(roomID, type, deviceID) {
    if(devices_map.has(roomID)) {
        console.log('room exists');
        console.log(devices_map.get(roomID));
        if (devices_map.get(roomID).get(type).has(deviceID)){
            return true;
        }
    }
    if(secondary_devices.has(roomID)){
        console.log('room exists in 2nd map');
        console.log(secondary_devices.get(roomID));
        if (secondary_devices.get(roomID).get(type).has(deviceID)){
            return true;
        }
    }
    return false;
}


/**
 *  Pepper or Browser on this server wants to pair with a device in the room, send notice to all servers
 *  to update pairDevice upon success.
 *
 *  @param targetID ID of device to be paired with the connection
 *  @param connection Browser or Pepper's registered connection that requested to pair with a Micro:Bit
 *  @return boolean false if the target device cannot be paired, true if successful
 */
function pairLocalDevice(targetID, connection) {

    if(connection.id.device_type === deviceType.microbit){
        console.log('Error: Tried to initiate connection from a device that does not initiate pairing (Micro:Bit)');
        connection.sendUTF(failedResponse(connection.id.device_type,'This device cannot initiate a pairing', messageType.pairDevice));
        return false;
    }

    // check if the device that wishes to create a pairing is free
    if (checkIfPaired(connection.id.room_id, connection.id.device_type, connection.id.device_id)){
        console.log('Device requesting to pair is already paired. Please unpair first before attempting again');
        connection.sendUTF(failedResponse(connection.id.device_type, 'Device of type: ' + connection.id.device_type + ' is already paired. ' +
            'Please unpair before attempting to connect again', messageType.pairDevice));
        return false;
    }

    // Browser --> Robot, Robot --> Micro:Bit, select target type and ID accordingly
    const targetDeviceType = connection.id.device_type === deviceType.robot ? deviceType.microbit : deviceType.robot;

    // check if the device that wishes to get paired to exists
    if(!checkDeviceExists(connection.id.room_id, targetDeviceType, targetID)){
        console.log('Attempted to connect to an invalid target device ID');
        connection.sendUTF(failedResponse(connection.id.device_type, 'Attempted to connect to an invalid target device ID', messageType.pairDevice));
        return false;
    }

    // check if the target device is unpaired
    if (checkIfPaired(connection.id.room_id, targetDeviceType, targetID)){
        console.log('The selected target device is already paired, type: ' + targetDeviceType);
        connection.sendUTF(failedResponse(connection.id.device_type, 'The selected target device of type: ' + targetDeviceType + ', is already paired',
            messageType.pairDevice));
        return false;
    }

    connection.id.setPaired(true);
    connection.id.setPairedType(targetDeviceType);
    connection.id.setPairedID(targetID);

    // switch the ID/Paired ID to update the other device in this pair
    const updateTargetDevice = new DeviceParameters();
    updateTargetDevice.setDeviceID(connection.id.paired_id);
    updateTargetDevice.setPairedID(connection.id.device_id);
    updateTargetDevice.setRoomID(connection.id.room_id);
    updateTargetDevice.setPairedType(connection.id.device_type);
    updateTargetDevice.setDeviceType(targetDeviceType);

    // register that the targetDevice is now paired to this Pepper with the correct information
    pairGlobalDevice(updateTargetDevice);

    const pairMessage = new RedisMessage();
    pairMessage.setOrigin(SERVER_ID);
    pairMessage.setMessageType(messageType.pairDevice);
    pairMessage.setRoomId(connection.id.room_id);

    // update all the devices of type (connection.id.device_type) across servers
    pairMessage.setMessage(connection.id.build()); // Connection device's deviceParameters
    publisher.publish(REDIS_CHANNEL, pairMessage.toJSON());

    // update all the target devices across servers (reversed the paired id's/type)
    pairMessage.setMessage(updateTargetDevice.build());
    publisher.publish(REDIS_CHANNEL, pairMessage.toJSON());

    //only call API if it's Pepper --> Micro:Bit pairing
    if(connection.id.device_type === deviceType.robot) {
        const body = {
            'room_id': connection.id.room_id,
            'socket_id': connection.id.paired_id, //websocket key of paired Micro:Bit
            'robot_id': connection.id.device_id,
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
    }
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
    const device_id = params.device_id;
    const pairedID = params.paired_id;
    const pairedType = params.paired_type;

    if(devices_map.has(roomID)) {
        if (devices_map.get(roomID).get(type).has(device_id)) {
            const connection = devices_map.get(roomID).get(type).get(device_id);
            connection.id.setPaired(true);
            connection.id.setPairedType(pairedType);
            connection.id.setPairedID(pairedID);

            sendPairMessage(connection);
            return true;
        }
    }

    if (secondary_devices.has(roomID)) {
        if (secondary_devices.get(roomID).get(type).has(device_id)) {
            const info = secondary_devices.get(roomID).get(type).get(device_id);
            info.setPaired(true);
            info.setPairedID(pairedID);
            info.setPairedType(pairedType);

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
 * Takes Micro:Bit login object and asserts that it has a correctly formatted
 */
function validateMicrobitLogin(data, connection){
    assertValidLoginParameters(data, connection).then(
        success => login(data, connection),
    ).catch(
        failure => console.log('Message sent from Micro:Bit was improperly formatted')
    )
}

/**
 * Handles login attempts of micro:bit, which is a combination of TWO API calls.
 * @param loginObject parsed JSON object of micro:bit's login message that has been validated
 * @param connection socket connection object of Pepper logging in
 */
function login(loginObject, connection) {

    let body = {
        'room_name': loginObject.room_name,
        'password': loginObject.room_pass,
    };

    console.log('Login body: ');
    console.log(body);

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

        sendMicrobitLoginResponse(connection, responseBody);

        const failedLogin = '900';
        if (!responseBody || responseBody.result === failedLogin) {
            console.log('Failed to authenticate: ' + body);
            return false;
        }


        registerLocalDevice(responseBody.room_id, deviceType.microbit, connection, loginObject.user_name).then(
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
                    connection.sendUTF(failedResponse(connection.id.device_type,'Micro:Bit handshake failed',
                        messageType.login));
                    return false;
                }

                return true;
            });
        });
    });
}


/**
 * Saves Pepper or browser to a room on this server (handshake procedure)
 *
 * @param data parsed message object sent from Pepper of type RoboMessage
 * @param connection socket connection object
 */
function handshake(data, connection) {

    const stringRoomID = data.room_id.toString();

    console.log(data);
    console.log('----------------');

    // check that the robot the browser wants to connect to is free
    if (data.device_type === deviceType.browser){
        let paired = checkIfPaired(stringRoomID, deviceType.robot, data.robot_id);
        let exists = checkDeviceExists(stringRoomID, deviceType.robot, data.robot_id);
        if( paired ||!exists ){
            console.log(paired, exists);
            connection.sendUTF(failedResponse(deviceType.browser, 'The Pepper is invalid or already paired. Check robot_id or room_id,'), messageType.handshake);
            return false;
        }
    }


    const deviceCode = data.device_type === deviceType.robot ? 1 : 0;

    const body = {
        'room_id': stringRoomID,
        'user_id': data.user_id,
        'socket_id': connection.webSocketKey,
        'device_type': deviceCode,   //legacy device_type code for robot/browser for login
        'robot_id': data.robot_id,
    };

    console.log(body);

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

        if (!body && data.device_type === deviceType.robot) {
            connection.sendUTF('room is full.');
            return false;
        } else if (!body) {
            connection.sendUTF(body);
            return false;
        }

        const responseBody = parseJSON(body);
        const failedLogin = '900';

        connection.sendUTF(body);   //send back Flower names or legacy error response
        console.log(responseBody);

        if (responseBody.result === failedLogin) {
            console.log('Failed handshake ' + body);
            return false;
        }

        // names will be empty for browser log-in
        let names = {};
        Object.keys(responseBody).forEach(function (key) {
            if(key.startsWith('robot_name')){
                names[key] = responseBody[key];
            }
        });


        registerLocalDevice(stringRoomID, data.device_type, connection, names).then(
            success => {
                const message = new RedisMessage();
                message.setMessageType(messageType.handshake);
                message.setRoomId(data.room_id);
                message.setMessage(connection.id.build());  // DeviceParameters class object to register globally; build into object
                message.setOrigin(SERVER_ID);

                publisher.publish(REDIS_CHANNEL, message.toJSON());

                // Browser automatically pairs to data.robot_id at handshake time via /save_user
                if (data.device_type === deviceType.browser) {
                    pairLocalDevice(data.robot_id, connection);
                }
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
 *          device_id: <websocket key>      // id assigned to the microbit when it connected to a server === the websocket key
 *          name: <string>                  // user chosen name
 *          paired: true || false           // whether or not the microbit is already paired
 *          paired_id: <websocket key of Pepper paired to it, null otherwise>,
 *          paired_type: deviceType this device is paired to
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


/**
 * Acquires list of Peppers from map call to send it to device that requested it
 * @param connection Browser connection that requested this list of Peppers
 */
function requestAllPeppers(connection){
    const data = {
        result: '000',
        room_id: connection.id.room_id,
        pepper_list: [],
    };

    // Collect all microbits on this server in the same room as connection.id.room_id
    if (devices_map.has(connection.id.room_id)) {
        devices_map.get(connection.id.room_id).get(deviceType.robot).forEach((value) => {
            // value is the connection object stored after registration of microbit
            data.pepper_list.push(value.id.build());
        });
    }

    // Collect all microbits from other servers in the same room
    if(secondary_devices.has(connection.id.room_id)) {
        secondary_devices.get(connection.id.room_id).get(deviceType.robot).forEach((pepper) => {
            data.pepper_list.push(pepper.build());
        });
    }
    return data;
}


/**
 * Device sent an 'action message', forward it to paired Device.
 * @param data object sent from Micro:Bit, Pepper, or Browser to their respective pair
 * @param connection device's registered connection
 */
function receivedActionMessage(data, connection) {
    if(!connection.id.paired){
        console.log('Device is not paired properly, cannot send an action command');
        connection.sendUTF(failedResponse(connection.id.device_type,
            'Device is not paired, cannot send an action', messageType.action));
        return false;
    }

    if(connection.id.device_type === deviceType.robot && connection.id.paired_type === deviceType.microbit){
        connection.sendUTF(failedResponse(connection.id.device_type,
            'Pepper cannot send an action message to its paired device (a Micro:Bit)', messageType.action));
        return false;
    }

    const message = new RedisMessage();
    message.setRoomId(connection.id.room_id);
    message.setMessageType(messageType.action);
    message.setOrigin(SERVER_ID);

    const messageContents = {
        room_id: connection.id.room_id,
        device_id: connection.id.device_id,
        device_type: connection.id.device_type,
        message: createActionMessageObject(data, connection),//TODO: make sure all action messages are ENTIRELY sent and/or parse Micro:Bit's action message
        paired_id: connection.id.paired_id,
        paired_type: connection.id.paired_type,
    };

    message.setMessage(messageContents);
    publisher.publish(REDIS_CHANNEL, message.toJSON());
}


/**
 * Handles Redis Published command to forward an Action message to the appropriate Pepper
 * @param data message object pubbed from Micro:Bit.
 *
 *  connection = connection that originally sent the action message
 *  messageContents = {
 *       room_id: connection.id.room_id,
 *       device_id: connection.id.device_id,
 *       device_type: connection.id.device_type,
 *       message: the action message
 *       paired_id: connection.id.paired_id,
 *       paired_type: connection.id.paired_type,
 *   }
 */
function forwardActionMessage(data){
    console.log(data);

    //check only devices_map
    let found = false;
    if(devices_map.has(data.room_id)){
        if(devices_map.get(data.room_id).get(data.paired_type).has(data.paired_id)){
            found = true;
        }
    }

    if(!found) {
        console.log('Paired microbit sent action, paired Pepper not on this server');
        return false;
    }

    console.log('Device paired to Micro:Bit is connected to this server, performing action!');
    devices_map.get(data.room_id).get(data.paired_type).get(data.paired_id).sendUTF(JSON.stringify(data.message));

    // only send ACK response if Micro:Bit sent action message
    if(data.device_type === deviceType.robot || data.device_type === deviceType.browser){
        return true;
    }

    // send ACK message back to acknowledge that everything went fine
    const message = new RedisMessage();
    message.setMessageType(messageType.sendACKMessage);
    message.setRoomId(data.room_id);
    message.setMessage({
        device_id: data.device_id,
        device_type: data.device_type,
        room_id: data.room_id,
        message: 'ACK_RESPONSE', //TODO: possibly change this, this is what is sent to Micro:Bit/Browser
    });

    message.setOrigin(SERVER_ID);
    publisher.publish(REDIS_CHANNEL, message.toJSON());
}


/**
 * Finishes the action message process by sending an ACK message to the device that originally sent the
 * action message.
 * @param data the message contents pubbed
 *  {
 *       device_id: the ID of the device that originally sent the Action message
 *       device_type: device type of device that originally sent the Action message
 *       room_id: room ID of the device that originally sent the Action message
 *   }
 */
function sendACKMessage(data){
    if(devices_map.has(data.room_id)){
        if(devices_map.get(data.room_id).get(data.device_type).has(data.device_id)){
            console.log('SENDING ACK MESSAGE!');
            devices_map.get(data.room_id).get(data.device_type).get(data.device_id).sendUTF(JSON.stringify(data.message));
            return true;
        }
    }
    console.log('Original device that sent the action message not on this server');
}


/**
 * Sends a message to a device that it was paired
 * @param connection registered connection object of device to send paired message to
 */
function sendPairMessage(connection){
    if(connection.id.device_type === deviceType.microbit){
        let message = stringParams.message_type + stringParams.delimiter + messageType.pairDevice + stringParams.param_delimiter +
            stringParams.message + stringParams.delimiter + 'hogehoge' + stringParams.param_delimiter;
        connection.sendUTF(message);
        console.log('Sent successful pairing message to Micro:Bit!');
        return true;
    }
    connection.sendUTF(JSON.stringify({
        result: '000',
        message_type: messageType.pairDevice,
        message: 'This device was just paired.'
    }));
    console.log('Sent successful pairing message to ' + connection.id.device_type);
    return true;
}


/**
 * Sends a message to a device that it was paired
 * @param connection registered connection object of device to send unpaired message to
 */
function sendUnpairMessage(connection){
    if(connection.id.device_type === deviceType.microbit){
        let message = stringParams.message_type + stringParams.delimiter + messageType.unpairDevice + stringParams.param_delimiter +
            stringParams.message + stringParams.delimiter + 'hogehoge' + stringParams.param_delimiter;
        connection.sendUTF(message);
        console.log('Sent successful pairing message to Micro:Bit!');
        return true;
    }

    connection.sendUTF(JSON.stringify({
        result: '000',
        message_type: messageType.unpairDevice,
        message: 'This device was just unpaired.'
    }));
    console.log('Sent successful pairing message to ' + connection.id.device_type);
    return true;
}


/**
 * Sends Micro:Bit a string response of the API call to /login
 * @param connection connection object of Micro:Bit (has not been registered yet; no id/DeviceParameter fields)
 * @param response parsed JSON response object after attempt to log Micro:Bit in
 */
function sendMicrobitLoginResponse(connection, response) {
    let result = '900';
    if(response['result'] === '000'){
        result = '000';
    }

    const message = stringParams.message_type + stringParams.delimiter + messageType.login + stringParams.param_delimiter +
        stringParams.result + stringParams.delimiter + result + stringParams.param_delimiter;
    connection.sendUTF(message);
}




/**
 * Create a JSON object from Micro:Bit's parsed action message and return it to something that matches ActionMessage
 * forwarding capabilities
 * @param data original Action object of device
 * @param connection connection object of Micro:Bit that sent the paired message
 */
function createActionMessageObject(data, connection) {
    // Pepper and Browser do not need to refactor the data
    if(connection.id.device_type !== deviceType.microbit){
        return data;
    }

    //TODO: FINALIZE THIS LATER
    const roboMicrobitSensor = {
        roboMicrobitTemperature: 0,
        roboMicrobitLightLevel: 0,
        roboMicrobitCompassHeading: 0,
        roboMicrobitAccelerometer: {
            x: data['x'],
            y: data['y'],
            z: data['z'],
            a: data['a'],
        },
        roboMicrobitCustomMessage: ''
    };

    return {
        room_id: connection.id.room_id,
        user_id: connection.id.name,
        robot_id: connection.id.paired_id,
        device_type: connection.id.device_type,
        message_type: messageType.action,
        message: {
            namespace: connection.id.device_type,
            event: null,
            values: roboMicrobitSensor,
        }
    };
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
        if(err instanceof SyntaxError) {
            console.log('Data was not a parsable JSON. Attempting to parse string instead');
            return parseMicrobitString(data);
        } else {
            console.log(err);
            throw err;
        }
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
 * @param type deviceType of device that this failed response should be sent to
 * @param message a string description of when, where, or why the request failed
 * @param msgType the messageType of the original request that led to this failure
 * @returns {string} failed response object with failed result code '900'
 */
function failedResponse(type, message, msgType) {
    let failureMessage;
    if (type === deviceType.microbit){
        failureMessage = stringParams.message_type + stringParams.delimiter + msgType + stringParams.param_delimiter +
            stringParams.result + stringParams.delimiter + '900' + stringParams.param_delimiter +
            stringParams.message + stringParams.delimiter + message + stringParams.param_delimiter;
    } else {
        failureMessage = JSON.stringify({
            result: '900',
            failure_message: message,
            message_type: msgType,
        });
    }
    return failureMessage;
}

/**
 * Asserts that a message sent to the server has all necessary parameters for login
 * @param message the object the connection sent that should contain all necessary parameters for login
 * @param connection the connection object that sent the login message
 */
function assertValidLoginParameters(message, connection){
    return new Promise(function(resolve, reject) {
        const paramList = ['room_name', 'room_pass', 'user_name', 'message_type', 'device_type'];
        paramList.forEach(param => {
            if (!message.hasOwnProperty(param)) {
                connection.sendUTF(failedResponse(deviceType.microbit,
                    'Incorrect login message format', messageType.login));
                reject('Login message does not contain param: ' + param);
            }
        });
        resolve();
    });
}


/**
 * @param message string of (param, value) pairs, written with messageConstants.stringParameter values
 * and delimiters
 * @return JSON object if successful parsing
 */
function parseMicrobitString(message) {
    let string = message.toString();
    let parameters = string.split(stringParams.param_delimiter).filter((value) => {
        return value.length > 0;
    });

    const parsedObject = {};
    parameters.forEach((value) => {
        let paramName, paramValue;
        [paramName, paramValue] = value.split(stringParams.delimiter);
        parsedObject[paramName] = paramValue;
    });
    return parsedObject;
}
