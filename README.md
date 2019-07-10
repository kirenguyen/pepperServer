# pepperServer

LAST UPDATED: 8/7/19

### Running the Two Servers

Clone the repo and install all the `npm` dependencies with `npm install`. For reference, the node version I used while writing this is `v12.3.1`.

There are two server directories, `/server_1` and `/server_2`. Each contains one file, each with a `server.js` file; these are the server files that need to be run to establish the servers. I use `nodemon` to run the servers.

The two servers are (port 3000):
    

- `ec2-3-14-134-47.us-east-2.compute.amazonaws.com` (Server 1)
- `ec2-3-16-66-225.us-east-2.compute.amazonaws.com` (Server 2)



### Messaging / WebSocket Protocol

Once a device is connected to the server, it will need to send messages; at the moment there are two classes dedicated to messaging, both located in the `/messages` directory.

For Pepper, this is `robo-message.js` , and for Micro:Bits this will be a string comprised of values and parameters/delimiters as defined by the `message-constants.js` file.

If there was some error or failure in sending a message, either a failedError string object will be returned, or a string if it's a Micro:Bit.


##### Parameters:

- `result` : `'900'` to indicate failure
- `failure_message`: short description of what went wrong
- `message_type` : one of the types described below, indicating the action that failed

######  Message Types (message_type): 



```textmate
'login': Micro:Bit logged in.
'pairDevice': Pepper successfully connected to server.
'unpairDevice': Pepper or Micro:Bit attempted to unpair.
'requestMicrobits': Pepper manually requested a list of Micro:Bits in the room.
'connectionClosed': A Micro:Bit disconnected from the server. 
```




##### Example:


For a browser or Pepper:

```textmate
{
    result: '900',
    failure_message: The Micro:Bit is already paired,
    message_type: messageType.pairDevice
}
```


For a Micro:Bit:



```textmate
result    900
message    The Micro:Bit is already paired
message_type    pairDevice
```




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



Upon handshake of Pepper, the legacy response body will be sent to Pepper, from 【Ph.2.0】API仕様書:

Success/成功:



```textmate
{
    "result": "000",
    "robot_name_ja": "\u30b3\u30b9\u30e2\u30b9",
    "robot_name_en": "Cosmos",
    "robot_id": "test"
}
```



Failure/失敗:



```textmate
{
    "result": "900"
}
```



## Connecting a Micro:Bit to server

As Micro:Bit messages are strings, the string formats to send to connect are located on RoboKen at [this link](https://roboken.backlog.jp/wiki/SCRATCH/Wifi+module+message+protocol).

Sample string for sending (to server 2). 


```javascript
const MicrobitMessage = require('../messages/microbit-message');
const messageType = messageConstants.messageType;
const deviceType = messageConstants.deviceType;
const stringParams = messageConstants.stringParameters;

const socket = new WebSocket('ws://ec2-3-16-66-225.us-east-2.compute.amazonaws.com:3000', 'rb');

const microbitLogin =
        stringParams.room_name + stringParams.delimiter + 'room1' + stringParams.param_delimiter +
        stringParams.room_pass + stringParams.delimiter + 'test1234' + stringParams.param_delimiter +
        stringParams.user_name + stringParams.delimiter + name + stringParams.param_delimiter +
        stringParams.message_type + stringParams.delimiter + messageType.login + stringParams.param_delimiter +
        stringParams.device_type + stringParams.delimiter + deviceType.microbit + stringParams.param_delimiter;

socket.send(jsonMessage);
```



Upon successful connection to the server, an alert will be sent to all Peppers within the same room as an object formatted as follows:




```textmate
{
    result: '000',
    message_type: messageType.login,
    room_id:  <room_id of Pepper that sent request>,
    microbit_list: [{
        roomID: <var>
        device_id: <websocket key>   
        name: <name assigned to microbit by user>
        paired: <boolean: always false for now>
        paired_id: <ID of paired device || null >
        paired_type: deviceType this device is paired to
    }, ........]
}
```



This response will be sent to the Micro:Bit, as in the format given in the Roboken linked above:



```textmate
message_type	login      
result	(000 or 900)
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



```textmate
{
    result: '000',
    message_type: messageType.requestMicrobits ('requestMicrobits'),
    room_id:  <room_id of Pepper that sent request>,
    microbit_list: [{
        roomID: <var>
        device_id: <websocket key>   
        name: <name assigned to microbit by user>
        paired: <boolean: always false for now>
        paired_id: <ID of paired device || null >
        paired_type: deviceType this device is paired to
    }, ........]
}
```



## Pairing a Micro:Bit to a Pepper

The following is a sample script to pair a Pepper that has been connected to the server and performed the handshake to a Micro:Bit.

You will need to get the ID of the Micro:Bit you want to pair Pepper to; only Pepper can send a message to pair with a Micro:Bit.



```javascript
const RoboMessage = require('../messages/robo-message');
const messageConstants = require('../messages/message-constants');
const messageType = messageConstants.messageType;

const socket = new WebSocket('ws://ec2-3-14-134-47.us-east-2.compute.amazonaws.com:3000', 'rb');

const roboMessage = new RoboMessage();
roboMessage.setMessageType(messageType.pairDevice);
roboMessage.setDeviceID(deviceID);    //request the list of Micro:Bits to pick an ID
let jsonMessage = roboMessage.toJSON();
socket.send(jsonMessage);
```



This will also send back a Micro:Bit list to all Peppers in the same room as the two devices, if pairing succeeded. If pairing failed, a failureObject as described in the protocol will be sent.
The `message_type` parameter of the notification will be `messageType.pairDevice`.

Peppers/Browsers will also receive the following JSON string format upon successfully sending the POST request to update this pair in the server. If the API request failed, the `result` parameter will be '900'.



```textmate
{"result":"000","message_type":"pair"}
```



Micro:Bit will receive a similar string that looks like:



```textmate
message_type	pairDevice   
message	hogehoge
```





## Unpairing a Micro:Bit or Robot

At the moment, you can send a message from a Micro:Bit or Robot to cut the pairing.
The websocket connection must have a device that was paired, and the connection must have be paired before unpairing, otherwise a failedResponse object will be returned.

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



This will also send back a Micro:Bit list to all Peppers in the same room as the two devices; the `message_type` parameter will be set to `messageType.unpairDevice`.
There will always be a Micro:Bit list response after a request.

Upon sending the POST request to the API to unpair, the device will also receive the following JSON string if it is a Pepper or a browser: 



```text
{"result":"000","message_type":"unpairDevice"}
```



If the device is a Micro:Bit, the Micro:Bit connection will receive: 



```textmate
message_type unpairDevice  
message	hogehoge
```



Same as pairing device, but with a different message_type.


### Misc

To try out some of the functionality using the browser, use the `browser.html` located in `/client`;
to make sure any changes are saved, use `watchify` by running:

`watchify client/client.js -o client/bundle.js -v` in a separate terminal.

To see the functionality of the browser client, check `client.js` in the `/client` folder.

- When adding a Pepper, enter the `room_id` you want the Pepper to be in (ex: `1`, `2`).
- When adding a Micro:Bit, enter the `microbit_name` you want the Pepper to be in.
- When pairing a Micro:Bit, enter the 'ID' of the Micro:Bit you want to pair to, then press the `Pair Micro:Bit` button.

- When adding a browser connection to the server, request the list of Peppers and input the device key of the Pepper you wish this browser to be paired with upon connection.



### Issues

Although I am using the /delete_user (API018) to cut the connection, if the server crashes before you can close the connection, you will need to manually disconnect the robot through mySQL.