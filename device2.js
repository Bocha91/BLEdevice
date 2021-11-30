var bleno = require('@abandonware/bleno');

var bleAdvertising = false;

//Service UUID to expose our UART characteristics
const UART_SERVICE      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
//RX, Write characteristic
const RX_WRITE_CHAR     = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
//TX READ Notify
const TX_READ_CHAR      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const TX_READ_CHAR_DESC = "00002902-0000-1000-8000-00805f9b34fb";
// Стандартная база
//'xxxxXXXX-0000-1000-8000-00805F9B34FB'
const ble_name = 'Nobilis';
const serviceUuid = [UART_SERVICE];

/*
Запрос на изменение MTU сделанный из программы LightBlue был выполнен 
и в ответ передано 256, но не один евент не стработал
*/

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
    console.log("stateChange", state)

    if(state === 'poweredOn'){
        console.log("request startAdvertising")
        bleno.startAdvertising(ble_name, serviceUuid/*,(err)=>{console.log("error=",err)}*/)
        //bleno.startAdvertisingWithEIRData(advertisementData[, scanData, callback(error)]);
    } else {
		console.log("request stopAdvertising");
		bleno.stopAdvertising(); 
	} 
}) 

bleno.on('advertisingStop', function(){
    console.log("stop advertising")
    bleAdvertising = false;
})
function delayedUpdateRSSI() {
	//setTimeout(function() { 
        bleno.updateRssi((error, rssi)=>{
            if( error ) console.log("Update RSSI", error)
            else console.log("Update RSSI=",rssi)
        });
	//	delayedUpdateRSSI();
	//}, 10000);
}
//delayedUpdateRSSI();
//Сервис запущен с результатом в (error!=undefined)
bleno.on('servicesSet',      (error)=>{console.log("servicesSet error=",error); });
//Сервис запущен с ошибкой (предположительно)
bleno.on('servicesSetError', (error)=>console.log("servicesSetError error",error));
// стаботает при подключении и даст мас(74:8a:a8:66:06:30) подключившегося
bleno.on('accept',           (clientAddress)=>{console.log("connect clientAddress",clientAddress); delayedUpdateRSSI(); }); // not available on OS X 10.9
// стаботает при отключении и даст мас(74:8a:a8:66:06:30) отключившегося
bleno.on('disconnect',       (clientAddress)=>console.log("disconnect clientAddress",clientAddress)); // Linux only
// похоже не работает
bleno.on('rssiUpdate',       (rssi)=>console.log("rssi",rssi)); // not available on OS X 10.9

bleno.on('mtuChange',        (mtu)=>console.log("mtuChange",mtu)); 


bleno.on('advertisingStart', function(error){
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
    bleAdvertising = true;
    if(!error){
        bleno.setServices([
            new bleno.PrimaryService({
                uuid: serviceUuid[0],
                characteristics: [
                    
                    new bleno.Characteristic({
                        value: null,
                        uuid: TX_READ_CHAR,
                        properties: [/*'read', */'notify'],
                        //properties: ['read', 'write', 'notify' /*, 'writeWithoutResponse'*/, 'indicate' ],
                        //secure: [ 'read', 'write', 'writeWithoutResponse', 'notify', 'indicate' ],
                        _updateValueCallback: null,
                        /*descriptors: [
                            new bleno.Descriptor({
                                uuid : TX_READ_CHAR_DESC,
                                value : 'Интерфейс команд и данных "Терминала"'
                            })
                        ],*/
                        onReadRequest: function (offset,   // (0x0000 - 0xffff)
                                                callback){ // должен вызываться с результатом и данными (типа Buffer) - может быть асинхронным.
                            console.log('CustomCharacteristic onReadRequest');
                            var data = new Buffer(1);
                            data.writeUInt8(42, 0);
                            callback(this.RESULT_SUCCESS, data);
                        },

                        onWriteRequest: function(data,            // (Buffer)
                                                 offset,          // (0x0000 - 0xffff)
                                                 withoutResponse, // (true | false)
                                                 callback){       // должен вызываться с кодом результата - может быть асинхронным.
                            this.value = data;
                            console.log(data)
                            console.log('CustomCharacteristic onWriteRequest '+this.value.toString("utf-8"));
                            newWifi.ssid = this.value.toString("utf-8")
                            //event.emit("led","greenBlink")
                            callback(this.RESULT_SUCCESS);
                        },
                        // подписать на уведомления
                        onSubscribe: function(maxValueSize,          // (максимальный размер данных)
                                              updateValueCallback){  //  (обратный вызов для вызова при изменении значения)
                            console.log('CustomCharacteristic - onSubscribe: maxValueSize=',maxValueSize);
                            isSubscribed = true;
                            delayedNotification(updateValueCallback);
                            this._updateValueCallback = updateValueCallback;
                        },

                        onUnsubscribe: function() { // отмена уведомлений
                            console.log('CustomCharacteristic - onUnsubscribe');
                            isSubscribed = false;
                            this._updateValueCallback = null;
                        },
                        onNotify: function(){ // необязательный обработчик отправленного уведомления
                            console.log('CustomCharacteristic - onNotify');
                        },
                        onIndicate: function() {  // необязательный обработчик полученного подтверждения
                            console.log('CustomCharacteristic - onIndicate');                           
                        }
                    }),

                    new bleno.Characteristic({
                        value: null,
                        uuid: RX_WRITE_CHAR,
                        properties: ['write'],

                        onWriteRequest: function(data,            // (Buffer)
                                                 offset,          // (0x0000 - 0xffff)
                                                 withoutResponse, // (true | false)
                                                 callback){       // должен вызываться с кодом результата - может быть асинхронным.
                            console.log(data)
                            console.log(`CustomCharacteristic-onWriteRequest  withoutResponse:${withoutResponse} offset: ${offset} data:${data.toString("utf-8")}`);
                            // new TextDecoder().decode(buf);
                            //event.emit("led","greenBlink")
                            callback(this.RESULT_SUCCESS);

                        },
                    })
                ]
            })
        ])
    }
}) 


// останавливаю рекламу BLE
process.on('SIGINT', function() {
    console.log("\nОбнаружено прерывание от SIGINT (Ctrl-C)");
    bleno.is
    bleno.stopAdvertising(()=> { 
        console.log("Теперь закрываем приложение");
        process.exit();
    }); 
});

process.on( 'exit', function() {
    console.log("exit");
//    console.log( "never see this log message" )
})
