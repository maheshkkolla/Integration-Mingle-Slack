var activityList = {};
module.exports = activityList;
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('./data.json'));
var req = require('./request.js');

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

var getCardTypeValues = function(activity) {
	if(hasOnlyNewValue(activity)) return "to "+activity['new_value'][0].card[0].number[0]['_'];
	if(hasOnlyOldValue(activity)) return ""+activity['old_value'][0].card[0].number[0]['_'];
	return "from "+activity['old_value'][0].card[0].number[0]['_'] +
		" to "+activity['new_value'][0].card[0].number[0]['_'];
}

var sendCardTypeMessage = function(preMessage, activity, callback) {
	var message = preMessage + getCardTypeValues(activity);
	req.requestMingle({
		host: data[0].mingle.host,
		path: activity['new_value'][0].card[0]['$'].url,
		hash: data[0].mingle.hash
	},function(cardData) {
		var name = cardData.card.name;
		callback(message + " : " + name);
	});
}

activityList.pc = {
	'Story Status': function(headerMessage, activity, callback) {
		var values = getStringTypeValues(activity);
		callback(headerMessage + "Story Status changed "+ values +".\n");
	},
	'Planned Iteration' : function(headerMessage, activity, callback) {
		sendCardTypeMessage(headerMessage+"Planned Iteration changed ", activity, callback);
		// var values = getCardTypeValues(activity);
		// callback(headerMessage + "Planned Iteration changed "+values+".\n");
	},
	'Planned Release' : function(headerMessage, activity, callback) {
		sendCardTypeMessage(headerMessage+"Planned Release changed ", activity, callback);
		// var values = getCardTypeValues(activity);
		// req.requestMingle({
		// 	host: data[0].mingle.host,
		// 	path: activity['new_value'][0].card[0]['$'].url,
		// 	hash: data[0].mingle.hash
		// },function(cardData) {
		// 	var name = "Name: " + cardData.card.name;
		// 	callback(headerMessage +"Planned Release changed "+values+".\n" + name);
		// });
	}
};


activityList['property-change'] = function(headerMessage, activity, callback) {
	if(activityList.pc[getNameOf(activity)])
		activityList.pc[getNameOf(activity)](headerMessage, activity, callback);
}

activityList['tag-addition'] = function(headerMessage, activity, callback) {
	callback(headerMessage + "Tag added : " + activity.tag[0]);
}

activityList['tag-deletion'] = function(headerMessage, activity, callback) {
	callback(headerMessage + "Tag removed : " + activity.tag[0]);
}