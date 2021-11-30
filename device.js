/* пример взят здесь
https://punchthrough.com/how-to-use-node-js-to-speed-up-ble-app-development/
*/
var bleno = require('@abandonware/bleno'); //or 'bleno-mac' if you are using that
/*  service.js 
 *  A simple custom BLE peripheral service for use with Node.js and bleno.
 *  Julian Hays - 10/14/19
 */

var BlenoPrimaryService = bleno.PrimaryService;

bleno.on('stateChange', function(state) {
console.log('on -> stateChange: ' + state);
	if (state === 'poweredOn') {
		console.log("request startAdvertising");
		bleno.startAdvertising('BCdevice', ['27cf08c1-076a-41af-becd-02ed6f6109b9']);  
	} else {
		console.log("request stopAdvertising");
		bleno.stopAdvertising(); 
	}
});

var CustomCharacteristic = require('./characteristic');



bleno.on('advertisingStart', function(error) {
	console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

	if (!error) {
		bleno.setServices([
			new BlenoPrimaryService({
				uuid: '27cf08c1-076a-41af-becd-02ed6f6109b9',
				characteristics: [
					new CustomCharacteristic()
				]
			})
		]);
	}
});

/*
var SERVICE_UUID       = '5ec0fff03cf2a682e2112af96efdf667';
var AUTHORIZATION_UUID = '5ec0fffc3cf2a682e2112af96efdf667';
var FET_STATE_UUID     = '5ec0fff23cf2a682e2112af96efdf667';
var VOLTAGE_UUID       = '5ec0fff33cf2a682e2112af96efdf667';
var DEVICE_NAME_UUID   = '5ec0fff93cf2a682e2112af96efdf667';

*/

