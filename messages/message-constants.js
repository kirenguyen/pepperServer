const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake', //legacy
    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',
    requestMicrobits: 'requestMicrobits', //manually request
    connectionClosed: 'connectionClosed',




    // not to be used by client
    serverStart: 'serverStart',
});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
