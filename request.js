var ob = {};
module.exports = ob;
var https = require('https');
var parser = require('xml2js').Parser();



var handleMingleError = function(error) {
  console.log('Error in requesting mingle: ' + error.message);
};

var getHttpRequest = function(options, callback) {
	var mingleData = "";
	return https.request(options, function (response) {
		response.on('error', handleMingleError);
		response.on('data', function(chunck) {
			mingleData += chunck;
		});
		response.on('end', function() {
			parser.parseString(mingleData, function(err, result) {
				if(err) console.log("Error occurred while parsing mingle data:",err);
				else callback(result);
			}); 
		});
	});	
}

var getOptionsFrom = function(mingle) {
	return {
		host: mingle.host,
		path: mingle.path,
		method: 'GET',
		headers: {
			"Authorization" : "Basic " + mingle.hash
		}
	};
}

ob.requestMingle = function(mingle,callback,options) {
	var options = getOptionsFrom(mingle);
	var httpRequest = getHttpRequest(options, callback);
	httpRequest.end();
}
