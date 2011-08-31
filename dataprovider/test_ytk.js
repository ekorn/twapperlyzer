//var ytk = require('./twapper_modules/yourTwapperkeeper.js');
var helper = require('./twapper_modules/helper.js');
//var staticData = require('./staticData/staticData.js');
var cradle = require('cradle');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var check = require('validator').check;

/*
var msgs = new helper.ResponseBean();
msgs.data = [{id:"76009067142848512"}];
staticData.selectedArchive.limit = staticData.selectedArchive.limit - 35;

ytk.msgsUpdate(staticData.selectedArchive, msgs, function(data){
  _.each(data.data, function(tweet){
      console.log("id",tweet.id);
    });
    console.log("total",data.data.length);
});

ytk.getArchive(staticData.selectedArchive, 45, function(data){
  console.log("data",data, data.tweets.length);
});
*/


var url = "http://localhost:5984/twapperlyzer2";
console.log("isURL",helper.isURL(url));
check(url, "Parameter error: in URL").isUrl();
