class DeviceParameters {
    constructor() {
        this.uuid = null;
        this.name = null;
        this.room_id = null;
        this.paired = false;
        this.paired_uuid = null;
        this.device_type = null;
    };
    setUUID(uuid){
        this.uuid = uuid;
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
    setPairedUUID(pairedUUID){
        this.paired_uuid = pairedUUID;
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
     * @returns {{room_id: null, paired_uuid: null, name: null, device_type: null, uuid: null, paired: boolean}}
     */
    build(){
        return {
            uuid: this.uuid,
            name: this.name,
            room_id: this.room_id,
            paired: this.paired,
            paired_uuid: this.paired_uuid,
            device_type: this.device_type,
        };
    }
}

module.exports = DeviceParameters;