const deviceType = Object.freeze({robot: 1, microbit: 2, browser: 3});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    action: 'action',
    microbitRequest: 'microbitRequest',
    microbitAction: 'microbitAction',
    addMicrobit: 'addMicrobit',
    addRobot: 'addRobot',
    removeDevice: 'removeDevice',
});



module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
