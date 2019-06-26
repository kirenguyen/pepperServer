(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const MicrobitMessage = require('../messages/microbit-message');
const RoboMessage = require('../messages/robo-message');

const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
// Server 1
// const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

// Server 2 (PERMANENTLY LOCKED DONT TOUCH IT)
// const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

const socket = new WebSocket('ws://roboblocks.xyz:3000', 'rb');


const msg = document.getElementById('msg');
const box = document.getElementById('box');

// Connection opened
socket.addEventListener('open', function (event) {
    console.log('CONNECTION MADE');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log(event.data);
});


function createMicrobit(name) {
    const loginMessage = new MicrobitMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');   //all joining room 1
    loginMessage.setMicrobitName(name);
    loginMessage.setMessageType(messageType.login);
    let jsonMessage = loginMessage.toJSON();
    console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);
}

function createPepper(roomNumber) {
    const roboMessage = new RoboMessage();
    roboMessage.setRoomId(parseInt(roomNumber, 10));
    roboMessage.setUserId(129);
    roboMessage.setMessageType(messageType.handshake);
    roboMessage.setMessage('no message');
    roboMessage.setRobotId('');
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * @param microbitUUID UUID of MicroBit to be paired
 */
function pairDevices(microbitUUID) {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.pairDevice);
    roboMessage.setMicrobitId(microbitUUID);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a paired Pepper/Microbit is on
 */
function unpairDevice() {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.unpairDevice);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a Pepper has already connected with
 */
function requestMicrobits(){
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.requestMicrobits);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

msg.addEventListener('keydown', e => {
    console.log(e.key);
    if(e.key === 'Enter') {
        createMicrobit(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added microbit with name: ' + msg.value + '    ';
        box.appendChild(paragraph);
        msg.value = '';
    }
    if(e.key === 'Tab') {
        createPepper(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added Pepper  ';
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === 'Control') {
        requestMicrobits();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = ' requested microbits';
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === '=') {
        pairDevices(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Just attempted pairing with microbit UUID: ' + msg.value;
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === '-'){
        unpairDevice();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Just attempted to disconnect pair connections';
        box.appendChild(paragraph);
        msg.value = '';

    }
});

},{"../messages/message-constants":2,"../messages/microbit-message":3,"../messages/robo-message":4}],2:[function(require,module,exports){
const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',
    requestMicrobits: 'requestMicrobits',

    // not to be used by client
    addMicrobit: 'addMicrobit',
    addRobot: 'addRobot',
    notifyPepper: 'notifyPepper',
    finishPairing: 'finishPairing',
    finishUnpairing: 'finishUnpairing',
    removeDevice: 'removeDevice',
    serverStart: 'serverStart',
});



module.exports.deviceType = deviceType;
module.exports.messageType = messageType;

},{}],3:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;

class MicrobitMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            microbit_name: null,
            device_type: deviceType.microbit,
            message_type: null,
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
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = MicrobitMessage;
},{"./message-constants":2}],4:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class RoboMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            robot_id: null,
            microbit_id: null,              // always null unless messageType === pairDevice
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
    setMicrobitId(microbitId) {
        this._message.microbit_id = microbitId;
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
},{"./message-constants":2}]},{},[1]);
