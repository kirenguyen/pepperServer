const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',
    requestMicrobits: 'requestMicrobits',

    // not to be used by client
    serverStart: 'serverStart',
    connectionClosed: 'connectionClosed',

});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
