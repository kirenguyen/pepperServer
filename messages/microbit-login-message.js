const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;
const messageType = messageConstants.messageType;

class MicrobitLoginMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            microbit_name: null,
            device_type: deviceType.microbit,
            message_type: messageType.login
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
    build() {
        return this;
    }
    toJson(){
        return JSON.stringify(this._message);
    }
}
module.exports = MicrobitLoginMessage;