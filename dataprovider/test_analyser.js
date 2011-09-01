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
 /*
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

var mapres = {hashtags: [[{text: "#invis", weight: 1}, {text: "#Perl", weight: 1}, {text: "#Conference", weight: 1}, {text: "#yapceu", weight: 1}, {text: "#home", weight: 1}, {text: "#followerpower", weight: 4}, {text: "#WebOS", weight: 3}, {text: "#PHP", weight: 15}, {text: "#LPI", weight: 1}, {text: "#Univention", weight: 1}, {text: "#oggcamp", weight: 1}, {text: "#PHPCR", weight: 3}, {text: "#supportyourlocalcon", weight: 1}, {text: "#bonn", weight: 1}, {text: "#postgresql", weight: 3}, {text: "#debconf", weight: 1}, {text: "#sponsor", weight: 2}, {text: "#OpenSource", weight: 4}, {text: "#program", weight: 1}, {text: "#touchpad", weight: 2}, {text: "#Urlaub", weight: 1}, {text: "#phpbenelux", weight: 2}, {text: "#LHC", weight: 1}], [], [], [], [], [], [], [], [{text: "#git", weight: 1}, {text: "#talk", weight: 1}], [], [], [], [{text: "#opensqlcamp", weight: 2}], [], [], [{text: "#puppet", weight: 1}], [], [], [{text: "#BlueSpice", weight: 1}, {text: "#OpenSource", weight: 1}], [{text: "#Opensource", weight: 1}], [{text: "#Opensource", weight: 1}], [], [], [{text: "#BlueSpice", weight: 1}, {text: "#OpenSource", weight: 1}, {text: "#PHPCR", weight: 1}], [{text: "#yay", weight: 1}], [{text: "#damn", weight: 1}], [{text: "#Buenzli", weight: 1}, {text: "#Demodays", weight: 1}, {text: "#Dontchange", weight: 1}], [{text: "#Zarafa", weight: 1}, {text: "#OpenVPN", weight: 1}, {text: "#hallowelt", weight: 1}], [{text: "#Zarafa", weight: 2}, {text: "#OpenVPN", weight: 2}], [{text: "#druckfrisch", weight: 1}, {text: "#linguistics", weight: 1}], [{text: "#archhurd", weight: 1}], [{text: "#archhurd", weight: 2}], [{text: "#CAcert", weight: 1}, {text: "#Zarafa", weight: 1}, {text: "#OpenVPN", weight: 1}], [], [{text: "#opensource", weight: 1}], [{text: "#Puppet", weight: 1}, {text: "#OpenStack", weight: 1}, {text: "#devops", weight: 1}, {text: "#sysadmin", weight: 1}, {text: "#opensource", weight: 1}], [{text: "#giggity", weight: 1}], [{text: "#nopr0n", weight: 1}, {text: "#Giggity", weight: 1}, {text: "#Android", weight: 1}], [{text: "#Gamescom", weight: 1}, {text: "#BlueSpice", weight: 1}, {text: "#3711", weight: 1}], [{text: "#OpenRheinRuhr", weight: 2}], [{text: "#OpenRheinRuhr", weight: 1}], [{text: "#GSoC", weight: 1}, {text: "#sneakpreview", weight: 1}], [{text: "#Quadrocopter", weight: 1}, {text: "#Anf", weight: 1}, {text: "#s21", weight: 1}, {text: "#k21", weight: 1}, {text: "#cams21", weight: 1}, {text: "#vortrag", weight: 1}], [{text: "#drupal", weight: 1}], [], [], [], [{text: "#Geocaching", weight: 2}], [{text: "#psyched", weight: 1}], [{text: "#drupal", weight: 1}], [], [{text: "#CCCamp11", weight: 1}], [{text: "#Bonn", weight: 1}, {text: "#Sankt", weight: 1}, {text: "#ksp", weight: 1}], [{text: "#GSoC", weight: 1}], [], [{text: "#freesoftware", weight: 1}, {text: "#opensource", weight: 1}, {text: "#conference", weight: 1}, {text: "#sanktaugustin", weight: 1}], [{text: "#opensource", weight: 1}, {text: "#Debian", weight: 6}], [{text: "#opensource", weight: 1}, {text: "#sanktaugustin", weight: 1}, {text: "#cccamp11", weight: 1}], [{text: "#opensource", weight: 1}, {text: "#nosql", weight: 4}, {text: "#inkscape", weight: 1}], [{text: "#opensource", weight: 1}, {text: "#nosql", weight: 1}, {text: "#bytemine", weight: 1}, {text: "#nodejs", weight: 1}, {text: "#ringojs", weight: 1}, {text: "#akshell", weight: 1}], [{text: "#fb", weight: 1}, {text: "#notagoodtimetogoonholiday", weight: 1}], [], [], [{text: "#nosql", weight: 2}], [], [{text: "#Gamescom", weight: 1}, {text: "#truthcanhurt", weight: 1}], [{text: "#schnaps", weight: 1}, {text: "#fail", weight: 1}], [], [], [{text: "#awesome", weight: 1}, {text: "#ahead", weight: 1}, {text: "#GamesCom", weight: 1}], [{text: "#Bonn", weight: 1}, {text: "#nosql", weight: 1}, {text: "#Gamescon", weight: 1}, {text: "#Colonge", weight: 1}, {text: "#Gamescom", weight: 1}, {text: "#truthcanhurt", weight: 1}, {text: "#Augustin", weight: 1}, {text: "#opensource", weight: 1}, {text: "#frogs", weight: 1}, {text: "#php", weight: 1}], [{text: "#DreiFragezeichen", weight: 1}, {text: "#DDF", weight: 1}, {text: "#cacert", weight: 1}, {text: "#Geeklog", weight: 1}, {text: "#Groklaw", weight: 1}, {text: "#MySQL", weight: 1}, {text: "#MariaDB", weight: 1}], [{text: "#MySQL", weight: 3}, {text: "#MariaDB", weight: 1}, {text: "#PHP", weight: 9}, {text: "#awesome", weight: 1}, {text: "#gnome3", weight: 1}, {text: "#AppUp", weight: 1}, {text: "#Gamescom", weight: 1}, {text: "#bytemine", weight: 1}, {text: "#hs4", weight: 1}, {text: "#fXSL", weight: 1}, {text: "#gnome", weight: 1}, {text: "#zukunft", weight: 1}, {text: "#NoSQL", weight: 1}, {text: "#Session", weight: 1}, {text: "#triAGENS", weight: 1}, {text: "#phyton", weight: 1}], [{text: "#PHP", weight: 7}, {text: "#python", weight: 2}, {text: "#HS6", weight: 1}, {text: "#jobs", weight: 1}, {text: "#oss", weight: 1}, {text: "#OpenStack", weight: 1}, {text: "#singletons", weight: 2}, {text: "#html5", weight: 1}, {text: "#Carrera", weight: 2}, {text: "#Rekord", weight: 2}], [{text: "#HS6", weight: 1}, {text: "#frosxon", weight: 1}, {text: "#web2py", weight: 2}, {text: "#PHP", weight: 1}, {text: "#AppUp", weight: 1}, {text: "#fail", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#Lisp", weight: 1}, {text: "#python", weight: 2}, {text: "#bcki", weight: 1}, {text: "#beeindruckend", weight: 1}, {text: "#keynote", weight: 1}, {text: "#OSI", weight: 1}], [{text: "#PHP", weight: 6}, {text: "#opensource", weight: 2}, {text: "#campfire", weight: 1}, {text: "#Software", weight: 1}, {text: "#Freedom", weight: 1}, {text: "#business", weight: 1}, {text: "#value", weight: 1}, {text: "#ilike", weight: 1}, {text: "#IT", weight: 1}, {text: "#joind", weight: 1}, {text: "#PHPCR", weight: 1}, {text: "#triAGENS", weight: 1}, {text: "#decibel", weight: 1}, {text: "#typo3", weight: 1}], [{text: "#PHP", weight: 8}, {text: "#joind", weight: 3}, {text: "#Carrera", weight: 1}, {text: "#Rekord", weight: 1}, {text: "#Cairo", weight: 2}, {text: "#mysql", weight: 1}, {text: "#robotics", weight: 1}, {text: "#opensql", weight: 1}, {text: "#CAcert", weight: 1}, {text: "#typo3", weight: 1}], [{text: "#PHP", weight: 5}, {text: "#osm", weight: 6}, {text: "#Openstreetmaps", weight: 2}, {text: "#Cairo", weight: 1}, {text: "#biersounterwegs", weight: 1}, {text: "#Android", weight: 1}], [{text: "#PHP", weight: 7}, {text: "#Carrera", weight: 2}, {text: "#Rekord", weight: 2}, {text: "#git", weight: 1}, {text: "#qafoo", weight: 1}, {text: "#cookie", weight: 1}, {text: "#Icinga", weight: 1}, {text: "#mfg", weight: 1}], [{text: "#Carrera", weight: 5}, {text: "#Rekord", weight: 6}, {text: "#WorstFeeling", weight: 1}, {text: "#guug", weight: 1}, {text: "#ringojs", weight: 2}, {text: "#nodejs", weight: 2}, {text: "#Icinga", weight: 1}, {text: "#PHP", weight: 2}, {text: "#sphinx", weight: 1}, {text: "#MariaDB", weight: 1}, {text: "#triAGENS", weight: 3}, {text: "#cccamp11", weight: 1}, {text: "#cologne", weight: 1}, {text: "#bonn", weight: 1}, {text: "#geocache", weight: 1}, {text: "#CaCert", weight: 1}, {text: "#PHPopstars", weight: 1}], [{text: "#javascript", weight: 1}, {text: "#widgets", weight: 1}, {text: "#ringojs", weight: 3}, {text: "#nodejs", weight: 3}, {text: "#OpenSQLCamp", weight: 1}, {text: "#yay", weight: 1}, {text: "#win", weight: 1}, {text: "#byteminer", weight: 1}], [{text: "#php", weight: 1}, {text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}, {text: "#mq", weight: 1}], [{text: "#mode", weight: 2}, {text: "#PHPopstars", weight: 1}, {text: "#PHP", weight: 1}, {text: "#Icinga", weight: 1}, {text: "#DieAlm", weight: 1}, {text: "#videoday", weight: 1}], [{text: "#online", weight: 1}, {text: "#offline", weight: 1}, {text: "#Mate", weight: 1}, {text: "#videoday", weight: 1}], [{text: "#Erkenntnis", weight: 1}, {text: "#Mate", weight: 2}, {text: "#Amarok", weight: 1}, {text: "#drupal", weight: 2}, {text: "#germanyrb", weight: 1}, {text: "#m", weight: 1}, {text: "#allebeide", weight: 1}], [{text: "#drupal", weight: 1}, {text: "#germanyrb", weight: 2}], [{text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}], [{text: "#WTF", weight: 1}], [{text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}], [{text: "#WTF", weight: 1}], [{text: "#PHPCR", weight: 1}, {text: "#PHP", weight: 1}, {text: "#thedayafter", weight: 1}, {text: "#day2", weight: 1}], [{text: "#PHPCR", weight: 1}, {text: "#drupal", weight: 1}, {text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}, {text: "#Geocachers", weight: 2}, {text: "#GSoC", weight: 1}, {text: "#B", weight: 1}, {text: "#PHP", weight: 1}, {text: "#2", weight: 1}], [{text: "#nodejs", weight: 2}, {text: "#geekhumor", weight: 5}, {text: "#PHP", weight: 3}, {text: "#phpdox", weight: 1}, {text: "#giggity", weight: 1}, {text: "#ExtJS", weight: 2}, {text: "#goodMorningEveryone", weight: 1}, {text: "#R", weight: 1}, {text: "#grml", weight: 1}, {text: "#abgehetzt", weight: 1}, {text: "#gradegeschafft", weight: 1}, {text: "#talkfaellt", weight: 1}, {text: "#javascript", weight: 1}, {text: "#schr", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#go", weight: 1}, {text: "#Microsoft", weight: 1}, {text: "#Fail", weight: 1}], [{text: "#mongodb", weight: 1}, {text: "#extjs", weight: 4}, {text: "#javascript", weight: 1}, {text: "#crisis", weight: 1}, {text: "#geekhumor", weight: 3}, {text: "#R", weight: 2}, {text: "#nodejs", weight: 1}, {text: "#Meme", weight: 1}, {text: "#win", weight: 1}, {text: "#devops", weight: 2}, {text: "#PHP", weight: 1}, {text: "#culture", weight: 1}], [{text: "#fail", weight: 1}, {text: "#wegbeschreibung", weight: 1}, {text: "#PHP", weight: 6}, {text: "#drupal", weight: 1}, {text: "#PHPopstars", weight: 2}, {text: "#riak", weight: 1}, {text: "#couchdb", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#nodejs", weight: 2}, {text: "#lastminute", weight: 1}, {text: "#monty", weight: 1}, {text: "#foss", weight: 1}, {text: "#R", weight: 1}], [{text: "#netzladen", weight: 1}, {text: "#ACPI", weight: 1}, {text: "#php", weight: 4}, {text: "#monitoring", weight: 2}, {text: "#nagios", weight: 1}, {text: "#icinga", weight: 1}, {text: "#streaming", weight: 1}, {text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}], [{text: "#php", weight: 7}, {text: "#Stern", weight: 1}, {text: "#HS6", weight: 1}, {text: "#ExtJS", weight: 1}, {text: "#tron", weight: 1}, {text: "#Carrera", weight: 2}, {text: "#Rekord", weight: 2}, {text: "#geekhumor", weight: 1}, {text: "#welcome", weight: 1}, {text: "#Open", weight: 1}, {text: "#World", weight: 1}, {text: "#Portscans", weight: 1}, {text: "#Schei", weight: 2}, {text: "#mongodb", weight: 1}], [{text: "#riak", weight: 2}, {text: "#couchdb", weight: 2}, {text: "#mongodb", weight: 2}, {text: "#php", weight: 4}, {text: "#nodejs", weight: 2}, {text: "#drupalbeer", weight: 1}], [{text: "#puppet", weight: 4}, {text: "#TeX", weight: 1}, {text: "#PHPopstars", weight: 5}, {text: "#PHP", weight: 6}, {text: "#Teambuilding", weight: 1}, {text: "#Leitung", weight: 1}, {text: "#Schei", weight: 1}, {text: "#Carrerabahn", weight: 1}, {text: "#zabbix", weight: 2}, {text: "#wasfehlt", weight: 1}, {text: "#phpopstar", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#geekhumor", weight: 1}], [{text: "#r", weight: 1}, {text: "#PHP", weight: 3}, {text: "#FOSS", weight: 1}, {text: "#Flughafen", weight: 1}, {text: "#CGN", weight: 1}, {text: "#NoSQL", weight: 2}, {text: "#PHPopstars", weight: 5}, {text: "#drupal", weight: 2}, {text: "#only", weight: 1}, {text: "#basics", weight: 1}, {text: "#arduino", weight: 1}], [{text: "#PHPopstars", weight: 2}, {text: "#fb", weight: 1}, {text: "#PHP", weight: 1}, {text: "#tarent", weight: 1}, {text: "#extjs", weight: 1}, {text: "#dojo", weight: 1}, {text: "#javascript", weight: 1}, {text: "#favtalk", weight: 1}, {text: "#agile", weight: 1}, {text: "#mongodb", weight: 2}, {text: "#mhtnd", weight: 1}], [{text: "#GSoC", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#puppet", weight: 1}, {text: "#zarafa", weight: 1}, {text: "#nyan", weight: 1}, {text: "#PHPopstars", weight: 1}], [{text: "#bitbucket", weight: 1}, {text: "#Nosql", weight: 1}, {text: "#puppet", weight: 1}, {text: "#PHPopstars", weight: 1}, {text: "#fullack", weight: 1}, {text: "#aftershow", weight: 1}, {text: "#party", weight: 1}], [{text: "#geekhumor", weight: 1}, {text: "#Danke", weight: 2}, {text: "#super", weight: 1}, {text: "#gute", weight: 2}, {text: "#Organisation", weight: 1}, {text: "#Conference", weight: 1}, {text: "#Feedback", weight: 1}, {text: "#IT", weight: 1}, {text: "#digital", weight: 1}, {text: "#Open", weight: 1}, {text: "#zustimmen", weight: 1}, {text: "#coole", weight: 1}, {text: "#leute", weight: 1}, {text: "#spa", weight: 1}, {text: "#ideen", weight: 1}, {text: "#tradeoffs", weight: 1}], [{text: "#mongodb", weight: 1}, {text: "#nulekkerslapen", weight: 1}, {text: "#zarafa", weight: 1}, {text: "#fullack", weight: 1}], [{text: "#CAcert", weight: 1}], [{text: "#muede", weight: 1}, {text: "#puppet", weight: 1}], [], [], [], [{text: "#phpuchh", weight: 1}], [], [{text: "#Geeklog", weight: 1}, {text: "#MariaDB", weight: 1}, {text: "#domains", weight: 1}, {text: "#lybia", weight: 1}], [], [{text: "#perl", weight: 4}], [{text: "#TeX", weight: 2}], [{text: "#needsleep", weight: 1}, {text: "#TeX", weight: 1}, {text: "#zarafa", weight: 1}, {text: "#bss", weight: 1}], [], [], [{text: "#puppet", weight: 1}, {text: "#PHP", weight: 1}], [], [{text: "#e20", weight: 1}, {text: "#linux", weight: 1}], [{text: "#Flughafen", weight: 1}, {text: "#CGN", weight: 1}], [{text: "#zarafa", weight: 1}], [{text: "#zarafa", weight: 1}], [{text: "#ringojs", weight: 1}, {text: "#nodejs", weight: 1}], [], [{text: "#PHP", weight: 1}], [{text: "#ringojs", weight: 2}, {text: "#nodejs", weight: 2}], [], [{text: "#PHP", weight: 1}, {text: "#FOSS", weight: 1}], [], [], [{text: "#Inkscape", weight: 1}], [{text: "#phpcr", weight: 1}, {text: "#php", weight: 1}, {text: "#contentmanagement", weight: 1}], [], [], [{text: "#php", weight: 1}, {text: "#slides", weight: 1}], [], [{text: "#riak", weight: 1}, {text: "#couchdb", weight: 1}, {text: "#mongodb", weight: 1}, {text: "#php", weight: 1}, {text: "#nodejs", weight: 1}]]};

function reduce (key, values, rereduce) {
	function isIn(data, key){
    	for(var i=0; i<data.length; i++){
    		if(data[i].text.toLowerCase() ===key.toLowerCase())
    			return i;
    	}
    	return -1;
    }
    
	var aggrigatedDoc = {};
  	aggrigatedDoc.hashtags = [];
	values[0].hashtags.forEach(function (hashtags){
  		hashtags.forEach(function (hashtag){
  			var pos = isIn(aggrigatedDoc.hashtags, hashtag.text);
  			if(pos != -1){
  				aggrigatedDoc.hashtags[pos].weight += hashtag.weight
  			}else{
  				aggrigatedDoc.hashtags.push(hashtag);
  			}
  		})
  	})
    return aggrigatedDoc;
    

  }
fs.writeFile('mapres.json', JSON.stringify(mapres), function (err) {
      if (err) throw err;
      console.log('It\'s saved!');
      });
fs.writeFile('reduceres.json', JSON.stringify(reduce(null,[mapres],null)), function (err) {
      if (err) throw err;
      console.log('It\'s saved!');
      });


