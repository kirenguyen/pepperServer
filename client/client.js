const MicrobitLoginMessage = require('../messages/microbit-login-message');
const RoboConnectorMessage = require('../messages/robo-connector-message');

const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

// Create WebSocket connection.
// Server 1
const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

// Server 2
// const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

const msg = document.getElementById('msg');
const box = document.getElementById('box');



// Connection opened
socket.addEventListener('open', function (event) {
    console.log('CONNECTION MADE');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server: ');
    console.log(' >> ' + event.data);
});


function createMicrobit(name) {
    const loginMessage = new MicrobitLoginMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');   //all joining room 1
    loginMessage.setMicrobitName(name);
    let jsonMessage = loginMessage.build().toJson();
    console.log('MESSAGE TO SEND FROM CLIENT: ' + jsonMessage);
    socket.send(jsonMessage);
}

function createPepper() {
    const roboMessage = new RoboConnectorMessage();
    roboMessage.setRoomId(1);
    roboMessage.setUserId(129);
    roboMessage.setMessageType(messageType.handshake);
    roboMessage.setMessage('no message');
    roboMessage.setRobotId('');
    let jsonMessage = roboMessage.build().toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

function requestMicrobits(){
    const roboMessage = new RoboConnectorMessage();
    roboMessage.setRoomId(1);
    roboMessage.setUserId(name);
    roboMessage.setMessageType(messageType.microbitRequest);
    roboMessage.setMessage('no message');
    roboMessage.setRobotId('');
    let jsonMessage = roboMessage.build().toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

msg.addEventListener('keydown', e => {
    console.log(e.key);

    if(e.key === "Enter") {
        createMicrobit(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added microbit with name: ' + msg.value;
        box.appendChild(paragraph);
        msg.value = '';
    }
    if(e.key === "=") {
        createPepper();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added Pepper with name: ' + msg.value;
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === "`") {
        requestMicrobits();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Requested list of microbits!';
        box.appendChild(paragraph);
        msg.value = '';
    }
});


