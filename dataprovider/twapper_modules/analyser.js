
var fs = require('fs')
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
// expand an URL
var UrlExpander = require('url-expander');
var natural = require('natural');
var names;
getNamesToGender('./staticData/forenames2.txt', function(namesFromFile){names = namesFromFile});
var conf = require('config');
var keywords = require("./keywords.js");
rest = require('restler');
var helper = require('./helper.js');
var OAuth = require('oauth').OAuth;
var oAuth= new OAuth("http://twitter.com/oauth/request_token",
                 "http://twitter.com/oauth/access_token", 
                 conf.twitter.consumerKey,  conf.twitter.consumerSecret, 
                 "1.0A", null, "HMAC-SHA1");

var currentDate = 0;
var oneDay = 86400;
var oneHour = 3600;
var regExUsernames = /(^|\s)@(\w+)/g;
var regExHashtags  = /(^|\s)#(\w+)/g;
var regExUrls = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
var doAsync = true;
var calcLanguage = function(a,b){
  return (a+a+b)/3
};

function analyseMesseges(archiveInfo, callback){
  var urlStore = {};
	var response = {};
  var msgByDate = [];
  var languageStats = null;
  var questionsDoc = archiveInfo.questionsDoc;
  delete archiveInfo.questionsDoc;
  var tmpUsernames =[]; //List of all Users of this Analyse 
  var alchemyapi = conf.twapperlyzer.alchemyapi !== "";
  var hoursSaved = 0;
  var totalHours =0;
  var totalProgress = [];
  var allDone = 4;
  
  //Saving the augmentet archive-info
  var metaArchiveInfo = _.clone(archiveInfo);
  metaArchiveInfo.tweets = [];

  metaArchiveInfo.messagesSoFar += archiveInfo.tweets.length;
  metaArchiveInfo.status = "analysing";
  callback(null, metaArchiveInfo, function(err, res){
    totalProgress.push("metaInfo");
    console.log("metaInfo saved. ", totalProgress);
    if(totalProgress.length === allDone){
      analyseDone(metaArchiveInfo,callback);
    }
  });
  
  _.each(archiveInfo.tweets.reverse(), function(message){
    
    //The division by 100, cut the two trailing zeros, just for saving traffic for the client
    var date = getNormalisedDate(message.time)//100;
    msgByDate = aggrigateData(msgByDate, [date]);// Save the amount of tweets per hour and the normalised time(hour)
    
    //The Object for the hour
    var msgForCurrentDate = _.last(msgByDate);
    msgForCurrentDate.date = new Date (date *1000)
    var tmpMetaInfo = {};

    if(_.isUndefined(msgForCurrentDate.asyncCount)){
      msgForCurrentDate.asyncCount = 0; 
    }

    //=========================================
    
    //ReTweets
    if(_.isUndefined(msgForCurrentDate.rt)){
      msgForCurrentDate.rt = 0; 
      msgForCurrentDate.rtu = []; 
    }
    if(isReTweet(message.text)){
      msgForCurrentDate.rt++;
      tmpMetaInfo.isReTweet = true;
      msgForCurrentDate.rtu = aggrigateData(msgForCurrentDate.rtu, [message.from_user]); 
    }
    
    //Hashtags
    if(_.isUndefined(msgForCurrentDate.ht)){
      msgForCurrentDate.ht = []; //ht short for Hashtag, again for saving traffic data 
    }
    var hashtagsForMsg = message.text.match(regExHashtags);
    _.each(hashtagsForMsg, function(hastag, index){
        if (_.strip(archiveInfo.archive_info.keyword.toLowerCase()) === _.strip(hastag.toLowerCase())){
          removeFromArray(hashtagsForMsg,index);
        }else{
          hashtagsForMsg[index] = _.strip(hastag);
        }
        
      });
    tmpMetaInfo.hashtags = hashtagsForMsg;
    msgForCurrentDate.ht = getDataFromTextToArray(hashtagsForMsg, msgForCurrentDate.ht);

    //Urls
    if(_.isUndefined(msgForCurrentDate.rawUrls)){
      msgForCurrentDate.rawUrls = []; 
    }
    
    var urlsForMsg = message.text.match(regExUrls);
    if(urlsForMsg !== null){
      tmpMetaInfo.urls = urlsForMsg;
      msgForCurrentDate.rawUrls = msgForCurrentDate.rawUrls.concat(urlsForMsg);
    }else{
      tmpMetaInfo.urls = [];
    }
    //User
    if(_.isUndefined(msgForCurrentDate.un)){
      msgForCurrentDate.un = []; //un short for Usernames, again for saving traffic data 
    }
    msgForCurrentDate.un = aggrigateData(msgForCurrentDate.un, [message.from_user]); 
    tmpUsernames.push(message.from_user);

    //GEO 
    if(_.isUndefined(msgForCurrentDate.geo)){
      msgForCurrentDate.geo = []; //geo short for Geo Information, again for saving traffic data 
    }
    msgForCurrentDate.geo = getGeoMarkerFromMessage(message, msgForCurrentDate.geo);
    
    //ALL TEXT & Keywords
    if(_.isUndefined(msgForCurrentDate.alltext)){
      //msgForCurrentDate.alltext = ""; 
      msgForCurrentDate.keywords = []; 
      msgForCurrentDate.language = []; 
    }
    if(!tmpMetaInfo.isReTweet){
      //msgForCurrentDate.alltext+= " "+(message.text);
      var clearedText =  _.strip(keywords.clearText(message.text,  [regExUrls,regExHashtags,regExUsernames]));
      tmpMetaInfo.clearedText = clearedText;
      //Detect the language.
      var words;
      var detectedlanguage = keywords.detectLanguage(clearedText);
      
      if(detectedlanguage.length !== 0){//Some language is detected
        //Improve detection by adding knowledge about the previous detections
        var lang = keywords.improveLanguageDetection(detectedlanguage, calcLanguage, languageStats);
        languageStats = lang.languagesSoFar;//Save statistic for next round
        detectedlanguage = lang.languagesFromText[0][0]; //Save improved results
        tmpMetaInfo.detectedlanguage = detectedlanguage;
        //Filter common stopwords for the detected language 
        clearedText = _.strip(keywords.filterStopwords(detectedlanguage, clearedText));
        tmpMetaInfo.clearedText = clearedText;
        //Extract Keywords 
        words = keywords.extract(clearedText,{blacklist: ["RT",]});
        tmpMetaInfo.words = words;
      }else{
        words = keywords.extract(clearedText,{blacklist: ["RT"]});
        tmpMetaInfo.words = words;
      }

      msgForCurrentDate.keywords = aggrigateData(msgForCurrentDate.keywords, words);
      msgForCurrentDate.language = aggrigateData(msgForCurrentDate.language, [detectedlanguage]);
    }
    
    //Mentions
    if(_.isUndefined(msgForCurrentDate.me)){
      msgForCurrentDate.me = []; //me short for Mentions, again for saving traffic data 
    }
    var mentionsForMsg = message.text.match(regExUsernames);
    if(mentionsForMsg !== null){
      _.each(mentionsForMsg, function(mention, index){
        mentionsForMsg[index] =_.strip(mention).substring(1);
      });
    }else{
      mentionsForMsg = [];
    }
    msgForCurrentDate.me = getDataFromTextToArray(mentionsForMsg, msgForCurrentDate.me);
    tmpMetaInfo.mentions = mentionsForMsg;

    //Questions 
    if(isQuestion(message.text)){
      tmpMetaInfo.isQuestion = true;
      //var tmpQuestion = {"msg":message, "metaData": tmpMetaInfo, "answers":[] };
      var tmpQuestion = { "text": message.text, 
                          "id": message.id, 
                          "time": message.time, 
                          "from_user": message.from_user,
                          "profile_image_url": message.profile_image_url,
                          "metaData": { 
                          "mentions": tmpMetaInfo.mentions,
                          "detectedlanguage": tmpMetaInfo.detectedlanguage,
                          "words": tmpMetaInfo.words,
                          "hashtags": tmpMetaInfo.hashtags
                          },
                          "answers": [] };
      questionsDoc.questions.push(tmpQuestion);
    }
    
    //Finding answers to Questions
    if(!tmpMetaInfo.isReTweet){// A Retweet could not be answer 
      _.each(tmpMetaInfo.mentions, function(username){ //For every Mention we look for a Question
          _.each(questionsDoc.questions, function(question){//and get all questions
          
            if(question.from_user !== message.from_user && // The case that someone will answer his own questions is not covered.
               _.include(tmpMetaInfo.mentions, question.from_user) && //This person mentions the questioner
               !_.any(question.answers, function(answer){return answer.text === message.text})){ //The answer should not been given already
                if(question.metaData.mentions.length !== 0){ //The question is directed to someone
                  if(_.include(question.metaData.mentions, message.from_user)){ //The questioner mentions this person
                    var msgRating = rateAnswer(question, message, tmpMetaInfo, username);
                    if(msgRating>0){
                      question.answers.push({"text": message.text, "id": message.id, "time": message.time, "from_user": message.from_user,"profile_image_url": message.profile_image_url, "weight": msgRating});
                      //question.answers.push({"un": message.from_user, "text": message.text, "weight": msgRating, "tmpMetaInfo": tmpMetaInfo});
                    }
                  }
                }else{ //It is a undirected question.
                  var msgRating = rateAnswer(question, message, tmpMetaInfo, username);
                  if(msgRating>0){
                    question.answers.push({"text": message.text, "id": message.id, "time": message.time, "from_user": message.from_user,"profile_image_url": message.profile_image_url, "weight": msgRating});
                    //question.answers.push({"un":message.from_user, "text": message.text, "weight":msgRating, "tmpMetaInfo":tmpMetaInfo});
                  }
                }
            }
          });

      });
    }
    //Async Part
    if(doAsync){
      //Sentiment
      if(_.isUndefined(msgForCurrentDate.sentiment)){
        msgForCurrentDate.sentiment = {"positive":0,"neutral":0,"negative":0};
      }
      msgForCurrentDate.asyncCount++;
      getSentiment(message.text, tmpMetaInfo.detectedlanguage, function(err, data){
        msgForCurrentDate.asyncCount--;
        
        if(data === "positive" ) msgForCurrentDate.sentiment.positive++;
        else if(data === "neutral" ) msgForCurrentDate.sentiment.neutral++;
        else if(data === "negative" ) msgForCurrentDate.sentiment.negative++;
        
        if(msgForCurrentDate.asyncCount == 0){
          delete msgForCurrentDate.asyncCount;
          saveTheHour(msgForCurrentDate, callback);
        }
        
      });
    }
  });
  
  totalHours = msgByDate.length;
  //Go through the aggregated by hour results
  _.each(msgByDate, function(msgForCurrentDate){
    if(doAsync){
      //Expand the Urls for this hour
      msgForCurrentDate.urls = [];
      //Try to expand via cache lookup
      msgForCurrentDate.rawUrls = _.reject(msgForCurrentDate.rawUrls, function(url){
        if(!_.isUndefined(urlStore[url])){
          msgForCurrentDate.urls = getDataFromTextToArray([urlStore[url]], msgForCurrentDate.urls);
          return true;
        }else
          return false;
        });
      //If urls left make a real expand
      if(msgForCurrentDate.rawUrls.length >0){
        //First reduce the amount od urls to look up to the min
        var unkownUrls = _.uniq(msgForCurrentDate.rawUrls);
        //Signal that we Do a Async Opration
        msgForCurrentDate.asyncCount++;
        var expander = new UrlExpander(unkownUrls);
        // the "expanded" event is emitted once after all urls have been expanded
        expander.on('expanded', function (originalUrls, expandedUrls) {
          msgForCurrentDate.asyncCount--;
          //Extending  the urlStore
          for(var i = 0; i<originalUrls.length; i++){
            urlStore[originalUrls[i]] = expandedUrls[i];
          }
          //expand the rest via cache lookup
          _.each(msgForCurrentDate.rawUrls, function(url){
            msgForCurrentDate.urls = getDataFromTextToArray([urlStore[url]], msgForCurrentDate.urls);
          });
          
          //console.log("msgForCurrentDate.urls",msgForCurrentDate.urls, msgForCurrentDate.rawUrls);
          delete msgForCurrentDate.rawUrls;
          
          if(msgForCurrentDate.asyncCount == 0){
            delete msgForCurrentDate.asyncCount;
            saveTheHour(msgForCurrentDate, callback);
          }

        });
        expander.expand();
      }else{
        delete msgForCurrentDate.rawUrls;
      }
    }
  });
  //Stuff that has to be done once after the analyse is done
  
  if(doAsync){
    //Getting User Info From twitter
    var uniqUsers = _.uniq(tmpUsernames);
    getUserInfo(uniqUsers,callback, function(err,res){
      totalProgress.push("users");
      if (err)  console.log("error while saving users. ", totalProgress, err);
      else console.log("users saved. ", totalProgress);
      
      if(totalProgress.length === allDone){
        analyseDone(metaArchiveInfo,callback);
      }
    });
  }
  
  
  //sorting the answers 
  
  //Saving the augmentet questionsDoc
  _.each(questionsDoc.questions, function(qu){
    function sortAnswers(a,b){ 
      return b.weight - a.weight;
    };
  
    qu.answers.sort(sortAnswers);
  });
  callback(null, questionsDoc, function(err, res){
    totalProgress.push("questions");
    console.log("questions saved. ", totalProgress);
    if(totalProgress.length === allDone){
      analyseDone(metaArchiveInfo,callback);
    }
  });

    
  if(!doAsync){
    //callback(null, msgByDate);
  }
  
  //Sub Functions
  function getSentiment(text, lang, callback){
    if(alchemyapi === true && lang === "english"){
      rest.post('http://access.alchemyapi.com/calls/html/HTMLGetTextSentiment', {
        data: { apikey: conf.twapperlyzer.alchemyapi,
        outputMode: "json",
        html: text,
        },
      }).on('complete', function(data, response) {
        if(data.status == 'ERROR' && data.statusInfo == 'daily-transaction-limit-exceeded') {
          alchemyapi = false;
          getSentiment(text, lang, callback);
          
        }else if(data.docSentiment){
          callback(null, data.docSentiment.type);
        }else{
          alchemyapi = false;
          getSentiment(text, lang,callback);
        }
      });
    }else{
      rest.get("http://data.tweetsentiments.com:8080/api/analyze.json?q="+encodeURIComponent(text+" food")).on('complete', function(data) {
        callback(null, data.sentiment.name.toLowerCase());
      });
    }
  }
  
  function saveTheHour(hour, save){
    hour.type = "hourData";
    hour._id = archiveInfo._id+"-"+hour.text
    
    save(null, hour, function(err, res){
      hoursSaved++;
      //console.log("saved "+hoursSaved+" hours of "+totalHours, res);
      if(hoursSaved === totalHours){
        totalProgress.push("hours");
        console.log(hoursSaved+" hours saved.", totalProgress);
        if(totalProgress.length === allDone){
          analyseDone(metaArchiveInfo,save);
        }
      }
    });
  }
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
  return text.substring(0,4) === "RT @" || text.substring(0,1) === "♺";
  
}

