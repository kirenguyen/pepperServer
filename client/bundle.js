(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const MicrobitMessage = require('../messages/microbit-message');
const RoboMessage = require('../messages/robo-message');
const BrowserMessage = require('../messages/browser-message');

const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
// Server 1
const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

// Server 2 (LOCKED DONT TOUCH IT)
// const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

// const socket = new WebSocket('ws://roboblocks.xyz:3000', 'rb');


const command = document.getElementById('command');
const log = document.getElementById('log');
const connectPepper = document.getElementById('connect-pepper');
const connectMicrobit = document.getElementById('connect-microbit');
const connectBrowser = document.getElementById('connect-browser');
const pairMicrobit = document.getElementById('pair-microbit');
const unpair = document.getElementById('unpair-device');
const req = document.getElementById('request-microbits');
const leftAButton = document.getElementById('left-button');
const rightBButton = document.getElementById('right-button');




const newline = '\r\n';

// Connection opened
socket.addEventListener('open', function (event) {
    console.log('CONNECTION MADE');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log(event.data);
});


function createBrowser(roomNumber) {
    const browserMessage = new BrowserMessage();
    browserMessage.setRoomId(roomNumber.toString());
    browserMessage.setUserId(129);
    browserMessage.setMessageType(messageType.handshake);
    browserMessage.setMessage('no message');
    browserMessage.setRobotId('');
    let jsonMessage = browserMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

function createMicrobit(name) {
    const loginMessage = new MicrobitMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');   //all joining room 1
    loginMessage.setMicrobitName(name);
    loginMessage.setMessageType(messageType.login);
    let jsonMessage = loginMessage.toJSON();
    // console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);
}

function createPepper(roomNumber) {
    const roboMessage = new RoboMessage();
    roboMessage.setRoomId(roomNumber.toString());
    roboMessage.setUserId(129);
    roboMessage.setMessageType(messageType.handshake);
    roboMessage.setMessage('no message');
    roboMessage.setRobotId('');
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * @param microbitID ID of MicroBit to be paired
 */
function pairDevices(microbitID) {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.pairDevice);
    roboMessage.setTargetID(microbitID);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a paired Pepper/Microbit is on
 */
function unpairDevice() {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.unpairDevice);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a Pepper has already connected with
 */
function requestMicrobits(){
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.requestMicrobits);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

function leftAMicrobitButton(){
    const message = new MicrobitMessage();
    message.setMessageType(messageType.action);
    message.setMessage();
    let jsonMessage = message.toJSON();
    socket.send(jsonMessage);
}

function rightBMicrobitButton(robotID){
    const message = new MicrobitMessage();
    message.setMessageType(messageType.action);
    message.setMessage({
        'room_id': '1',
        'user_id': '129',
        'robot_id': robotID,
        'device_type': 'browser',
        'message_type': 'action',
        'message': {
            'namespace ': 'microbit',
            'event ': 'BUTTON',
            'value': {
                'button': 'B',
                'state': null
            }
        }
    } );
    let jsonMessage = message.toJSON();
    socket.send(jsonMessage);
}



connectPepper.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a room ID for your Pepper' + newline;
        return false;
    }
    createPepper(command.value);
    log.value += 'Added Pepper ' + command.value + newline;
    command.value = '';
});

connectMicrobit.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a name for your Micro:Bit' + newline;
        return false;
    }
    createMicrobit(command.value);
    log.value += 'Added microbit ' + command.value + newline;
    command.value = '';
});

connectBrowser.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a room for your Browser' + newline;
        return false;
    }
    createBrowser(command.value);
    log.value += 'Added browser ' + command.value + newline;
    command.value = '';
});

pairMicrobit.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a Micro:Bit UUID to pair' + newline;
        return false;
    }
    pairDevices(command.value);
    log.value += 'Just attempted pairing with Micro:Bit UUID: ' + command.value + newline;
    command.value = '';
});

unpair.addEventListener('click', e => {
    unpairDevice();
    log.value += 'Tried to unpair device' + newline;
    command.value = '';
});

req.addEventListener('click', e => {
    requestMicrobits();
    log.value += 'Requested list of Micro:Bits' + newline;
    command.value = '';
});

leftAButton.addEventListener('click', e => {
    leftAMicrobitButton();
    log.value = 'Pressed left A button' + newline;
    command.value = '';
});

rightBButton.addEventListener('click', e => {
    rightBMicrobitButton(command.value);
    log.value = 'Pressed right B button' + newline;
    command.value = '';
});

},{"../messages/browser-message":2,"../messages/message-constants":3,"../messages/microbit-message":4,"../messages/robo-message":5}],2:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class BrowserMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            robot_id: null,
            device_type: deviceType.browser,
            target_uuid: null,
            message_type: null,
            message: null,
        }
    }
    setRoomId(roomId) {
        this._message.room_id = roomId;
        return this;
    }
    setUserId(userId) {
        this._message.user_id = userId;
        return this;
    }
    setRobotId(robotId) {
        this._message.robot_id = robotId;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setTargetdUUID(uuid){
        this._message.target_uuid = uuid;
        return this;
    }
    setMessage(message) {
        this._message.message = message;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = BrowserMessage;
},{"./message-constants":3}],3:[function(require,module,exports){
const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',
    requestMicrobits: 'requestMicrobits',

    action: 'action',

    // not to be used by client
    serverStart: 'serverStart',
    connectionClosed: 'connectionClosed',
    sendACKMessage: 'sendACKMessage',
});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;

},{}],4:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class MicrobitMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            microbit_name: null,
            device_type: deviceType.microbit,
            message_type: null,
            message: null,
        }
    }
    setRoomName(roomName) {
        this._message.room_name = roomName;
        return this;
    }
    setPassword(password) {
        this._message.password = password;
        return this;
    }
    setMicrobitName(microbitName) {
        this._message.microbit_name = microbitName;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setMessage(action) {
        this._message.message = action;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = MicrobitMessage;
},{"./message-constants":3}],5:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class RoboMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            robot_id: null,
            target_id: null,              // always null unless messageType === pairDevice
            device_type: deviceType.robot,
            message_type: null,
            message: null
        }
    }
    setRoomId(roomId) {
        this._message.room_id = roomId;
        return this;
    }
    setUserId(userId) {
        this._message.user_id = userId;
        return this;
    }
    setRobotId(robotId) {
        this._message.robot_id = robotId;
        return this;
    }
    setTargetID(uuid) {
        this._message.target_id = uuid;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setMessage(message) {
        this._message.message = message;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = RoboMessage;
},{"./message-constants":3}]},{},[1]);
