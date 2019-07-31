const MicrobitMessage = require('../messages/microbit-message');
const RoboMessage = require('../messages/robo-message');
const BrowserMessage = require('../messages/browser-message');

const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;
const deviceType = messageConstants.deviceType;
const stringParams = messageConstants.stringParameters;

// Create WebSocket connection.
// Server 1
const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

// Server 2 (LOCKED DONT TOUCH IT)
// const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

// const socket = new WebSocket('ws://roboblocks.xyz:3000', 'rb');


//PPD:
// const socket = new WebSocket('wss://ppd-blocks.softbankrobotics.com/ws');

const command = document.getElementById('command');
const log = document.getElementById('log');
const connectPepper = document.getElementById('connect-pepper');
const connectMicrobit = document.getElementById('connect-microbit');
const connectBrowser = document.getElementById('connect-browser');
const pairMicrobit = document.getElementById('pair-microbit');
const pairPepper = document.getElementById('pair-pepper');
const unpair = document.getElementById('unpair-device');
const reqMicrobits = document.getElementById('request-microbits');
const reqPeppers = document.getElementById('request-peppers');

const microbitAction = document.getElementById('microbit-action');
const pepperAction = document.getElementById('pepper-action');
const browserAction = document.getElementById('browser-action');



const newline = '\r\n';

// Connection opened
socket.addEventListener('open', function (event) {
    console.log('CONNECTION MADE');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log(event.data);
});


function createBrowser(robotID) {
    // const browserMessage = new BrowserMessage();
    // browserMessage.setRoomID('1');
    // browserMessage.setUserID(129);
    // browserMessage.setRobotId(robotID);
    // browserMessage.setMessageType(messageType.handshake);
    // browserMessage.setMessage('no message');
    // let jsonMessage = browserMessage.toJSON();


    let jsonMessage = JSON.stringify({
        device_type: "browser",
        message: {},
        message_type: "handshake",
        robot_id: robotID,
        room_id:"1",
        user_id: "572",
        user_id_mask: null,
    });

    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

function createMicrobit(name) {
    // const loginMessage = new MicrobitMessage();
    // loginMessage.setRoomName('room1');
    // loginMessage.setPassword('test1234');   //all joining room 1
    // loginMessage.setUserName(name);
    // loginMessage.setMessageType(messageType.login);
    // let message = loginMessage.toJSON();

    const message = JSON.stringify({
        room_name: 'room1',
        room_pass: 'test1234',
        pepe_name: name,
        device_type: deviceType.microbit,
        message_type: messageType.login,
        message: null,
    });



    // const message =
    //     stringParams.room_name + stringParams.delimiter + 'room1' + stringParams.param_delimiter +
    //     stringParams.room_pass + stringParams.delimiter + 'test1234' + stringParams.param_delimiter +
    //     stringParams.user_name + stringParams.delimiter + name + stringParams.param_delimiter +
    //     stringParams.message_type + stringParams.delimiter + messageType.login + stringParams.param_delimiter +
    //     stringParams.device_type + stringParams.delimiter + deviceType.microbit + stringParams.param_delimiter;

    socket.send(message);
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
function pairRobotDevice(microbitID) {
    const roboMessage = new RoboMessage();
    roboMessage.setMessageType(messageType.pairDevice);
    roboMessage.setTargetID(microbitID);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}

/**
 * @param robotID ID of Pepper to be paired
 */
function pairBrowserDevice(robotID){
    const browserMessage = new BrowserMessage();
    browserMessage.setMessageType(messageType.pairDevice);
    browserMessage.setTargetID(robotID);
    let jsonMessage = browserMessage.toJSON();
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

/**
 * Needs to be called on the same connection that a Browser has already connected with
 */
function requestPeppers(){
    const roboMessage = new BrowserMessage();
    roboMessage.setMessageType(messageType.requestPeppers);
    let jsonMessage = roboMessage.toJSON();
    socket.send(jsonMessage);
    // console.log('MESSAGE SENT FROM CLIENT: ' + jsonMessage);
}


function browserActionFunction(robotID){
    let message = {
        'room_id': '1',
        'user_id': 'user_id',
        'robot_id': robotID,
        'device_type': 'browser',
        'message_type': 'action',
        'message': {
            'namespace ': 'webcon',
            'event ': 'GREENFLAG',
        }
    };
    socket.send(JSON.stringify(message));
}

function pepperActionFunction(robotID){
    let message = {
        'room_id': '1',
        'user_id': '3',
        'robot_id': robotID,
        'device_type': 'robot',
        'message_type': 'action',
        'message': {
        'namespace': 'screen',
            'event': 'show',
            'value': 'image_file'
    }
    };
    socket.send(JSON.stringify(message));
}

function microbitActionFunction(){
    let message = stringParams.message_type + stringParams.delimiter + messageType.action + stringParams.param_delimiter +
    'a\t0\n' +
    'x\t1\n' +
    'y\t2\n' +
    'z\t3\n';

    socket.send(message);
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
    // if(command.value === ''){
    //     log.value += 'Error: Please enter a name for your Micro:Bit' + newline;
    //     return false;
    // }
    createMicrobit(command.value);
    log.value += 'Added microbit ' + command.value + newline;
    command.value = '';
});

connectBrowser.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a Pepper ID to connect to for your Browser' + newline;
        return false;
    }
    createBrowser(command.value);
    log.value += 'Added browser ' + command.value + newline;
    command.value = '';
});

pairMicrobit.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a Micro:Bit ID to pair' + newline;
        return false;
    }
    pairRobotDevice(command.value);
    log.value += 'Just attempted pairing with Micro:Bit ID: ' + command.value + newline;
    command.value = '';
});

pairPepper.addEventListener('click', e => {
    if(command.value === ''){
        log.value += 'Error: Please enter a Pepper ID to pair' + newline;
        return false;
    }
    pairBrowserDevice(command.value);
    log.value += 'Just attempted pairing with Pepper ID: ' + command.value + newline;
    command.value = '';
});

unpair.addEventListener('click', e => {
    unpairDevice();
    log.value += 'Tried to unpair device' + newline;
    command.value = '';
});

reqMicrobits.addEventListener('click', e => {
    requestMicrobits();
    log.value += 'Requested list of Micro:Bits' + newline;
    command.value = '';
});

reqPeppers.addEventListener('click', e => {
    requestPeppers();
    log.value += 'Requested list of Peppers' + newline;
    command.value = '';
});

microbitAction.addEventListener('click', e => {
    microbitActionFunction(command.value);
    log.value += 'Micro:Bit sent an action message' + newline;
    command.value = '';
});

pepperAction.addEventListener('click', e => {
    pepperActionFunction(command.value);
    log.value += 'Pepper sent an action message' + newline;
    command.value = '';
});

browserAction.addEventListener('click', e => {
    browserActionFunction(command.value);
    log.value += 'Browser sent an action message' + newline;
    command.value = '';
});