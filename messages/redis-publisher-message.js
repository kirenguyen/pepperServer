class RedisMessage {
    constructor(roomID, messageType, message, origin) {
        this._message = {
            room_id: roomID,
            message_type: messageType,
            message: message,
            origin: origin,
            return_to_client: false,
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
    setReturnToClient(bool){
        this._message.return_to_client = bool;
        return this;
    }
    toJson(){
        return JSON.stringify(this._message);
    }
}
module.exports = RedisMessage;