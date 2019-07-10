const deviceType = Object.freeze({
    robot: 'robot',
    microbit: 'microbit',
    browser: 'browser',
});

const stringParameters = Object.freeze({
    delimiter: '\t',
    param_delimiter: '\n',

    room_name: 'room_name',
    room_pass: 'room_pass',
    user_name: 'user_name',
    device_type: 'device_type',
    message_type: 'message_type',

    result: 'result',
    room_id: 'room_id',
    message: 'message',

});



const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',
    requestMicrobits: 'requestMicrobits',
    requestPeppers: 'requestPeppers',

    action: 'action',

    // not to be used by client
    serverStart: 'serverStart',
    connectionClosed: 'connectionClosed',
    sendACKMessage: 'sendACKMessage',
});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
module.exports.stringParameters = stringParameters;

/**
 * Change
 *

 device_type	microbit    // it could be convenient if keep device type
 message_type	action
 x	-560
 y	128
 z	1232
 a	727
 C	727     //
 X	727     //
 A	1       //
 B	1       //


 INTO THIS DOWN HERE

 message = {
           'room_id': roomId,
           'user_id': userid,
           'robot_id': robotId,
           'device_type': 'browser',
           'message_type': 'action',
           'message': {
                       'namespace ': 'microbit',
                       'event ': 'SENSOR',
                       'value': roboMicrobitSensor
           }
}

 roboMicrobitSensor =
 {
           roboMicrobitTemperature: 0,
           roboMicrobitLightLevel: 0,
           roboMicrobitCompassHeading: 0,
           roboMicrobitAccelerometer: {
                      x: 0,
                      y: 0,
                      z: 0,
                      a: 0
           },
           roboMicrobitCustomMessage: ''
}
 */
