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