function isQuestion(text){
  return !isReTweet(text) && text.indexOf("?") !== -1
}

/**
 *Anlalyse a given Text with the regex and aggregate the 
 *result in the target. 
 */
function getDataFromTextToArray(tmpData, target, reject){
  
  if(tmpData != null && reject != null){
    var tmpData = _.reject(tmpData, function(data){
      return (_.strip(data.toLowerCase()) === reject.toLowerCase() ); 
    }); 
  }
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
 * @param{Number} add The count of newData
 * @return{Array} dataSoFar The augmented Array
 */
function aggrigateData(dataSoFar, newData, add){
  for (var i = 0; i < newData.length; i++){
    entry = _.detect(dataSoFar, function(entity){
     return (entity.text.toLowerCase() ==  _.strip(newData[i]).toLowerCase());
    });
    
    if(_.isUndefined(entry)){
      var entry = {};
      entry.text = _.strip(newData[i]);
      if(!_.isUndefined(add)){
        entry.weight = add;
      }else{
        entry.weight = 1;
      }
      dataSoFar.push(entry);
    }else{
      if(!_.isUndefined(add)){
        entry.weight += add;
      }else{
        entry.weight++;
      }
    }
  }
  return dataSoFar;
}
function aggrigateAggrigatedData(dataSoFar, newData){
  _.each(newData, function(entry){
    dataSoFar = aggrigateData(dataSoFar, entry.text, entry.weight);
  });
  return dataSoFar;
}

function isInGeo(data, lat,lon) {
  for(var i=0; i<data.length; i++) {
    if(data[i].lat === lat && data[i].lon == lon)
      return i;
  }
  return -1;
}

function aggrigateGeo(values) {
  var res = [];
  values.forEach( function (arrays) {
    arrays.forEach( function (point) {
      var pos = isInGeo(res, point.lat, point.lon);
      if(pos !== -1) {
        var users = point.users;
        users.forEach(function (user){
          var upos = isIn(users, user.text);
          if(upos !== -1){
            users[upos].tweets = users[upos].tweets.concat(user.tweets);
          }else{
            res[pos].users.push(user)
          }
        });
        
      } else {
        res.push(point);
      }
    });
  });
  return res;
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
      return (marker.lat == message.geo_coordinates_0 && marker.lon == message.geo_coordinates_1);
      });
    if(_.isUndefined(wasSeen)){
      //Setting uo a new marker with a position
      var geoMarkerInfo = {};
      geoMarkerInfo.lat = message.geo_coordinates_0;
      geoMarkerInfo.lon = message.geo_coordinates_1;
      
      //a user with name
      var user = {};
      user.text = message.from_user;
              
      //and the tweetID + time
      user.tweets = [];
      //var newTweet = {};
      //newTweet.id = message.id;
      //newTweet.time = message.time; //No need for time in new version
      user.tweets.push(message.id);
      
      //adding the user to marker
      geoMarkerInfo.users = new Array(user);

      geoMarkerSoFar.push(geoMarkerInfo);
    }else{
      //detect if it is the same user as last time
      var user =  _.detect(wasSeen.users, function(user){
        return (user.text == message.from_user);
      });
      if(_.isUndefined(user)){
        //A new User
        user = {};
        user.text = message.from_user;
        
        //Set up his tweet Array
        user.tweets = [];
        //var newTweet = {};
        //newTweet.id = message.id;
        //newTweet.time = message.time;//No need for time in new version
        user.tweets.push(message.id);
        
        wasSeen.users.push(user);
      }else{
        //Just add the new tweet to the existing Array
        //var newTweet = {};
        //newTweet.id = message.id;
        //newTweet.time = message.time;//No need for time in new version
        user.tweets.push(message.id);
      }
    }
  }

  return geoMarkerSoFar;
}
//https://dev.twitter.com/docs/api/1/get/users/lookup
//http://api.twitter.com/1/users/lookup.xml?screen_name=usernameA,usernameB,... max 20
//http://api.twitter.com/1/users/lookup.xml?user_id=99723,92162698,12854372&screen_name=rsarver,wilhelmbierbaum
function getUserInfo(users,save, callback){
  var userlist = "";
  var sendCounter =0;
  var errors=[];
  _.each(users, function(user, index){
      userlist += ","+user
      if((index+1) % 99 === 0){
        fetchUserData(userlist.substring(1), handleUsers);
        userlist = "";
      }
  });

  if(userlist !== ""){
    fetchUserData(userlist.substring(1), handleUsers);
  }
  
  function handleUsers(err, data){
          if (err) {
            errors.push(err);
            sendCounter--;
            if(sendCounter === 0){
                callback(errors, null);
            }
          }
          else{
            sendCounter++;
            saveUsers(data, save, function(){
              sendCounter--;
              if(sendCounter === 0){
                if(errors.length === 0){
                callback(null,null);
                }else{
                  callback(errors, null);
                }
              }
            });
          }
        }
  

  
}
function saveUsers(users, save, callback){
  var finalUsers = [];
  _.each(users, function(userdata){
    var userinfo = {};

    //General Info
    userinfo._id = ""+userdata.id;
    userinfo.type = "user";
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
    userinfo.listed_count = userdata.listed_count;
    
    finalUsers.push(userinfo);
  });
  _.each(finalUsers, function(user){
      save(null, user, function(err, res){
          if (err) {
              console.log("Save User Error",err);
              throw err;
            }
            callback();
      });
  });

}

