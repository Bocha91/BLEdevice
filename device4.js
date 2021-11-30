/* 30.11.2021 создаю репо на 
Bluetooth LE device, серверная составляющая командно-ориентированного канала управления устройством.
Bluetooth LE device, server component of command-oriented device control channel.
*/
/* 23.11.2021
- без установки MTU длинна Notification сообщения 20 байт, с установкой MTU длинна 253 байта. Однако нет хорошего способа информировать клиента что все данные ему отправлены, в случае инициализации нескольких Notification сообщений.
- принял решение подавать через Notification сообщения только информацию что есть новые данные для чтения, а вычитывать командой read()
- У нас есть две харрактеристики:
  - для записи (принимает комманды от клиента)
  - для чтения, подписки и оповещения (оповещение сообщает чо есть данные для чтения)
*/
console.log("run device4")
//Service UUID to expose our UART characteristics
const UART_SERVICE      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
//RX, Write characteristic
const RX_WRITE_CHAR     = "6e400002-b5a3-f393-e0a9-re50e24dcca9e";
//TX READ Notify
const TX_READ_CHAR      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const TX_READ_CHAR_DESC = "00002902-0000-1000-8000-00805f9b34fb";
// Стандартная база
//'xxxxXXXX-0000-1000-8000-00805F9B34FB'
const ble_name = 'Nobilis';
const serviceUuid = [UART_SERVICE];

var bleno = require('@abandonware/bleno');
const command = require('./command');
var bleAdvertising = false;
var readData = ''; 

/*
Запрос на изменение MTU сделанный из программы LightBlue был выполнен 
и в ответ передано 256, но не один евент не стработал
*/



function txNotification(text) 
{
    readData = text // сохроняю полную строку ответа сюда

    const NotifyData = `${readData.length},${text}` // подготавливаю уведомление с длинной полной строки и обруюком её начала
    console.log("txNotification text=",text)
    const data = new TextEncoder().encode( NotifyData.substring(0,20) ) // первых 20 символа от ответа
    console.log("txNotification ",data.buffer)
    NotificationCallback(data);
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

bleno.on('advertisingStop', ()=>{
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
                                               /*delayedUpdateRSSI();*/ }); // not available on OS X 10.9
// стаботает при отключении и даст мас(74:8a:a8:66:06:30) отключившегося
bleno.on('disconnect',       (clientAddress)=>{
  clearNotification();
  console.log("disconnect clientAddress",clientAddress);
})// Linux only
// похоже не работает
bleno.on('rssiUpdate',       (rssi)=>console.info("rssi",rssi)); // not available on OS X 10.9

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
                            console.log(readData)
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
// ********************************************************
// здесь выполняем комманду от клиента и по завершению при необходимости 
// ответить вызывыем txNotification(текст_ответа_клиенту)
// ********************************************************        
/*
                            const res = command(text)
                            txNotification(res) // для тестирования отвечаем что приняли
*/
                            command(text,txNotification)
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

