console.log("run device4")
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
const readData = 'Длинная строка для чтения, больше двадцати двух байт'; 

/*
Запрос на изменение MTU сделанный из программы LightBlue был выполнен 
и в ответ передано 256, но не один евент не стработал
*/
/*
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
*/

function txNotification(text)
{
    const data = new TextEncoder().encode( text )
    console.log("txNotification ",data.buffer)
    for(let i=0;i<data.byteLength;i+=NotificationMaxLen)
    { 
      const subdata = data.subarray(i)
      console.log("txNotification offset",subdata.byteOffset)
      NotificationCallback(subdata);
    }
}

function clearNotification(){
    NotificationCallback = clearNotification
}
var NotificationMaxLen
function setNotification(maxLen,callback){
    NotificationCallback = callback
    NotificationMaxLen = maxLen
}
var NotificationCallback = clearNotification




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
bleno.on('servicesSet',      (error)=>{ if(error) console.log("servicesSet error=",error); else console.log("Bluetuooch cервис запущен успешно") });
//Сервис запущен с ошибкой (предположительно)
bleno.on('servicesSetError', (error)=>console.log("servicesSetError error",error));
// стаботает при подключении и даст мас(74:8a:a8:66:06:30) подключившегося
bleno.on('accept',           (clientAddress)=>{console.log("connect clientAddress",clientAddress);
                                               delayedUpdateRSSI(); }); // not available on OS X 10.9
