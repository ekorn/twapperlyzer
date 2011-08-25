
var fs = require('fs')
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
// expand an URL
var unshortener = require('unshortener');
var names;
getNamesToGender('./staticData/forenames2.txt', function(namesFromFile){names = namesFromFile});
var oauth = require('oauth');
var OAuth= oauth.OAuth;
var conf = require('config');
var helper = require('./helper.js');
var oAuth= new OAuth("http://twitter.com/oauth/request_token",
                 "http://twitter.com/oauth/access_token", 
                 conf.twitter.consumerKey,  conf.twitter.consumerSecret, 
                 "1.0A", null, "HMAC-SHA1"); 

function analyseMesseges(archiveInfo, callback){

  var messages = archiveInfo.tweets;
  var regExUsernames = /(^|\s)@(\w+)/g;
  var regExHashtags  = /(^|\s)#(\w+)/g;
  
  var usernames = new Array();
  var shortUrls = new Array();
  archiveInfo.rtUser = new Array();
  archiveInfo.questioner = new Array();
  
  for (var i = 0; i < messages.length; i++){
    
    //Synchronous
    archiveInfo.geoMarker = getGeoMarkerFromMessage(messages[i], archiveInfo.geoMarker);
    
    archiveInfo.mentions = getDataFromTextToArray(regExUsernames, messages[i].text, archiveInfo.mentions);
    
    archiveInfo.hashtags = getDataFromTextToArray(regExHashtags, messages[i].text, archiveInfo.hashtags);
    
    shortUrls = getDataFromTextToArray(helper.regExUrls, messages[i].text, shortUrls);
    
    usernames = aggrigateData(usernames, new Array(messages[i].from_user));
    
    
    if(isReTweet(messages[i].text)){
      archiveInfo.rtUser =  aggrigateData(archiveInfo.rtUser, new Array(messages[i].from_user));
    }
    
    if(isQustion(messages[i].text)){
      archiveInfo.questioner =  aggrigateData(archiveInfo.questioner,new Array(messages[i].from_user));
    }
  }
  
  //Data aggregated
  //Synchronous callbacks
  var response = new Object();
  response.geoMarker = archiveInfo.geoMarker;

  archiveInfo.hashtags = _.reject(archiveInfo.hashtags, function(hashtag){
    return (hashtag.text.toLowerCase() == archiveInfo.archive_info.keyword.toLowerCase() );
  }); 
  archiveInfo.hashtags = (_.sortBy(archiveInfo.hashtags, function(entry){return entry.weight})).reverse();
  response.hashtags = archiveInfo.hashtags;

  _.each(archiveInfo.mentions, function(username){
    if(username.text.charAt(0) == "@"){
      username.text = username.text.substring(1, username.text.length);
    }

  });
  archiveInfo.mentions = (_.sortBy(archiveInfo.mentions, function(entry){return entry.weight})).reverse();
  response.mentions = archiveInfo.mentions;

  response.messagesSoFar = archiveInfo.messagesSoFar + messages.length;
  response.archive_info = archiveInfo.archive_info;
  response.rtUser = (_.sortBy(archiveInfo.rtUser, function(entry){return entry.weight})).reverse(); 
  response.questioner = (_.sortBy(archiveInfo.questioner, function(entry){return entry.weight})).reverse();
  
  console.log("archiveInfo.archive_info",archiveInfo.archive_info);
  callback(response);  

  //A-Synchronous Callbacks
  
/*
  for (var i = 0; i <usernames.length; i++){
    getUserInfo(usernames[i], function(user){
      archiveInfo.users.push(user)
      
      if(usernames.length == archiveInfo.users.length){
        archiveInfo.users = (_.sortBy(archiveInfo.users, function(userinfo){return userinfo.amountOfTweetsInArichve})).reverse();
        var response = new Object();
        response.users = archiveInfo.users;
        callback(response);  
      }
    });
  }
  

  archiveInfo.urls = expandUrls(shortUrls, archiveInfo.urls, callback);
*/
}


/* every short URL has to be expanded cause maybe serval short ones lead 
 * to the same real url. By first aggregate the short urls, expand it and
 * aggregate it angain I make sure that a minimum time is used for 
 * expanding urls.
 * 
 */
