const deviceType = Object.freeze({robot: 1, microbit: 2, browser: 3});
const messageType = Object.freeze({
    login: 'login',
    handshake: 'handshake',

    pairDevice: 'pairDevice',
    unpairDevice: 'unpairDevice',

    requestMicrobits: 'requestMicrobits',

    action: 'action',   //no implementation
    microbitAction: 'microbitAction',   //no implementation

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
