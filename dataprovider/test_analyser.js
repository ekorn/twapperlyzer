var analyser = require('./twapper_modules/analyser.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var fs = require('fs');
rest = require('restler');
var helper = require('./twapper_modules/helper.js');
var keywords = require("keywords");
var conf = require('config');
var OAuth = require('oauth').OAuth;
var oAuth= new OAuth("http://twitter.com/oauth/request_token",
                 "http://twitter.com/oauth/access_token", 
                 conf.twitter.consumerKey,  conf.twitter.consumerSecret, 
                 "1.0A", null, "HMAC-SHA1");
var conn;
var db;
var user = {
   "_id": "85836202",
   "type": "user",
   "name": "AAN Development",
   "screen_name": "aandev",
   "url": "http://artefact-actor-networks.net",
   "gender": "m,f",
   "location": "Paderborn",
   "time_zone": null,
   "lang": "en",
   "statuses_count": 11,
   "followers_count": 1,
   "friends_count": 11,
   "listed_count": 0
}

/* GET Mutible Docs test
 */
helper.getDBConnectionFromConfig(conf.couchdb, function(error, database, connection){
  if(error === null){

    conn = connection;
    db  = database;
    db.save(user._id, user, function(err,res){
      if(err) {console.log(err);}
      else{
      console.log("res",res);
      }
    });
    
    
        /*
    var id="29863de6315290d576d34e93d122c944-1"
    db.get([id,id+"-qu"], function (err, archiveInfoFromDB) {
      console.log(archiveInfoFromDB);

      
    });
    */
    //console.log(conn);
  }else{
    console.log("Database error:",error);
  }
});


/*
 * SENDING TWEETS
oAuth.post("http://api.twitter.com/1/statuses/update.json", conf.twitter.accessToken, 
                           conf.twitter.accessTokenSecret, {"status":"@ek0rn #twapperlyzer analyse is done."}, function(error, data) {
                             if(error) console.log(require('sys').inspect(error))
                             else console.log(data)
});  
*/

/*
var analyseData = [];
fs.readFile("./staticData/froscon.json", function (err, data) {
    if (err) throw err;
    var archive = JSON.parse(data);
    archive._id="29863de6315290d576d34e93d122c944-1";
    archive.messagesSoFar = 0;
    archive.questionsDoc = {"_id":archive._id+"-qu", "questions": []};
    var ptime = new Date();
    analyser.analyseMesseges(archive, function(err, analysePart, callback){
      if (err) throw err;
      analyseData.push(analysePart);
      if(!_.isUndefined(analysePart.messagesSoFar)){
        if(analysePart.status === "analysing"){
          //Do some
          callback(null, "ok");
        }else if(analysePart.status === "done"){
          console.log((new Date().getTime()- ptime.getTime()), " milliseconds took the analyse.");
          fs.writeFile('output.json', JSON.stringify(analyseData), function (err) {
            if (err) throw err;
            console.log('It\'s saved!');
          });
        }
      }else{
        callback(null, "ok");
      }
      
    });

  });
*/
/*
  db.save(questionsDoc._id, questionsDoc, function (err, res) {
      if (err) {
        console.log("Save User Error",err);
        throw err;
      }
    });
*/
/*

analyser.analyseMesseges(staticData.archiveInfo, function(result){

  fs.writeFile('output.json', JSON.stringify(result), function (err) {
  if (err) throw err;
  console.log('It\'s saved!');
  });

});
*/

    var regExUsernames = /(^|\s)@(\w+)/g;
    var regExHashtags  = /(^|\s)#(\w+)/g;
    var regExUrls = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
   /*
fs.readFile("./staticData/knowaan.json", function (err, data) {
  if (err) throw err;
  var archive = JSON.parse(data);
  var languagesSoFar = null;
  var calc = function(a,b){
    return (a+a+b)/3
  };
  var count = 0;
  
  _.each(archive.tweets, function(tweet){
    if (!isReTweet(tweet.text)){
      var res = keywords.extract(tweet.text, [regExUrls,regExHashtags,regExUsernames]);
      if(res.languages.length !== 0){
        var res2 = keywords.getLanguages(res.languages,calc, languagesSoFar);
        languagesSoFar = res2.languagesSoFar;
        
        res.languages = res2.languagesFromText;
        res.terms = keywords.filterStopwords(res.languages[0][0], res.terms);
        //console.log("org",res.terms,"filter",keywords.filterStopwords(res.languages[0][0], res.terms));
        if(res.languages[0][0] !== res2.languagesFromText[0][0]){
        //console.log("from: "+ res.languages[0]+" to  "+res2.languagesFromText[0]+" for: "+tweet.text);
        count++;
        }
      }
      console.log("res",res.terms, _.first(res.languages, 1), tweet.text);
    }
    
  });
//console.log("languagesSoFar",languagesSoFar, count);
});
*/
/*
var t1 = "ein einfacher deutscher satz";
var t2 = " Wer visionen hat soll zum Artz gehen";

var t3 = "Cool #ARV11 twitter stream visualizations until Tue 12 pm http://goo.gl/36xSj #arv3t (via @chrvoigt @peterkraker) #knowaan";
var t4 = 'Cool find for @sumeruter and #knowaan "SentiWordNet" http://sentiwordnet.isti.cnr.it/ #nlp #datamining';
var languagesSoFar = null;


var res1 = keywords.extract(t1, [regExUrls,regExHashtags,regExUsernames]);
var res2 = keywords.extract(t2, [regExUrls,regExHashtags,regExUsernames]);
var calc = function(a,b){return a+b/2};


var addres1 = keywords.getLanguages(res2.languages,calc, languagesSoFar);
languagesSoFar = addres1.languagesSoFar;
var addres2 = keywords.getLanguages(res1.languages, calc, languagesSoFar);
languagesSoFar = addres2.languagesSoFar;


res2.terms = keywords.filterStopwords(addres2.languagesFromText[0][0], res2.terms);

//console.log("res2",res2);
*/

