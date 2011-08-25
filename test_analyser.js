var analyser = require('./twapper_modules/analyser.js');
var staticData = require('./staticData/staticData.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var unshortener = require('unshortener');


/*
analyser.analyseMesseges(staticData.archiveInfo, function(result){
  console.log("result",_.keys(result));
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
//console.log("_.isURL(string, [schemas...])",_.isUrl('http://bi'));
/*
unshortener.expand("http://bi", function (realUrl) {
  console.log("realUrl",realUrl);
});


var text ='Forschen macht Spaß - Stadt, Heinz Nixdorf MuseumsForum (HNF) und Universität laden vom 18. bis 22. Juni zu... http://bit.ly/kC3GgB http://bit.ly/kdQY5G #upb';
var regExUrls = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/?[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/g;
console.log(text.match(regExUrls));
*/

unshortener.expand("http://t.co/Bus0jNn", function (realUrl) {
  console.log("realUrl",realUrl);
});

// expand an URL
     var unshortener = require('unshortener');

     // you can pass in a url object or string
     unshortener.expand('http://t.co/rWP6BP3',
                        function (url) {
                             // url is a url object
                             console.log(url);
                        });
                        
