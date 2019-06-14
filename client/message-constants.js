const deviceType = Object.freeze({robot: 1, microbit: 2, browser: 3});
const messageType = Object.freeze({login: 1, handshake: 2, action: 3, microbitRequest: 4, microbitAction: 5});



module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
