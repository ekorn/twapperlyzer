var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var conf = require('config');
var request = require('request');
var cradle = require('cradle');

/**
 *  A simple Object to transport the status of action
 */
function ResponseBean(){
  this.status;
  this.data;
  this.msg;
}

/**
 * Get JSON Data over the net
 *
 * @param {String} url
 * @param {Function} callback(`ResponseBean`)
 */
var getJSON = function (url,callback){
  //console.log("try to reach: ", url);
  request({ uri:url }, function (error, response, body) {
    var myresponse = new ResponseBean();
    if (error) {
      myresponse.status = "error";
      myresponse.msg = "Could not connect to: "+url;
    }else if(body[0]=="{" || body[0]=="["){
      myresponse.status = "ok";
      try {
        myresponse.data = JSON.parse(body);
      } catch (err) {
        myresponse.status = "error";
        console.log('GetJSON Error', err);
        myresponse.msg = 'Can not parse JSON :';
      }
    }
    else{
      myresponse.status = "error";
      myresponse.msg = "JSON not valid: ";
    }
    console.log('JSON response: ', myresponse.status, 'for: ',url);
    callback(myresponse);
  });
}

var regExUrls =  /((?:http|https):\/\/[a-z0-9\/\?=_#&%~-]+(\.[a-z0-9\/\?=_#&%~-]+)+)|(www(\.[a-z0-9\/\?=_#&%~-]+){2,})/gi;

function isURL(str){
  return regExUrls.test(str);
}

//Legancy no longer needed
function getDBParamsFromURL(dbUrl){
  var httpsRegEx = /(https):\/\//;
  var secure = httpsRegEx.test(dbUrl);
  dbUrl = dbUrl.replace("http://","");
  dbUrl = dbUrl.replace("https://","");
  var res = new Object();
  
  var userPassword;

  var hostPort;
  var tmp = _.words(dbUrl, "@");
  if(tmp.length == 2){
    userPassword = _.words(tmp[0], ":");
    //delete http if necessary 
    
    tmp2 = _.words(tmp[1], "/");
  }else{
    tmp2 = _.words(tmp[0], "/");
  }
    hostPort = _.words(tmp2[0], ":");
    if(tmp2.length ==3 ){
      res.doc = tmp2[2];
    }

    res.dbname = tmp2[1]
    
    
    var options = new Object ();
    
    if(secure){
      options.secure = true;
    }
    if(!_.isUndefined(userPassword)){
      options.auth = { username: userPassword[0], password: userPassword[1] };
    }
  

  res.host = hostPort[0];
  res.port = hostPort[1];
  res.options = options;
  
  return res;
}

function getDBConnectionFromConfig(dbConf, callback){
  var connection = new(cradle.Connection)(dbConf.host,dbConf.port, dbConf.options);

  connection.info(function (err, json) {
    if (err === null){
      console.log("Couchdb ("+json.version+") at "+dbConf.host+" connected.", json);
      var forenDb = connection.database(dbConf.dbname); 
      // Create the db if it doesn't exist.
      forenDb.exists(function (error, exists) {
              if (!exists) {
                forenDb.create( 
                  function(error, res){
                    if(error === null){
                      callback(null, forenDb, connection);
                    }else{
                      callback(error, null,null);
                    }
                  });
              }else callback(null, forenDb, connection);
      });
    }
    else{
      err.host = dbConf.host;
      callback(err, null);
      //console.log("info() failed to connect to couchdb : ", err);
    }
  });


}

function exist(param){
 return !(typeof param === 'undefined');
}

function convertMilliseconds (ms, p) {

        var pattern = p || "hh:mm:ss",
arrayPattern = pattern.split(":"),
clock = [ ],
hours = Math.floor ( ms / 3600000 ), // 1 Hour = 36000 Milliseconds
minuets = Math.floor (( ms % 3600000) / 60000), // 1 Minutes = 60000 Milliseconds
seconds = Math.floor ((( ms % 360000) % 60000) / 1000) // 1 Second = 1000 Milliseconds



// build the clock result
function createClock(unit){


// match the pattern to the corresponding variable
if (pattern.match(unit)) {
if (unit.match(/h/)) {
addUnitToClock(hours, unit);
}
if (unit.match(/m/)) {
addUnitToClock(minuets, unit);
}
if (unit.match(/s/)) {
addUnitToClock(seconds, unit);
};
}
}

function addUnitToClock(val, unit){

if ( val < 10 && unit.length === 2) {
val = "0" + val;
}

clock.push(val); // push the values into the clock array

}


// loop over the pattern building out the clock result
for ( var i = 0, j = arrayPattern.length; i < j; i ++ ){

createClock(arrayPattern[i]);

}

return {
hours : hours,
minuets : minuets,
seconds : seconds,
clock : clock.join(":")
};

}

//Module exports
exports.getDBConnectionFromConfig = getDBConnectionFromConfig;
exports.getJSON = getJSON;
exports.ResponseBean = ResponseBean;
exports.regExUrls = regExUrls;
exports.isURL = isURL
exports.convertMilliseconds = convertMilliseconds;
