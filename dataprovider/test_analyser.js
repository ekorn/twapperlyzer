var analyser = require('./twapper_modules/analyser.js');
var staticData = require('./staticData/staticData.js');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var unshortener = require('unshortener');
var fs = require('fs');
rest = require('restler');
/*
  fs.readFile("./staticData/froscon.json", function (err, data) {
    if (err) throw err;
    var frosonJSON = JSON.parse(data);
    analyser.analyseMesseges(frosonJSON, function(result){

      fs.writeFile('output.json', JSON.stringify(result), function (err) {
      if (err) throw err;
      console.log('It\'s saved!');
      });

    });

  });
  */
var blabla = "Now going to the &quot;LinuXContainer&quot; speech in HS4. #FrOSConNow listening to @mgdm’s talk about „modern php graphics with cairo“. If you’re still using GD you should come over and listen, too #froscon#PHP@#FrOSCon: @mgdm is just talking about &quot; Modern PHP graphics with Cairo&quot;. Don't forget rating: http://joind.in http://t.co/3eDKQDrJetzt kann es draußen ruhig schneien, habe eine Tux-Mütze von @akkolady bekommen ;) ... #FrOSCon http://t.co/Az3tvSYUnd wieder neuer #Carrera #Rekord auf #froscon &gt; Patrick schafft 4:63 Sekunden!#Cairo in PHP talk in #FrOSCon. Another custom extension that could probably be replaced with GObject Introspection http://t.co/XWRR6rTRoom fully packed for @olegpodsechin's talk about the future of server side javascript. #frosconFuture of serveside JavaScript #frosconYay, feedback! RT @tobySen: You can now vote for #PHP@#FrOSCon talks on #joind.in: http://t.co/QQxLBLhPlease rate my Singleton talk at http://t.co/q3DzGeX #froscon. Appreciate the feedback.@walterheck: When is your talk? #frosconjust arrived at the laisure area at #FrOSCon already overdosed on nerds ^_^Any #robotics guys at #FroSCon?are there any cacti-users at #froscon?@KrisBuytaert The schedule was updated, but it was probably too late for the printed version. Can't help that either... #FrOSConMartin Michlmayer does a good job in giving a clear picture of the licencing jungle #frosconVortrag über LXC auf der #FROSCON ist _voll_. Hat aber auch einen guten Vortragsstil.found myself a power outlet with wifi access in the back of the #opensql room #frosconmacht sich wieder auf zur #froscon@go_oh Any recordings of that talk? #frosconthe slides of my c++ template metaprogramming considered sexy talk are now online: http://t.co/mr2Jb71 (thx @thanaton) #frosconMy slides for my #froscon talk about &quot;Singletons in PHP&quot; is online http://t.co/Lb4TpJ6Great overview on #Cairo with PHP at #PHP@#FrOSCon.Already the first feedback for a speaker of #PHP@#froscon on joind.in. Very nice!Does anyone at #froscon have an apple display port adapter to via that I could borrow at 15:00 today? I forgot mine :S Pls RTCo-Audited assurances will be done from 1pm to 3pm tomorrow. Help the community with the audit and come to our booth! #CAcert #FrOSConDoes anyone at #froscon have an apple display port adapter to vga that I could borrow at 15:00 today? I forgot mine :S Pls RT#froscon need power? well - bring your own extensions+distributors! and log in to IRC FreeNode to channel #froscon for some feedback.#PHP@#FrOSCon: @mgdm is coming to an end. Great talk, thx! Next up is @derickr about &quot;Profiling PHP Applications&quot; at 15:15 (C118).So, ab 1500 alle mal @surfersun die Daumen drücken! #froscon #typo3My talk on 'Profiling PHP Applications' is on at 15:15 in room C118. #frosconUnd dann noch festellen das #FrOSCon nichts mit Osnabrück zu tun hat.@stiefkind For more on this see http://t.co/f0OVcTo #FrOSCon@walterheck Thanks! That's from http://t.co/szhGt8C if you want more :-) #FrOSConvery engaging #FrOSCon keynote by @webmink - slides were an odd mix of @presentationzen style and bullet point hell, though";
rest.post('http://access.alchemyapi.com/calls/text/TextGetRankedNamedEntities', {
  data: { apikey: "2141aac411021f443955d8221cc726b549829462",
  outputMode: "json",
  text: blabla
  },
}).on('complete', function(data, response) {
  console.log("data",data);
});
/*
analyser.analyseMesseges(staticData.archiveInfo, function(result){

  fs.writeFile('output.json', JSON.stringify(result), function (err) {
  if (err) throw err;
  console.log('It\'s saved!');
  });

});
*/

/*

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
/*
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
                        
*/
