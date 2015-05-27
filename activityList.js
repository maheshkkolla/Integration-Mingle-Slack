var activityList = {};
module.exports = activityList;
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('./config.json'));
var req = require('./request.js');

var UPDAING_EVENT_LOG = "Updating event...";
var MESSAGE_TEMPLATE = "@NAME@ : *@OLD_VALUE@* -> *@NEW_VALUE@*\tby *@AUTHOR@*";
var SINGEL_VALUE_MESSAGE = "@TYPE@ : *@VALUE@*\tby *@AUTHOR@*";

var getNameOf = function(activity) {
	return activity.property_definition[0].name[0];
}

var getTypeOf = function(activity) {
	return activity['$'].type;
}

var requestForCardName = function(path,callback) {
	req.requestMingle({
		host: data[0].mingle.host,
		path: path,
		hash: data[0].mingle.hash
	},callback);
}

var noValue = function(valueObject) {
	return(valueObject[0]['$']);
}

var getCardNumber = function(valueObject) {
	return valueObject[0].card[0].number[0]['_'];
}

var getCardUrl = function(valueObject) {
	return valueObject[0].card[0]['$'].url;
}

var getCardDetails = function(valueObject, callback) {
	if(noValue(valueObject)) callback(getCardNumber(valueObject));
	else{
		requestForCardName(getCardUrl(valueObject), function(cardData) {
			var cardDetails = getCardNumber(valueObject)+"("+cardData.card.name+")";
			callback(cardDetails);
		});
	}
}

var cardType = function(activity,callback) {
	var message = activity.header.message + MESSAGE_TEMPLATE;
	message = message.replace(/@NAME@/g, getNameOf(activity));
	message = message.replace(/@AUTHOR/g, activity.header.author);
	getCardDetails(activity['old_value'], function(oldValue){
		message = message.replace(/@OLD_VALUE@/g, oldValue);
		getCardDetails(activity['new_value'], function(newValue) {
			message = message.replace(/@NEW_VALUE@/g, newValue);
			callback(message, UPDAING_EVENT_LOG);
		});
	});
}

var getOldValue = function(activity) {
	if(noValue(activity['old_value'])) return "nill";
	return activity['old_value'][0];
}

var getNewValue = function(activity) {
	if(noValue(activity['new_value'])) return "nill";
	return activity['new_value'][0];
}


var stringType = function(activity, callback) {
	var message = activity.header.message + MESSAGE_TEMPLATE;
	message = message.replace(/@NAME@/g, getNameOf(activity));
	message = message.replace(/@AUTHOR@/g, activity.header.author);
	message = message.replace(/@OLD_VALUE@/g, getOldValue(activity));
	message = message.replace(/@NEW_VALUE@/g, getNewValue(activity));
	callback(message, UPDAING_EVENT_LOG);
}

activityList.pc = {
	'Story Status': stringType,
	'Planned Iteration' : cardType,
	'Planned Release' : cardType,
	'Estimate' : stringType
};

var tagType = function(activity, callback) {
	var message = activity.header.message + SINGEL_VALUE_MESSAGE;
	message = message.replace(/@TYPE@/g,getTypeOf(activity));
	message = message.replace(/@VALUE@/g, activity.tag[0]);
	message = message.replace(/@AUTHOR@/g, activity.header.author);
	callback(message,UPDAING_EVENT_LOG);
}


activityList['property-change'] = function(activity, callback) {
	if(activityList.pc[getNameOf(activity)])
		activityList.pc[getNameOf(activity)](activity, callback);
	else callback(null, "Filtered activity type. Not updating ...");
}

activityList['tag-addition'] = tagType;
activityList['tag-deletion'] = tagType;








