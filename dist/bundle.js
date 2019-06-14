(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const MicrobitLoginMessage = require('./microbit-login-message');

// Create WebSocket connection.
const socket = new WebSocket('ws://roboblocks.xyz:3000', 'rb');

// Connection opened
socket.addEventListener('open', function (event) {
    // socket.send("hi hi hi hi hi hi hi hi");
    const loginMessage = new MicrobitLoginMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');
    loginMessage.setDeviceName('kirererere');
    let jsonMessage = loginMessage.build().toJson()
    console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server ', event.data);
});

console.log("bottom of dist script");
},{"./microbit-login-message":3}],2:[function(require,module,exports){
const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
module.exports.deviceType = deviceType;

},{}],3:[function(require,module,exports){
const deviceType = require('./message-constants').deviceType;

class MicrobitLoginMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            device_name: null,
            device_type: deviceType.microbit,
            message_type: 'login'
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
    setDeviceName(microbitName) {
        this._message.device_name = microbitName;
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
},{"./message-constants":2}]},{},[1]);
