var fs = require('fs');
var lastUpdated = JSON.parse(fs.readFileSync("./lastUpdated.json"));
var Slack = require('slack-node');
var activityList = require('./activityList.js');
var data = JSON.parse(fs.readFileSync("./data.json"));
var req = require('./request.js');

var getProjectOf = function(event) {
	return event.id[0].split("/")[4];
}

var getTimeOf = function(event) {
  return event.updated[0];
}

var isUnUpdated = function(event) {
	var project = getProjectOf(event);
	if(!lastUpdated[project]) return true;
	return (getTimeOf(event) > lastUpdated[project]);
}

var isCardEvent = function(event) {
	return(event.category[0]['$'].term == 'card');
}

var getUnUpdatedEventsFromMingleData = function(mingleData) {
	var events = mingleData.feed.entry;
	events = events.filter(isUnUpdated);
	events = events.filter(isCardEvent);
	return events;
}

var getHeaderMessage = function(event) {
	var messageToSend = "--- New Event ---\n";
	messageToSend += "Title: " + event.title[0];
	messageToSend += "\nAuthor: " + event.author[0].name[0];
	messageToSend += "\t\tUpdated At: " + new Date(event.updated[0]).toString()+"\n";
	return messageToSend; 
}

var getTypeOf = function(activity) {
	return activity['$'].type;
}

var getNameOfPCA = function(activity) {
	return activity.property_definition[0].name[0];
}

var arePresent = function(activities) {
	var present = false;
	activities.forEach(function(activity){
		var activityType = getTypeOf(activity);
		if(activityType == 'property-change' && activityList.pc[getNameOfPCA(activity)]) present=true; 
		if(activityList[activityType]) present=true;
	});
	return present;
}

var getActivities = function(event) {
	return event.content[0].changes[0].change;
}


var handleEvent = function(event, callback) {
	var activities = getActivities(event);
	if(arePresent(activities)){
		var headerMessage = getHeaderMessage(event);

		activities.forEach(function(activity) {
			if(activityList[getTypeOf(activity)])
			activityList[getTypeOf(activity)](headerMessage,activity, callback);
		});	
	}
}

var handleEvents = function(events, callback) {
	events.forEach(function(event) {
		handleEvent(event,callback);
	});
}

var updateLastUpdatedValue = function(newValue,project) {
	lastUpdated[project] = newValue;
	fs.writeFileSync("./lastUpdated.json", JSON.stringify(lastUpdated));
}

var manupilateMingleData = function(mingleData, callback) { // callback with messages
	var events = getUnUpdatedEventsFromMingleData(mingleData);
	if(events.length>0){
		console.log("Updating "+ events.length +" events");
		handleEvents(events, callback);
		updateLastUpdatedValue(mingleData.feed.updated[0],getProjectOf(events[0])); 
	} else console.log("No important events to Update");
}

var sendToSlack = function(message, slackData) {
	var slack = new Slack();
	slack.setWebhook(slackData.webhook);
 	slack.webhook({
		channel: slackData.channel,
		username: slackData.userName,
		text: message
	} ,function(err,response){
		err && console.log("Error at sending message to slack:",err);
		console.log("Response from slack:",response.status);
	});
}

var runForEach = function(apiData) {
	req.requestMingle(apiData.mingle, function(mingleData) {
		manupilateMingleData(mingleData, function(messages) {
			sendToSlack(messages, apiData.slack);
		});
	});
}

var run = function() {
	console.log("Requesting Mingle ...")
	data.forEach(runForEach);
	setTimeout(run,10000);
}

run();