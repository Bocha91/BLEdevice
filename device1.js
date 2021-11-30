var bleno = require('@abandonware/bleno');

var bleAdvertising = false;

var ble_name = 'Nobilis';
var serviceUuid = ['12ab'];

var newWifi = {
    ssid: "",
    password: ""
}

var isSubscribed = false
var notifyInterval = 5 //seconds

function delayedNotification(callback) {
	setTimeout(function() { 
		if (isSubscribed) {
			var data = Buffer(3);
			var now = new Date();
			data.writeUInt8(now.getHours(), 0);
			data.writeUInt8(now.getMinutes(), 1);
			data.writeUInt8(now.getSeconds(), 2);
			callback(data);
			delayedNotification(callback);
		}
	}, notifyInterval * 1000);
}


bleno.on('stateChange', function(state){
    if(state === 'poweredOn'){
        console.log("request startAdvertising")
        bleno.startAdvertising(ble_name, serviceUuid)
    } else {
		console.log("request stopAdvertising");
		bleno.stopAdvertising(); 
	} 
}) 

bleno.on('advertisingStop', function(){
    console.log("stop advertising")
    bleAdvertising = false;
})

bleno.on('advertisingStart', function(error){
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
    bleAdvertising = true;
    if(!error){
        bleno.setServices([
            new bleno.PrimaryService({
                uuid: serviceUuid[0],
                characteristics: [
                    // wifi ssid characteristic
                    new bleno.Characteristic({
                        value: null,
                        //uuid: '34cd',
                        uuid: 'fd758b93-0bfa-4c52-8af0-85845a74a606',
                        //properties: ['write'],
                        properties: ['read', 'write', 'notify'],
                        _updateValueCallback: null,

                        onReadRequest: function (offset, callback) {
                            console.log('CustomCharacteristic onReadRequest');
                            var data = new Buffer(1);
                            data.writeUInt8(42, 0);
                            callback(this.RESULT_SUCCESS, data);
                        },

                        onWriteRequest: function(data, offset, withoutResponse, callback){
                            this.value = data;
                            console.log(data)
                            console.log('Wifi SSID: '+this.value.toString("utf-8"));
                            newWifi.ssid = this.value.toString("utf-8")
                            //event.emit("led","greenBlink")
                            callback(this.RESULT_SUCCESS);
                        },

                        onSubscribe: function(maxValueSize, updateValueCallback) {
                            console.log('CustomCharacteristic - onSubscribe');
                            isSubscribed = true;
                            delayedNotification(updateValueCallback);
                            this._updateValueCallback = updateValueCallback;
                        },

                        onUnsubscribe: function() {
                            console.log('CustomCharacteristic - onUnsubscribe');
                            isSubscribed = false;
                            this._updateValueCallback = null;
                        }

                    }),
                    // password characteristic
                    new bleno.Characteristic({
                        value: null,
                        uuid: '45ef',
                        properties: ['write'],
                        onWriteRequest: function(data, offset, withoutResponse, callback){
                            this.value = data
                            console.log("Wifi Password: "+this.value.toString("utf-8"))
                            newWifi.password = this.value.toString("utf-8")
                           // event.emit("led","greenBlink")
                            console.log("SSID:", newWifi.ssid)
                            console.log("PASS:", newWifi.password)

                            //wifi.connect(newWifi.ssid, newWifi.password)

                            callback(this.RESULT_SUCCESS);
                        }
                    }),

                    new bleno.Characteristic({
                        value: null,
                        uuid: '6790',
                        properties: ['write'],
                        onWriteRequest: function(data, offset, withoutResponse, callback){
                            console.log("Stop advertising");

                            if(data.toString("utf-8")=="a"){
                                bleno.stopAdvertising();
                            }
                            
                            callback(this.RESULT_SUCCESS)
                        }
                    })
                ]
            })

        ])
    }
}) 