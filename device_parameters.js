class DeviceParameters {
    constructor() {
        this.device_id = null;
        this.name = null;
        this.room_id = null;
        this.paired = false;
        this.paired_id = null;
        this.paired_type = null;
        this.device_type = null;
    };
    setDeviceID(id){
        this.device_id = id;
        return this;
    }
    setName(name){
        this.name = name;
        return this;
    }
    setRoomID(roomID){
        this.room_id = roomID;
        return this;
    }
    setPaired(paired){
        this.paired = paired;
        return this;
    }
    setPairedID(pairedID){
        this.paired_id = pairedID;
        return this;
    }
    setPairedType(pairedType){
        this.paired_type = pairedType;
        return this;
    }
    setDeviceType(type){
        this.device_type = type;
        return this;
    }
    toJSON(){
        return JSON.stringify(this.build());
    }

    /**
     * Creates a standard object, compatible with JSON stringify and WebSocket messages
     * @returns {{room_id: null, target_uuid: null, name: null, device_type: null, uuid: null, paired: boolean}}
     */
    build(){
        return {
            device_id: this.device_id,
            name: this.name,
            room_id: this.room_id,
            paired: this.paired,
            paired_id: this.paired_id,
            paired_type: this.paired_type,
            device_type: this.device_type,
        };
    }
}

module.exports = DeviceParameters;