function expandUrls(shortUrls, realUrls, callback){
  var urlCount = 0;
  var lastPercentCount = 0;
  var realUrls;
  var timeoutid;
  _.each(shortUrls, function(shortUrl){
    if(shortUrl.text.length<30){
      try{
        unshortener.expand(shortUrl.text, handleRealURL );
      }catch(e){
        console.log("unshortener.expand : "+shortUrl.text, e);
      }
    }else{
      handleRealURL({href:shortUrl.text});
    }
    function handleRealURL(realUrl){
      
      // url is a url object
      urlCount++;
      realUrls = aggrigateData(realUrls, new Array(realUrl.href), shortUrl.weight);
      var currentPercentige = getProgessInPercent(urlCount,shortUrls.length);
      
      if(currentPercentige > lastPercentCount){
        console.log("got "+urlCount+" of "+shortUrls.length+" ("+currentPercentige+"%) of the URLs", realUrl);
        lastPercentCount = currentPercentige;
      }
      if(urlCount == shortUrls.length){
        sendResponse();
      }else{
        clearTimeout(timeoutid);
        timeoutid = setTimeout(sendResponse, 10000);
      }
    }
    
    function sendResponse(){
      realUrls = (_.sortBy(realUrls, function(url){return url.weight})).reverse();
      var response = new Object();
      response.urls = realUrls;
      callback(response);
    }
  });
}


/**
 * calulate the percentage of something
 * @param {Number} percentage
 * @param {Number} base
 */
function getProgessInPercent(percentage,base){
  return Math.floor((percentage/(base/100)));
}

/**
 *Test a given Text is a Retweet 
 */
function isReTweet(text){
  console.log(text.substring(0,4), text.substring(0,3).length);
  return text.substring(0,4) === "RT @"
  
}

function isQustion(text){
  return text.indexOf("?") !== -1
}

/**
 *Anlalyse a given Text with the regex and aggregate the 
 *result in the target. 
 */
function getDataFromTextToArray(regEx, text, target){
    var tmpData = text.match(regEx);

    if(tmpData != null){
      return aggrigateData(target, tmpData);
    }
    return target;
}
/**
 * Aggigate Array with String to a Array where each string is unique
 * with a count reflecting the amount of occurrence.
 * 
 * @param{Array} dataSoFar The data that is allready aggregated
 * @param{Array} newData The array with strings
 * @param{Number} multiply The count of newData
 * @return{Array} dataSoFar The augmented Array
 */
function aggrigateData(dataSoFar, newData, multiply){
  for (var i = 0; i < newData.length; i++){
    entry = _.detect(dataSoFar, function(entity){
     return (entity.text ==  _.strip(newData[i]));
    });
    
    if(_.isUndefined(entry)){
      var entry = new Object();
      entry.text = _.strip(newData[i]);
      if(!_.isUndefined(multiply)){
        entry.weight = multiply;
      }else{
        entry.weight = 1;
      }
      dataSoFar.push(entry);
    }else{
      if(!_.isUndefined(multiply)){
        entry.weight += multiply;
      }else{
        entry.weight++;
      }
    }
  }
  return dataSoFar;
}

/**
 * Search for messages that are have a geo tag and aggregate 
 * them if the are on the same position.
 * 
 * @param{Array} messages The Messages that came from twapperkeeper
 * @return{Array} res The aggregated geo Positions of in input Array
 */
