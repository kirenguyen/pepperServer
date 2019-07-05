const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class BrowserMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            device_type: deviceType.browser,
            target_id: null,    //null if message_type !== messageType.pairDevice
            message_type: null,
            message: null,
        }
    }
    setRoomId(roomId) {
        this._message.room_id = roomId;
        return this;
    }
    setUserId(userId) {
        this._message.user_id = userId;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setTargetID(uuid){
        this._message.target_id = uuid;
        return this;
    }
    setMessage(message) {
        this._message.message = message;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = BrowserMessage;