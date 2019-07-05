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
