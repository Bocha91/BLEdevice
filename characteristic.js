var util = require('util');
var bleno = require('@abandonware/bleno'); //or 'bleno-mac' if you are using that
/*  characteristic.js 
 *  A simple custom BLE peripheral characteristic for use with Node.js and bleno.
 *  This characteristic supports read, write, and notify properties.
 *  Julian Hays - 10/14/19
 */

var BlenoCharacteristic = bleno.Characteristic;
//uuid: '27cf08c1-076a-41af-becd-02ed6f6109b9'
var CustomCharacteristic = function() {
	CustomCharacteristic.super_.call(this, {
		uuid: 'fd758b93-0bfa-4c52-8af0-85845a74a606',
		properties: ['read', 'write', 'notify']
	});

	this._value = new Buffer(0);
	this._updateValueCallback = null;
};

util.inherits(CustomCharacteristic, BlenoCharacteristic);
module.exports = CustomCharacteristic;

CustomCharacteristic.prototype.onReadRequest = function (offset, callback) {
	console.log('CustomCharacteristic onReadRequest');
	var data = new Buffer(1);
	data.writeUInt8(42, 0);
	callback(this.RESULT_SUCCESS, data);
};

CustomCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
	this._value = data;
	console.log('CustomCharacteristic - onWriteRequest: value = ' + this._value.toString('hex'));
	callback(this.RESULT_SUCCESS);
};

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

CustomCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
	console.log('CustomCharacteristic - onSubscribe');
	isSubscribed = true;
	delayedNotification(updateValueCallback);
	this._updateValueCallback = updateValueCallback;
};

CustomCharacteristic.prototype.onUnsubscribe = function() {
	console.log('CustomCharacteristic - onUnsubscribe');
	isSubscribed = false;
	this._updateValueCallback = null;
};