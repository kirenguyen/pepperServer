const MicrobitLoginMessage = require('./microbit-login-message');
const RoboConnectorMessage = require('./robo-connector-message');

const messageConstants = require('./message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
// const socket = new WebSocket('ws://ec2-13-113-153-136.ap-northeast-1.compute.amazonaws.com:3000', 'rb');

const socket = new WebSocket('ws://roboblocks.xyz:3000', 'rb');


// Connection opened
socket.addEventListener('open', function (event) {
    // socket.send("hi hi hi hi hi hi hi hi");
    // const loginMessage = new MicrobitLoginMessage();
    // loginMessage.setRoomName('room1');
    // loginMessage.setPassword('test1234');
    // loginMessage.setMicrobitName('kirererere');
    // let jsonMessage = loginMessage.build().toJson();
    // console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    // socket.send(jsonMessage);

    const roboMessage = new RoboConnectorMessage();
    roboMessage.setRoomId(1);
    roboMessage.setUserId(129);
    roboMessage.setMessageType(messageType.handshake);
    roboMessage.setMessage('no message');
    roboMessage.setRobotId('');
    let jsonMessage = roboMessage.build().toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server: ');
    console.log(' >> ' + event.data);
});

