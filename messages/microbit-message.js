const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class MicrobitMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            microbit_name: null,
            device_type: deviceType.microbit,
            message_type: null,
            message: null,
        }
    }
    setRoomName(roomName) {
        this._message.room_name = roomName;
        return this;
    }
    setPassword(password) {
        this._message.password = password;
        return this;
    }
    setMicrobitName(microbitName) {
        this._message.microbit_name = microbitName;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setMessage(action) {
        this._message.message = action;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = MicrobitMessage;