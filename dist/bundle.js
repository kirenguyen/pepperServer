(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const MicrobitLoginMessage = require('./microbit-login-message');
const RoboConnectorMessage = require('./robo-connector-message');

const messageConstants = require('./message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
const socket = new WebSocket('ws://ec2-13-113-153-136.ap-northeast-1.compute.amazonaws.com:3000', 'rb');
// const socket = new WebSocket('ws://ec2-13-231-5-239.ap-northeast-1.compute.amazonaws.com:3000', 'rb');


// Connection opened
socket.addEventListener('open', function (event) {
    // socket.send("hi hi hi hi hi hi hi hi");
    const loginMessage = new MicrobitLoginMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');
    loginMessage.setMicrobitName('kirererere');
    let jsonMessage = loginMessage.build().toJson();
    console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);

    // const roboMessage = new RoboConnectorMessage();
    // roboMessage.setRoomId('1');
    // roboMessage.setUserId(0);
    // roboMessage.setMessageType(messageType.handshake);
    // roboMessage.setMessage('no message');
    // roboMessage.setRobotId('');
    // let jsonMessage = roboMessage.build().toJson();
    // console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    // socket.send(jsonMessage);
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server ' + event.data);
});

console.log("bottom of dist script");
},{"./message-constants":2,"./microbit-login-message":3,"./robo-connector-message":4}],2:[function(require,module,exports){
const deviceType = Object.freeze({robot: 1, microbit: 2, browser: 3});
const messageType = Object.freeze({login: 1, handshake: 2, action: 3, microbitRequest: 4, microbitAction: 5});



module.exports.deviceType = deviceType;
module.exports.messageType = messageType;

},{}],3:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;

class MicrobitLoginMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            microbit_name: null,
            device_type: deviceType.microbit,
            message_type: messageType.login
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
    build() {
        return this;
    }
    toJson(){
        return JSON.stringify(this._message);
    }
}
module.exports = MicrobitLoginMessage;
},{"./message-constants":2}],4:[function(require,module,exports){
const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;

class RoboConnectorMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            robot_id: null,
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
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setMessage(message) {
        this._message.message = message;
        return this;
    }
    build() {
        return this;
    }
    toJson(){
        return JSON.stringify(this._message);
    }
}
module.exports = RoboConnectorMessage;
},{"./message-constants":2}]},{},[1]);