/*Fetch the User Data from twitter if a errroro occur it is not that 
 * bad cause maybe the user is already in the DB and if not than the 
 * result is not to much influenced and get better with the next update
*/
function fetchUserData(users,callback){
  oAuth.get("http://api.twitter.com/1/users/lookup.json?screen_name="+users+"&include_entities=false", conf.twitter.accessToken, conf.twitter.accessTokenSecret, function(error, userdata) {
    if(error){
      callback({"error":error, "users":users }, null);
    }else{
      var userdata = JSON.parse(userdata);
      callback(null,userdata);
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
    oldVar = [];
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



function rateAnswer(question, message, tmpMetaInfo, username){
  var res = 0;//Should be between 0-1
  var influnenceCount = 0
  /*
  //The questioner mentions this person
  if(_.include(question.metaData.mentions, message.from_user)){
    res +=1;
  }

  //The this person mentions the questioner
  if(_.include(tmpMetaInfo.mentions, question.msg.from_user)){
    res +=1;
  }
  */
  //Both question and answer is in he same language 
  if(question.metaData.detectedlanguage === tmpMetaInfo.detectedlanguage){
    res +=0.5;
  }
  //Both question and answer have keywords in common
  _.each(question.metaData.words, function(word){
      if(_.any(tmpMetaInfo.words, function(aWord){ return natural.PorterStemmer.stem(aWord) === natural.PorterStemmer.stem(word) ;})){
        res +=0.5;
      }
    });
  //Both question and answer have hashtags in common
  _.each(question.metaData.hashtags, function(hashtag){
      if(_.any(tmpMetaInfo.hashtags, function(aHashtag){ return aHashtag.toLowerCase() === hashtag.toLowerCase() ;} )){
        res +=1;
      }
    });
    return res;
}

function getNormalisedDate(epoch){
  if(epoch > currentDate + oneHour){
    currentDate = epochYMD(epoch);
  }
  return currentDate;
}

function epochYMD(epoch){
  var date = new Date(epoch * 1000)
  //date.setUTCHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.getTime()/1000;
}

function removeFromArray (array, from, to) {
  var rest = array.slice((to || from) + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  return array.push.apply(array, rest);
};

function analyseDone(metaArchiveInfo, callback){
    metaArchiveInfo.status = "done";
    callback(null,metaArchiveInfo);
}
//Module exports
exports.aggrigateGeo = aggrigateGeo;
exports.aggrigateAggrigatedData = aggrigateAggrigatedData;
exports.aggrigateData = aggrigateData;
exports.analyseMesseges = analyseMesseges;
exports.getUserInfo = getUserInfo;
exports.getNamesToGender = getNamesToGender;
