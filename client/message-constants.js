const deviceType = Object.freeze({robot: 'robot', microbit: 'microbit', browser: 'browser'});
const messageType = Object.freeze({handshake: 1, action: 2});

module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