function getGeoMarkerFromMessage(message, geoMarkerSoFar){
//console.log("message",message);
  if(message.geo_coordinates_0 != 0 || message.geo_coordinates_1 != 0){
    //detect if the was already a message send at this place
    var wasSeen =  _.detect(geoMarkerSoFar, function(marker){
      return (marker.lat == message.geo_coordinates_0 && marker.long == message.geo_coordinates_1);
      });
    if(_.isUndefined(wasSeen)){
      //Setting uo a new marker with a position
      var geoMarkerInfo = new Object();
      geoMarkerInfo.lat = message.geo_coordinates_0;
      geoMarkerInfo.long = message.geo_coordinates_1;
      
      //a user with name
      var user = new Object();
      user.name = message.from_user;
              
      //and the tweetID + time
      user.tweets = new Array();
      var newTweet = new Object();
      newTweet.id = message.id;
      newTweet.time = message.time;
      user.tweets.push(newTweet);
      
      //adding the user to marker
      geoMarkerInfo.users = new Array(user);

      geoMarkerSoFar.push(geoMarkerInfo);
    }else{
      //detect if it is the same user as last time
      var user =  _.detect(wasSeen.users, function(user){
        return (user.name == message.from_user);
      });
      if(_.isUndefined(user)){
        //A new User
        user = new Object();
        user.name = message.from_user;
        
        //Set up his tweet Array
        user.tweets = new Array();
        var newTweet = new Object();
        newTweet.id = message.id;
        newTweet.time = message.time;
        user.tweets.push(newTweet);
        
        wasSeen.users.push(user);
      }else{
        //Just add the new tweet to the existing Array
        var newTweet = new Object();
        newTweet.id = message.id;
        newTweet.time = message.time;
        user.tweets.push(newTweet);
      }
    }
  }

  return geoMarkerSoFar;
}

function getUserInfo(user, callback){

  oAuth.get("http://api.twitter.com/1/users/show.json?screen_name="+user.text+"&include_entities=false", conf.twitter.accessToken, conf.twitter.accessTokenSecret, function(error, userdata) {
    if(error){
      console.log("could not fetch Userdata for "+user.text, error);
    }else{
        var userdata = JSON.parse(userdata);
        var userinfo = new Object();

        //General Info
        userinfo.name = userdata.name;
        userinfo.screen_name = userdata.screen_name;
        userinfo.url = userdata.url;
        userinfo.gender = getGender(names, userdata.name);
        
        
        //Geo Info
        userinfo.location = userdata.location;
        userinfo.time_zone = userdata.time_zone;
        userinfo.lang = userdata.lang;
        
        //Statistics
        userinfo.statuses_count = userdata.statuses_count;
        userinfo.followers_count = userdata.followers_count;
        userinfo.friends_count = userdata.friends_count;
        userinfo.amountOfTweetsInArichve = user.weight;
        userinfo.listed_count = userdata.listed_count;

        callback(userinfo);
    }
  });
}

function getGender(namesdb, name){
  var parts = _.words(name, delimiter=/[ _,-]/);
  if(parts.length == 1){
    parts = name.replace(/([A-Z]+)/g, '_$1').replace(/^_/, '').split("_");
  }
  for (var i = 0; i <parts.length ; i++){
    parts[i]=parts[i].toLowerCase();
  }
  
  var gender ="m,f";
  /*
  if(parts.length == 1){
    if(!_.isUndefined(namesdb[parts[0]])){
      gender = namesdb[parts[0]];
    }else{
      for (var i = 0; i <parts[0].length ; i++){
        var partOfName = parts[0].substring(0,i+1);
        if(!_.isUndefined(namesdb[partOfName])){
          gender = namesdb[partOfName];
          break;
          
        }
      }
    }
  }else{
  */
    var genderIndicator = _.detect(parts, function(part){
      return (!_.isUndefined(namesdb[part]) && namesdb[part] != "m,f")
    })
    if(!_.isUndefined(genderIndicator)){
        gender = namesdb[genderIndicator];
    }
  //}
  return gender;
}

function clear(oldVar){
  var newVar;
  if(_.isArray(oldVar)){
    newVar = oldVar;
    oldVar = new Array();
    return newVar;
  }else{
    newVar = oldVar;
    oldVar = null;
    return newVar;
  }
}

function getNamesToGender(fileName, callback){
  var names = new Object;
  var stream = fs.createReadStream(fileName);
  var header = null;


  fs.readFile(fileName, function (err, data) {
    if (err) throw err;
    
    var lines = _.lines(data.toString());
    if(_.isNull(header)){
      header = _.words(lines.shift(), delimiter="\t");
    }
    _.each(lines, function(line){
      if(line != ""){
        var parts =_.words(line, delimiter="\t");
        if(parts[1] != "m,f")
          names[parts[0]] = parts[1];
      }
    });
    callback(names);
  });
}

//Module exports
exports.analyseMesseges = analyseMesseges;
exports.getUserInfo = getUserInfo;
exports.getNamesToGender = getNamesToGender;
exports.expandUrls = expandUrls;
