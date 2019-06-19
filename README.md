# pepperServer
Server for Pepper school Micro:bits project. 

#####Still a work-in-progress, I apologize for bugs! I will need to consolidate the message types, so please bear with me.

#####バグが多いかもしれないから、


## Running the Two Servers
Clone the repo and install all the `npm` dependencies with `npm install`. For reference, the node version I used while writing this is `v12.3.1`.

There are two server directories, `/server_1` and `/server_2`. Each contains one file, each with a `server.js#` file; these are the server files that need to be run to establish the servers. I use `nodemon` to run the servers.

The two servers are (port 3000):
    
- `ec2-3-14-134-47.us-east-2.compute.amazonaws.com` (Server 1)

- `ec2-3-16-66-225.us-east-2.compute.amazonaws.com` (Server 2)



## Connecting a Pepper
In the `/messages` directory, there is a `robo-connector-message.js` file, used to form the handshake between the server and Pepper.

Sample script for sending (to server 1). Please fix the node module paths accordingly.
```javascript
const RoboConnectorMessage = require('../messages/robo-connector-message');
const messageType = require('../messages/message-constants');

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboConnectorMessage();
roboMessage.setRoomId(1);
roboMessage.setUserId(129);
roboMessage.setMessageType(messageType.handshake);
roboMessage.setMessage('no message');
roboMessage.setRobotId('');             
let jsonMessage = roboMessage.toJson();
socket.send(jsonMessage);
```


## Connecting a Micro:Bit to server
Very similar to Pepper. This uses a different message at the moment, but I may later make Pepper and Micro:bit use the same one.

In the same `/messages` directory, there is a `microbit-login-message.js` file, used to login the micro:bit to the server.

Sample script for sending (to server 2). Please fix the node module paths accordingly.
```javascript
const MicrobitLoginMessage = require('../messages/microbit-login-message');

const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

const loginMessage = new MicrobitLoginMessage();
loginMessage.setRoomName('room1');
loginMessage.setPassword('test1234');   
loginMessage.setMicrobitName('microbit1');    
let jsonMessage = loginMessage.toJson();
socket.send(jsonMessage);
```

##Requesting Micro:Bit List

You can find the code the function for this in either `server#.js` file: `requestAllMicrobits`.

The function requires that you send the message from a Pepper already connected to a server. It will return all of the Micro:Bits on both servers that are in the same room as the Pepper that sent the message.
It also uses the `robo-connector-message.js` (for now).

In the same `/messages` directory, there is a `microbit-login-message.js` file, used to login the micro:bit to the server.

Sample script for sending a request from a Pepper connected to server 1.
```javascript
const RoboConnectorMessage = require('../messages/robo-connector-message');
const messageType = require('../messages/message-constants');

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboConnectorMessage();
roboMessage.setMessageType(messageType.requestMicrobits);
let jsonMessage = roboMessage.toJson();
socket.send(jsonMessage);
```

The return Micro:Bit list will be in this format:
 ```
let microbitList = {
    room_id:  <room_id of Pepper that sent request>,
    microbit_list: [{
        uuid: <UUID assigned to device connection>
        name: <name assigned to microbit by user>
        paired: <boolean: always false for now>
    }, ........]
}
```

###Misc

Here are some of the current messageTypes, some will be consolidated later.
```javascript
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    action: 'action',
    pairing: 'pairing',
    requestMicrobits: 'requestMicrobits',
    microbitAction: 'microbitAction',
    addMicrobit: 'addMicrobit',
    addRobot: 'addRobot',
    removeDevice: 'removeDevice',
    serverStart: 'serverStart',

});
```