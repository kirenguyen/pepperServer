const deviceType = require('./message-constants').deviceType;

class MicrobitLoginMessage {
    constructor() {
        this._message = {
            room_name: null,
            password: null,
            device_name: null,
            device_type: deviceType.microbit,
            message_type: 'login'
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
    setDeviceName(microbitName) {
        this._message.device_name = microbitName;
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