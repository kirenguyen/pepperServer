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