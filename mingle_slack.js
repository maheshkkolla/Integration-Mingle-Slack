var fs = require('fs');
var Slack = require('slack-node');
var activityList = require('./activityList.js');
var req = require('./request.js');
var domain = require('domain').create();
var data = JSON.parse(fs.readFileSync("./config.json"));
var LAST_UPDATED_FILE_NAME = "./lastUpdated.json";
var lastUpdated = JSON.parse(fs.readFileSync(LAST_UPDATED_FILE_NAME));

var ms = {};
exports.ms = ms;

ms.createLastUpdateForTest = function(path) {
	LAST_UPDATED_FILE_NAME = path;
	lastUpdated = JSON.parse(fs.readFileSync(path));
}

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

var getFilteredEvents = function(mingleData) {
	var events = mingleData.feed.entry;
	events = events.filter(isUnUpdated);
	events = events.filter(isCardEvent);
	return events;
}

var getHeader = function(event) {
	return {
		message: "<"+event.link[1]['$'].href +"|"+ event.title[0]+">\n",
		author: event.author[0].name[0]
	}; 
}

var getTypeOf = function(activity) {
	return activity['$'].type;
}

var getNameOfPCA = function(activity) {
	return activity.property_definition[0].name[0];
}

var getActivities = function(event) {
	return event.content[0].changes[0].change || [];
}

var getFilteredActivities = function(event) {
	var activities = getActivities(event);
	return activities.filter(function(activity) {
		var activityType = getTypeOf(activity);
		if(activityList[activityType]) return true;
		return false;
	});
}

var handleEvent = function(event, callback) {
	var activities = getFilteredActivities(event);
	if(activities.length > 0){
		var header = getHeader(event);
		activities.forEach(function(activity) {
			activity.header = header;
			activityList[getTypeOf(activity)](activity, callback);
		});	
	} else callback(null, "Filtered all activities. Not Updating ...");
}

var handleEvents = function(events, callback) {
	events.forEach(function(event) {
		handleEvent(event,callback);
	});
}

var updateLastUpdatedValue = function(newValue,project) {
	lastUpdated[project] = newValue;
	fs.writeFileSync(LAST_UPDATED_FILE_NAME, JSON.stringify(lastUpdated));
}

ms.manupilateMingleData = function(mingleData, callback) { // callback with messages
	var events = getFilteredEvents(mingleData);
	if(events.length>0){
		handleEvents(events, callback);
		updateLastUpdatedValue(mingleData.feed.updated[0],getProjectOf(events[0])); 
	} else callback(null,"No important events to update");
}

var sendToSlack = function(message, slackData) {
	var slack = new Slack();
	slack.setWebhook(slackData.webhook);
 	slack.webhook({
		channel: slackData.channel,
		username: slackData.userName,
		text: message
	} ,function(err,response){
		err && console.log("["+new Date()+"]\tError at sending message to slack:",err);
		console.log("["+new Date()+"]\tResponse from slack:",response.status);
	});
}

var runForEach = function(apiData) {
	req.requestMingle(apiData.mingle, function(mingleData) {
		ms.manupilateMingleData(mingleData, function(message, log) {
			log && console.log("["+new Date()+"]\t"+log);
			message && sendToSlack(message, apiData.slack);
		});
	});
}

var run = function() {
	console.log("["+new Date()+"]\tRequesting Mingle ...")
	data.forEach(runForEach);
	setTimeout(run,10000);
}


domain.on('error', function(error) {
	console.log("["+new Date()+"]\t***** Error occurred: *****\n"+error);
	console.log("\n##### Program didn,t stop, It is Running #####\n")
});

domain.run(run);
