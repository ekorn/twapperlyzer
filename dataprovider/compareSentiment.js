var analyser = require('./twapper_modules/analyser.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var fs = require('fs');
rest = require('restler');
var helper = require('./twapper_modules/helper.js');
var conf = require('config');
var conn;
var db;

fs.readFile("./staticData/knowaan.json", function (err, data) {
    if (err) throw err;
    var archive = JSON.parse(data);
    var res = {};
    res.texte = [];
    res.tweetsentiments = {"positive":0,"neutral":0,"negative":0};
    res.alchemyapi = {"positive":0,"neutral":0,"negative":0,"error":"0"};
    var tweets = [];

    

        _.each(archive.tweets, function(tweet){
      if(!isReTweet(tweet.text)){
        tweets.push(tweet.text);
      }
    });
    var calcLater = _.after(tweets.length, function(){
      _.each(res.texte, function(text){
        if(text.tweetsentiments === "positive" ) res.tweetsentiments.positive++;
        if(text.tweetsentiments === "neutral" ) res.tweetsentiments.neutral++;
        if(text.tweetsentiments === "negative" ) res.tweetsentiments.negative++;
        
        if(text.alchemyapi === "positive" ) res.alchemyapi.positive++;
        if(text.alchemyapi === "neutral" ) res.alchemyapi.neutral++;
        if(text.alchemyapi === "negative" ) res.alchemyapi.negative++;
        if(text.alchemyapi === "error" ) res.alchemyapi.error++;
        
      })
      fs.writeFile('sentimentCleared.json', JSON.stringify(res), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
      });
    });
    
    _.each(tweets, function(tweet){
 
        send(_.strip(keywords.clearText(tweet,  [regExUrls,regExHashtags,regExUsernames])), function(data){res.texte.push(data); calcLater();});
      
    });
    
});

function send(text,callback){
  
  var res = {};
  res.text = text;
  var logLater = _.after(2, function(){callback(res)});
 // &quot;q&quot;=&gt;&quot;OpenStreetMap at OpenTech 2011&quot;
    rest.get("http://data.tweetsentiments.com:8080/api/analyze.json?q="+encodeURIComponent(text+" food")).on('complete', function(data) {
      res.tweetsentiments = data.sentiment.name.toLowerCase();
      logLater();
    });

    rest.post('http://access.alchemyapi.com/calls/html/HTMLGetTextSentiment', {
      data: { apikey: "2141aac411021f443955d8221cc726b549829462",
      outputMode: "json",
      html: text,
      },
    }).on('complete', function(data, response) {
      if(data.docSentiment){
        res.alchemyapi = data.docSentiment.type;
      }else{
        res.alchemyapi = "error";
      }
      logLater();
    });
    
}
function isReTweet(text){
  return text.substring(0,4) === "RT @" || text.substring(0,1) === "♺";
  
}
