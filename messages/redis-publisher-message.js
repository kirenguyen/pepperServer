class RedisMessage {
    constructor(roomID, messageType, message, origin) {
        this._message = {
            room_id: roomID,
            message_type: messageType,
            message: message,
            origin: origin,
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
    setOrigin(origin) {
        this._message.origin = origin;
        return this;
    }
    toJSON(){
        return JSON.stringify(this._message);
    }
}
module.exports = RedisMessage;