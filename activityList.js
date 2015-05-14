var activityList = {};
module.exports = activityList;
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('./data.json'));
var req = require('./request.js');

var UPDATING_EVENT_MESSAGE = "Updating event...";

var getNameOf = function(activity) {
	return activity.property_definition[0].name[0];
}

var hasOnlyNewValue = function(activity) {
	return((activity['old_value'][0]['$']) && !(activity['new_value'][0]['$']));
}

var hasOnlyOldValue = function(activity) {
	return(!(activity['old_value'][0]['$']) && (activity['new_value'][0]['$']));
}

var getStringTypeValues = function(activity) {
	if(hasOnlyNewValue(activity)) return "to "+activity['new_value'][0];
	if(hasOnlyOldValue(activity)) return ""+activity['old_value'][0];
	return "from "+activity['old_value'][0]+" to "+activity['new_value'][0];
}

// var getCardTypeValues = function(activity) {
// 	if(hasOnlyNewValue(activity)) return "to "+activity['new_value'][0].card[0].number[0]['_'];
// 	if(hasOnlyOldValue(activity)) return ""+activity['old_value'][0].card[0].number[0]['_'];
// 	return "from "+activity['old_value'][0].card[0].number[0]['_'] +
// 		" to "+activity['new_value'][0].card[0].number[0]['_'];
// }


var getCardNameOf = function(path,callback) {
	req.requestMingle({
		host: data[0].mingle.host,
		path: path,
		hash: data[0].mingle.hash
	},callback);
}

var sendCardTypeMessage = function(preMessage, activity, callback) {
	var message = preMessage;
	if(hasOnlyNewValue(activity)){
		message += "to "+activity['new_value'][0].card[0].number[0]['_'];
		getCardNameOf(activity['new_value'][0].card[0]['$'].url, function(cardData){
			message + " : " +cardData.card.name;
			callback(message, UPDATING_EVENT_MESSAGE);
		});
	}
	// else if(hasOnlyOldValue(activity)) message += ""+activity['old_value'][0].card[0].number[0]['_'];
	else {
		var oldName = "", newName = "";
		getCardNameOf(activity['old_value'][0].card[0]['$'].url, function(cardData){
			oldName =  " : " +cardData.card.name;
			getCardNameOf(activity['new_value'][0].card[0]['$'].url, function(cardData){
				newName = " : " +cardData.card.name;
				message += "from "+activity['old_value'][0].card[0].number[0]['_'] + oldName +
					" to "+activity['new_value'][0].card[0].number[0]['_'] + newName;
				callback(message, UPDATING_EVENT_MESSAGE);
			});
		});
		

		
	}
}

activityList.pc = {
	'Story Status': function(headerMessage, activity, callback) {
		var values = getStringTypeValues(activity);
		callback(headerMessage + "Story Status changed "+ values +".\n", UPDATING_EVENT_MESSAGE);
	},
	'Planned Iteration' : function(headerMessage, activity, callback) {
		sendCardTypeMessage(headerMessage+"Planned Iteration changed ", activity, callback);
	},
	'Planned Release' : function(headerMessage, activity, callback) {
		sendCardTypeMessage(headerMessage+"Planned Release changed ", activity, callback);	
	}
};


activityList['property-change'] = function(headerMessage, activity, callback) {
	// if(activityList.pc[getNameOf(activity)])
		activityList.pc[getNameOf(activity)](headerMessage, activity, callback);
}

activityList['tag-addition'] = function(headerMessage, activity, callback) {
	callback(headerMessage + "Tag added : " + activity.tag[0],UPDATING_EVENT_MESSAGE);
}

activityList['tag-deletion'] = function(headerMessage, activity, callback) {
	callback(headerMessage + "Tag removed : " + activity.tag[0],UPDATING_EVENT_MESSAGE);
}