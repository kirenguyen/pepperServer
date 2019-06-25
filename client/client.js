const MicrobitMessage = require('../messages/microbit-message');
const RoboMessage = require('../messages/robo-message');

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
    const loginMessage = new MicrobitMessage();
    loginMessage.setRoomName('room1');
    loginMessage.setPassword('test1234');   //all joining room 1
    loginMessage.setMicrobitName(name);
    loginMessage.setMessageType(messageType.login);
    let jsonMessage = loginMessage.toJson();
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
    let jsonMessage = roboMessage.toJson();
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
    let jsonMessage = roboMessage.toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a paired Pepper/Microbit is on
 */
function unpairDevice() {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.unpairDevice);
    let jsonMessage = roboMessage.toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * Needs to be called on the same connection that a Pepper has already connected with
 */
function requestMicrobits(){
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.requestMicrobits);
    let jsonMessage = roboMessage.toJson();
    socket.send(jsonMessage);
    console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

msg.addEventListener('keydown', e => {
    if(e.key === 'Enter') {
        createMicrobit(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added microbit with name: ' + msg.value + '    ';
        box.appendChild(paragraph);
        msg.value = '';
    }
    if(e.key === '1') {
        createPepper();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Added Pepper  ';
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === '2') {
        let data = requestMicrobits();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = JSON.stringify(data);
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === '3') {
        pairDevices(msg.value);
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Just attempted pairing with microbit UUID: ' + msg.value;
        box.appendChild(paragraph);
        msg.value = '';
    }

    if(e.key === '4'){
        unpairDevice();
        let paragraph = document.createElement('paragraph');
        paragraph.textContent = 'Just attempted to disconnect pair connections';
        box.appendChild(paragraph);
        msg.value = '';

    }
});
