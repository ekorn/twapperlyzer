var analyser = require('./twapper_modules/analyser.js');
var staticData = require('./staticData/staticData.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var unshortener = require('unshortener');


/*
analyser.analyseMesseges(staticData.archiveInfo, function(result){
  //console.log("result",result);
});


var user = new Object();
user.text = "wollepb";
user.weight = 9;

analyser.getNamesToGender('forenames2.txt', function(namesFromFile){
  console.log("Gender RES",analyser.getGender(namesFromFile,"juandoming"));
});

analyser.getUserInfo(user, function(userInfo){
  console.log("userInfo",userInfo);
});


//console.log("shortUrls",(_.sortBy(staticData.shortUrls, function(url){return url.weight})).reverse() );
analyser.expandUrls(staticData.shortUrls, new Array(), function(res){
  console.log("res",res);
});

*/
//console.log("urllib.parse(url)",urllib.parse("http://bi"));
unshortener.expand("http://bi", function (realUrl) {
  console.log("realUrl",realUrl);
});

