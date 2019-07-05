const messageConstants = require('./message-constants');
const deviceType = messageConstants.deviceType;

class BrowserMessage {
    constructor() {
        this._message = {
            room_id: null,
            user_id: null,
            robot_id: null,
            device_type: deviceType.browser,
            target_id: null,    //null if message_type !== messageType.pairDevice
            message_type: null,
            message: null,
        }
    }
    setRoomID(roomID) {
        this._message.room_id = roomID;
        return this;
    }
    setUserID(userID) {
        this._message.user_id = userID;
        return this;
    }
    setRobotId(robotID){
        this._message.robot_id = robotID;
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