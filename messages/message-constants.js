const deviceType = Object.freeze({robot: 1, microbit: 2, browser: 3});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',
    action: 'action',   //no implementation
    pairing: 'pairing',
    requestMicrobits: 'requestMicrobits',
    microbitAction: 'microbitAction',   //no implementation
    unpairDevice: 'unpairDevice',

    // not to be used by client
    addMicrobit: 'addMicrobit',
    addRobot: 'addRobot',
    finishPairing: 'finishPairing',
    finishUnpairing: 'finishUnpairing',
    removeDevice: 'removeDevice',
    serverStart: 'serverStart',
});



module.exports.deviceType = deviceType;
module.exports.messageType = messageType;
