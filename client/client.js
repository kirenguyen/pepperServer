const MicrobitLoginMessage = require('../messages/microbit-login-message');
const RoboConnectorMessage = require('../messages/robo-connector-message');

const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
const socket = new WebSocket('ws://ec2-3-112-203-97.ap-northeast-1.compute.amazonaws.com:3000', 'rb');

// // Server 1
// const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');
//
// // Server 2
// const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');


// Connection opened
socket.addEventListener('open', function (event) {
    const loginMessage = new MicrobitLoginMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');
    loginMessage.setMicrobitName('kirererere');
    let jsonMessage = loginMessage.build().toJson();
    console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);

    // const roboMessage = new RoboConnectorMessage();
    // roboMessage.setRoomId(1);
    // roboMessage.setUserId(129);
    // roboMessage.setMessageType(messageType.handshake);
    // roboMessage.setMessage('no message');
    // roboMessage.setRobotId('');
    // let jsonMessage = roboMessage.build().toJson();
    // socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server: ');
    console.log(' >> ' + event.data);
});

