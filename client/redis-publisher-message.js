const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class RedisMessage {
    constructor() {
        this._message = {
            room_id: null,
            message_type: null,
            message: null,
            origin_ip: null,
        }
    }
    setRoomId(roomId) {
        this._message.room_id = roomId;
        return this;
    }
    setMessageType(messageType) {
        this._message.message_type = messageType;
        return this;
    }
    setMessage(message) {
        this._message.message = message;
        return this;
    }
    setOriginIP(ip) {
        this._message.origin_ip = ip;
        return this;
    }
    build() {
        return this;
    }
    toJson(){
        return JSON.stringify(this._message);
    }
}
module.exports = RoboConnectorMessage;