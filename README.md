# pepperServer

LAST UPDATED: 25/6/19


### Running the Two Servers

Clone the repo and install all the `npm` dependencies with `npm install`. For reference, the node version I used while writing this is `v12.3.1`.

There are two server directories, `/server_1` and `/server_2`. Each contains one file, each with a `server.js#` file; these are the server files that need to be run to establish the servers. I use `nodemon` to run the servers.

The two servers are (port 3000):
    
- `ec2-3-14-134-47.us-east-2.compute.amazonaws.com` (Server 1)

- `ec2-3-16-66-225.us-east-2.compute.amazonaws.com` (Server 2)



## Connecting a Pepper
In the `/messages` directory, there is a `robo-message.js` file, used to form the handshake between the server and Pepper.

Sample script for sending (to server 1). Please fix the node module paths accordingly.

```javascript
const RoboMessage = require('../messages/robo-message');
const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboMessage();
roboMessage.setRoomId('1');
roboMessage.setUserId(129);
roboMessage.setMessageType(messageType.handshake);
roboMessage.setMessage('no message');
roboMessage.setRobotId('');             
let jsonMessage = roboMessage.toJSON();
socket.send(jsonMessage);
```


## Connecting a Micro:Bit to server
Very similar to Pepper. This uses a different message at the moment, but I may later make Pepper and Micro:bit use the same one.

In the same `/messages` directory, there is a `microbit-message.js` file, used to login the micro:bit to the server.

Sample script for sending (to server 2). Please fix the node module paths accordingly.

```javascript
const MicrobitMessage = require('../messages/microbit-message');

const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

const loginMessage = new MicrobitMessage();
loginMessage.setRoomName('room1');
loginMessage.setPassword('test1234');   
loginMessage.setMicrobitName('microbit1');    
let jsonMessage = loginMessage.toJSON();
socket.send(jsonMessage);
```

Upon successful connection to the server, an alert will be sent to all Peppers within the same room as an object formatted as follows:

```

```


## Requesting Micro:Bit List

You can find the code the function for this in either `server#.js` file: `requestAllMicrobits`.

The function requires that you send the message from a Pepper already connected to a server. It will return all of the Micro:Bits on both servers that are in the same room as the Pepper that sent the message.
It also uses the `robo-message.js` (for now).

In the same `/messages` directory, there is a `microbit-message.js` file, used to login the micro:bit to the server.

Sample script for sending a request from a Pepper connected to server 1.

```javascript
const RoboMessage = require('../messages/robo-message');
const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboMessage();
roboMessage.setMessageType(messageType.requestMicrobits);
let jsonMessage = roboMessage.toJSON();
socket.send(jsonMessage);
```

The return Micro:Bit list will be in this format:

 ```text
let microbitList = {
    room_id:  <room_id of Pepper that sent request>,
    microbit_list: [{
        roomID: <var>
        uuid: <UUID assigned to device connection>
        name: <name assigned to microbit by user>
        paired: <boolean: always false for now>
        paired_uuid: <UUID of paired Pepper || null >
    }, ........]
}
 ```

## Pairing a Robot to a Micro:Bit

The following is a sample script to pair a Pepper that has been connected to the server and performed the handshake to a Micro:Bit.

You will need to get the UUID of the Micro:Bit you want to pair Pepper to; only Pepper can send a message to pair with a Micro:Bit.

```javascript
const RoboMessage = require('../messages/robo-message');
const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboMessage();
roboMessage.setMessageType(messageType.pairDevice);
roboMessage.setMicrobitId(microbitUUID);    //request the list of Micro:Bits to pick a UUID
let jsonMessage = roboMessage.toJSON();
socket.send(jsonMessage);
```

## Unpairing a Micro:Bit or Robot

At the moment, you can send a message from a Micro:Bit or Robot to cut the pairing.
The websocket connection must have a device that was paired.

Make sure the messageType is `messageType.unpairDevice`. That's the only parameter; both devices in the pairing will be disconnected.
 
Here is a sample script for unpairing from Pepper:

```javascript
const RoboMessage = require('../messages/robo-message');
const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboMessage();
roboMessage.setMessageType(messageType.unpairDevice);
let jsonMessage = roboMessage.toJSON();
socket.send(jsonMessage);
```

### Misc

To try out some of the functionality using the browser, use the `browser.html` located in `/client`;
to make sure any changes are saved, use `watchify` by running:

`watchify client/client.js -o client/bundle.js -v` in a separate terminal.

To see the functionality of the browser client, check `client.js` in the `/client` folder.

### Issues

Although I am using the /delete_user (API018) to cut the connection, if the server crashes before you can close the connection, you will need to manually disconnect the robot through mySQL.
