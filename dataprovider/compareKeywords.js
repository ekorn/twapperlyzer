var analyser = require('./twapper_modules/analyser.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var fs = require('fs');
rest = require('restler');
var keywords = require("keywords");
var helper = require('./twapper_modules/helper.js');
var conf = require('config');
var conn;
var db;
var regExUsernames = /(^|\s)@(\w+)/g;
var regExHashtags  = /(^|\s)#(\w+)/g;
var regExUrls = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
var languageStats = null;
var calcLanguage = function(a,b){
  return (a+a+b)/3
}

fs.readFile("./staticData/knowaan.json", function (err, data) {
    if (err) throw err;
    var archive = JSON.parse(data);
    var keywordsFromArchive = [];

    var tweets = [];
    _.each(archive.tweets, function(tweet){
      if(!isReTweet(tweet.text)){
        tweets.push(tweet.text);
      }
    });
    
    var calcLater = _.after(tweets.length, function(){
      fs.writeFile('compareKeywords.json', JSON.stringify(keywordsFromArchive), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
      });
    });
    
    _.each(tweets, function(tweet){
        send(_.strip(keywords.clearText(tweet,  [regExUrls,regExHashtags,regExUsernames])), function(data){
          keywordsFromArchive.push(data); 
          calcLater();
        });
    });


});

function send(text,callback){
  
  var res = {};
  res.text = text;
  var logLater = _.after(2, function(){callback(res)});
//A-SYNC

  rest.post('http://access.alchemyapi.com/calls/text/TextGetRankedKeywords', {
    data: { apikey: "2141aac411021f443955d8221cc726b549829462",
    outputMode: "json",
    text: text,
    sentiment:0,
    },
  }).on('complete', function(data, response) {
    res.async = {"words": data.keywords, "lang":data.language};
    logLater();
  });
    
//SYNC
  var clearedText = text;
  //Detect the language.
  var words;
  var detectedlanguage = keywords.detectLanguage(clearedText);
  
  if(detectedlanguage.length !== 0){//Some language is detected
    //Improve detection by adding knowledge about the previous detections
    var lang = keywords.improveLanguageDetection(detectedlanguage, calcLanguage, languageStats);
    languageStats = lang.languagesSoFar;//Save statistic for next round
    detectedlanguage = lang.languagesFromText[0][0]; //Save improved results
    //Filter common stopwords for the detected language 
    clearedText = _.strip(keywords.filterStopwords(detectedlanguage, clearedText));
    //Extract Keywords 
    words = keywords.extract(clearedText);
  }else{
    words = keywords.extract(clearedText);
    tmpMetaInfo.words = words;
  }
  res.sync={"words":words, "lang":detectedlanguage};
  logLater();
}
function isReTweet(text){
  return text.substring(0,4) === "RT @" || text.substring(0,1) === "♺";
  
}
