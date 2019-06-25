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
        return JSON.stringify(this);
    }
}

module.exports = DeviceParameters;