// стаботает при отключении и даст мас(74:8a:a8:66:06:30) отключившегося
bleno.on('disconnect',       (clientAddress)=>{
  clearNotification();
  console.log("disconnect clientAddress",clientAddress);
})// Linux only
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
                        properties: ['read', 'notify'],
                        //_updateValueCallback: null,
                        /*descriptors: [
                            new bleno.Descriptor({
                                uuid : TX_READ_CHAR_DESC,
                                value : 'Интерфейс команд и данных "Терминала"'
                            })
                        ],*/
                        onReadRequest: function (offset,   // (0x0000 - 0xffff)
                                                callback){ // должен вызываться с результатом и данными (типа Buffer) - может быть асинхронным.
                            console.log(`CustomCharacteristic onReadRequest offset: ${offset}`);
                            // дальше написано не оптимально, переписать
                            const data = new TextEncoder().encode( readData )
                            const subdata = data.subarray(offset)
                            console.log(subdata.buffer)
                            callback(this.RESULT_SUCCESS, subdata);
                        },

                        // подписать на уведомления
                        onSubscribe: function(maxValueSize,          // (максимальный размер данных)
                                              updateValueCallback){  //  (обратный вызов для вызова при изменении значения)
                            console.log('CustomCharacteristic - onSubscribe:',maxValueSize);
                            isSubscribed = true;
                            //delayedNotification(updateValueCallback);
                            //this._updateValueCallback = updateValueCallback;
                            //console.log(bleno)
                            //console.log(this)
                            setNotification(maxValueSize,updateValueCallback)
                        },

                        onUnsubscribe: function() { // отмена уведомлений
                            console.log('CustomCharacteristic - onUnsubscribe');
                            isSubscribed = false;
                            //this._updateValueCallback = null;
                            clearNotification()
                        },
                        onNotify: function(){ // необязательный обработчик отправленного уведомления
                            console.info('CustomCharacteristic - onNotify');
                        },
                        onIndicate: function() {  // необязательный обработчик полученного подтверждения
                            console.info('CustomCharacteristic - onIndicate');                           
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
                            let text = data.toString("utf-8")
                            console.log(`CustomCharacteristicWrite-onWriteRequest  withoutResponse:${withoutResponse} offset: ${offset} data: ${text}`);
                            // new TextDecoder().decode(buf);
                            //event.emit("led","greenBlink")
                            callback(this.RESULT_SUCCESS);
                            
                            txNotification("Write complit: "+text)
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

/*

Bleno {
  initialized: true,
  platform: 'linux',
  state: 'poweredOn',
  address: '48:f1:7f:5f:53:74',
  rssi: 0,
  mtu: 20,
  _bindings: BlenoBindings {
    _state: 'poweredOn',
    _advertising: true,
    _hci: Hci {
      _socket: [BluetoothHciSocket],
      _isDevUp: true,
      _state: 'poweredOn',
      _deviceId: 0,
      _aclMtu: 251,
      _aclMaxInProgress: 3,
      _mainHandle: 3585,
      _handleAclsInProgress: [Object],
      _handleBuffers: {},
      _aclOutQueue: [],
      _events: [Object: null prototype],
      _eventsCount: 15,
      addressType: 'public',
      address: '48:f1:7f:5f:53:74'
    },
    _gap: Gap {
      _hci: [Hci],
      _advertiseState: 'started',
      _events: [Object: null prototype],
      _eventsCount: 2
    },
    _gatt: Gatt {
      maxMtu: 256,
      _mtu: 23,
      _preparedWriteRequest: null,
      _handles: [Array],
      onAclStreamDataBinded: [Function: bound ],
      onAclStreamEndBinded: [Function: bound ],
      _events: [Object: null prototype],
      _eventsCount: 1,
      _aclStream: [AclStream]
    },
    _address: '7f:70:05:68:8e:27',
    _handle: 3585,
    _aclStream: AclStream {
      _hci: [Hci],
      _handle: 3585,
      encypted: false,
      _events: [Object: null prototype],
      _eventsCount: 4,
      _smp: [Smp]
    },
    _events: [Object: null prototype] {
      stateChange: [Function: bound ],
      platform: [Function: bound ],
      addressChange: [Function: bound ],
      advertisingStart: [Function: bound ],
      advertisingStop: [Function: bound ],
      servicesSet: [Function: bound ],
      accept: [Function: bound ],
      mtuChange: [Function: bound ],
      disconnect: [Function: bound ],
      rssiUpdate: [Function: bound ]
    },
    _eventsCount: 10,
    onSigIntBinded: [Function: bound ]
  },
  _events: [Object: null prototype] {
    newListener: [Function: bound ],
    stateChange: [Function (anonymous)],
    advertisingStop: [Function (anonymous)],
    servicesSet: [Function (anonymous)],
    servicesSetError: [Function (anonymous)],
    accept: [Function (anonymous)],
    disconnect: [Function (anonymous)],
    rssiUpdate: [Function (anonymous)],
    mtuChange: [Function (anonymous)],
    advertisingStart: [Function (anonymous)]
  },
  _eventsCount: 10
}

Characteristic {
  uuid: '6e400002b5a3f393e0a9e50e24dcca9e',
  properties: [ 'write' ],
  secure: [],
  value: null,
  descriptors: [],
  onWriteRequest: [Function: onWriteRequest],
  _events: [Object: null prototype] {
    readRequest: [Function: bound ],
    writeRequest: [Function: bound onWriteRequest],
    subscribe: [Function: bound ],
    unsubscribe: [Function: bound ],
    notify: [Function: bound ],
    indicate: [Function: bound ]
  },
  _eventsCount: 6
}

Characteristic {
  uuid: '6e400003b5a3f393e0a9e50e24dcca9e',
  properties: [ 'notify' ],
  secure: [],
  value: null,
  descriptors: [],
  onReadRequest: [Function: onReadRequest],
  onWriteRequest: [Function: onWriteRequest],
  onSubscribe: [Function: onSubscribe],
  onUnsubscribe: [Function: onUnsubscribe],
  onNotify: [Function: onNotify],
  onIndicate: [Function: onIndicate],
  _events: [Object: null prototype] {
    readRequest: [Function: bound onReadRequest],
    writeRequest: [Function: bound onWriteRequest],
    subscribe: [Function: bound onSubscribe],
    unsubscribe: [Function: bound onUnsubscribe],
    notify: [Function: bound onNotify],
    indicate: [Function: bound onIndicate]
  },
  _eventsCount: 6,
  _updateValueCallback: [Function: bound ]
}

Bleno {
  initialized: true,
  platform: 'linux',
  state: 'poweredOn',
  address: '48:f1:7f:5f:53:74',
  rssi: 0,
  mtu: 256,
  _bindings: BlenoBindings {
    _state: 'poweredOn',
    _advertising: true,
    _hci: Hci {
      _socket: [BluetoothHciSocket],
      _isDevUp: true,
      _state: 'poweredOn',
      _deviceId: 0,
      _aclMtu: 251,
      _aclMaxInProgress: 3,
      _mainHandle: 3585,
      _handleAclsInProgress: [Object],
      _handleBuffers: {},
      _aclOutQueue: [],
      _events: [Object: null prototype],
      _eventsCount: 15,
      addressType: 'public',
      address: '48:f1:7f:5f:53:74'
    },
    _gap: Gap {
      _hci: [Hci],
      _advertiseState: 'restarting',
      _events: [Object: null prototype],
      _eventsCount: 2
    },
    _gatt: Gatt {
      maxMtu: 256,
      _mtu: 256,
      _preparedWriteRequest: null,
      _handles: [Array],
      onAclStreamDataBinded: [Function: bound ],
      onAclStreamEndBinded: [Function: bound ],
      _events: [Object: null prototype],
      _eventsCount: 1,
      _aclStream: [AclStream]
    },
    _address: '7e:48:4a:47:4c:32',
    _handle: 3585,
    _aclStream: AclStream {
      _hci: [Hci],
      _handle: 3585,
      encypted: false,
      _events: [Object: null prototype],
      _eventsCount: 4,
      _smp: [Smp]
    },
    _events: [Object: null prototype] {
      stateChange: [Function: bound ],
      platform: [Function: bound ],
      addressChange: [Function: bound ],
      advertisingStart: [Function: bound ],
      advertisingStop: [Function: bound ],
      servicesSet: [Function: bound ],
      accept: [Function: bound ],
      mtuChange: [Function: bound ],
      disconnect: [Function: bound ],
      rssiUpdate: [Function: bound ]
    },
    _eventsCount: 10,
    onSigIntBinded: [Function: bound ]
  },
  _events: [Object: null prototype] {
    newListener: [Function: bound ],
    stateChange: [Function (anonymous)],
    advertisingStop: [Function (anonymous)],
    servicesSet: [Function (anonymous)],
    servicesSetError: [Function (anonymous)],
    accept: [Function (anonymous)],
    disconnect: [Function (anonymous)],
    rssiUpdate: [Function (anonymous)],
    mtuChange: [Function (anonymous)],
    advertisingStart: [Function (anonymous)]
  },
  _eventsCount: 10
}

Characteristic {
  uuid: '6e400003b5a3f393e0a9e50e24dcca9e',
  properties: [ 'notify' ],
  secure: [],
  value: null,
  descriptors: [],
  onReadRequest: [Function: onReadRequest],
  onWriteRequest: [Function: onWriteRequest],
  onSubscribe: [Function: onSubscribe],
  onUnsubscribe: [Function: onUnsubscribe],
  onNotify: [Function: onNotify],
  onIndicate: [Function: onIndicate],
  _events: [Object: null prototype] {
    readRequest: [Function: bound onReadRequest],
    writeRequest: [Function: bound onWriteRequest],
    subscribe: [Function: bound onSubscribe],
    unsubscribe: [Function: bound onUnsubscribe],
    notify: [Function: bound onNotify],
    indicate: [Function: bound onIndicate]
  },
  _eventsCount: 6,
  _updateValueCallback: [Function: bound ]
}


*/