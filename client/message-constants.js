const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({login: 1, handshake: 2, action: 3});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
