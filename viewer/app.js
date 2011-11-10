 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/twapperlyzer'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    , {from:"default.appcache", to:'_show/cache'}
    , {from:"/api", to:'../../'}
    , {from:"/dbname/*", to:'../../*'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.lists = {};

ddoc.lists.aggregate = function(head, req){
  function aggregate(data) {
      //log(data);
      var res = [];
      data.forEach( function (array) {
        //log(array);
        array.forEach( function (value) {
          var pos = isIn(res, value.text);
          if(pos !== -1) {
            res[pos].weight += value.weight
          } else {
            res.push(value);
          }
        })
      })
      return res;
    }
    function isIn(data, key) {
      for(var i=0; i<data.length; i++) {
        if(data[i].text.toLowerCase() === key.toLowerCase())
          return i;
      }
      return -1;
    }
    function aggSort(a, b) {
      return b.weight - a.weight;
    }

    function isInGeo(data, lat,lon) {
      for(var i=0; i<data.length; i++) {
        if(data[i].lat === lat && data[i].lon == lon)
          return i;
      }
      return -1;
    }

    function aggregateGeo(values) {
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

  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  if(docs.length>0){
    if(docs[0][0].lat !== void 0){
      send(toJSON(aggregateGeo(docs)));
    }
    else{
      send(toJSON(aggregate(docs).sort(aggSort)));
    }
  }else{
    send(toJSON({}));
  }
}

ddoc.lists.aggregateMin2 = function(head, req){
  function aggregate(data) {
      //log(data);
      var res = [];
      data.forEach( function (array) {
        //log(array);
        array.forEach( function (value) {
          var pos = isIn(res, value.text);
          if(pos !== -1) {
            res[pos].weight += value.weight
          } else {
            res.push(value);
          }
        })
      })
      return res;
    }
    function isIn(data, key) {
      for(var i=0; i<data.length; i++) {
        if(data[i].text.toLowerCase() === key.toLowerCase())
          return i;
      }
      return -1;
    }
    function aggSort(a, b) {
      return b.weight - a.weight;
    }
  
  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  var agg = aggregate(docs).sort(aggSort);
  var res = [];
  for(var i=0; i<agg.length; i++){
    if(agg[i].weight === 1){
      break
    }
    res.push(agg[i]);
  }

  send(toJSON(res));
}

ddoc.lists.aggregateLimit25 = function(head, req){
  function aggregate(data) {
      //log(data);
      var res = [];
      data.forEach( function (array) {
        //log(array);
        array.forEach( function (value) {
          var pos = isIn(res, value.text);
          if(pos !== -1) {
            res[pos].weight += value.weight
          } else {
            res.push(value);
          }
        })
      })
      return res;
    }
    function isIn(data, key) {
      for(var i=0; i<data.length; i++) {
        if(data[i].text.toLowerCase() === key.toLowerCase())
          return i;
      }
      return -1;
    }
    function aggSort(a, b) {
      return b.weight - a.weight;
    }
  
  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  var agg = aggregate(docs).sort(aggSort);
  send(toJSON(agg.slice(0,25)));
}

ddoc.lists.gender = function(head, req){
  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  
  var res = {male:0,female:0,neutral:0};
  docs.forEach(function(user){
    if(user.gender === "m")
      res.male++;
    if(user.gender === "f")
      res.female++;
    if(user.gender === "m,f")
      res.neutral++;
  });
  return toJSON(res);
  
}

ddoc.lists.totalByDay = function(head, req){
  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row);
  }
  var res = {
        from:0,
        msg:0, 
        rt: 0,
        un: 0
  };
  var resArray = [];
  var oneDay = 86400;
  to = docs[0].key[1]+ oneDay;
  res.from = docs[0].key[1];
  
  var userList = [];
  
  docs.forEach(function(entry){
    //Append every enty of a day
    if(entry.key[1]<to){
      res.msg += entry.value.msg;
      res.rt += entry.value.rt;
      res.un += getUniqueUser(entry.value.un).length;
    }else{
      //start a new day
      resArray.push(res);
      res = {
          from: entry.key[1],
          msg: entry.value.msg,
          rt: entry.value.rt,
          un: getUniqueUser(entry.value.un).length
        };
      to = entry.key[1] + oneDay;
    }
  });
  
  function getUniqueUser(users){
    var res = [];
    users.forEach(function(user){
      if(userList.indexOf(user.text) === -1){
        userList.push(user.text);
        res.push(user.text)
      }
    });
    return res;
  }
  return toJSON(resArray);
  
}

ddoc.lists.reach = function(head, req){
  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  
  var res = 0;
  docs.forEach(function(user){
    res += user.followers_count
  });
  return toJSON(res);
  
}

//VIEWS
ddoc.views = {};



ddoc.views.listArchives = {
  map : function(doc) {
    if(doc.archive_info !== void 0) {
      emit(doc.archive_info.keyword, {"id": doc._id,"keyword" : doc.archive_info.keyword, "description": doc.archive_info.description,"count": doc.archive_info.count});
    }
  }
};

ddoc.views.hashtags = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.ht.length >0 && doc.ht !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.ht);
      }
    }
  }
};

ddoc.views.mentions = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.me.length >0 && doc.me !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.me);
      }
    }
  }
}

ddoc.views.urls = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.urls.length >0 && doc.urls !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.urls);
      }
    }
  }
}

ddoc.views.keywords = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.keywords.length >0 && doc.keywords !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.keywords);
      }
    }
  }
}

ddoc.views.member = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.un.length >0 && doc.un !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.un);
      }
    }
  }
}

ddoc.views.sentiment = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.sentiment !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.sentiment);
      }
    }
  },  
  reduce: function (key, values, rereduce){
    var res = {"positive":0,"neutral":0, "negative":0};
    values.forEach(function(value){
      res.positive += value.positive;
      res.neutral += value.neutral;
      res.negative += value.negative;
    });
    
    return res;
  }
  
}

ddoc.views.rt = {
  map: function(doc) {
    if(doc.type === "hourData"){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.rt);
    }
  },
  reduce: "_sum"
}

ddoc.views.rtUser = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.rtu.length >0 && doc.rtu !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.rtu);
      }
    }
  }
}

ddoc.views.language = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.language.length >0 && doc.language !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.language);
      }
    }
  }
}

ddoc.views.geo = {
  map: function(doc) {
    if(doc.type === "hourData"){
      if(doc.geo.length >0 && doc.geo !== null){
        var meta = doc._id.split("-");
        emit([meta[0]+"-"+meta[1], parseInt(doc.text)], doc.geo);
      }
    }
  }
}

    //var oneHour = 3600;
    //var oneDay = 86400;
    //var oneMonth = 2678400
    
ddoc.views.timeStats = {
  map:function(doc) {
    if(doc.type == "hourData"){
      var meta = doc._id.split("-");
      emit(meta[0]+"-"+meta[1], parseInt(doc.text));
    }
  },
  reduce: "_stats"
}

ddoc.views.user = {
  map: function(doc) {
    if(doc.type === "user"){      
        emit(doc.screen_name, doc);
    }
  }
}

ddoc.views.archiveUser = {
  map: function(doc) {
    if(doc.type === "user"){ 
        doc.archives.forEach(function(archive){
          emit(archive[0], doc);
        });
    }
  }
}

ddoc.views.grandTotal = {
  map: function (doc) {
    if(doc.type === "hourData"){
      var meta = doc._id.split("-");
      var res = {
        msg:doc.weight,
        rt: doc.rt,
        un: doc.un
      }
      emit([meta[0]+"-"+meta[1], parseInt(doc.text)], res);
    }
  }
  /*
  ,reduce: function (key, values, rereduce){
      var res = {
        msg:0, 
        ht:0, 
        keywords:0,
        rt: 0,
        me:0,
        //sentiment: doc.sentiment,
        //language: doc.language,
        urls: 0
      }
    values.forEach(function(value){
      res.msg += value.msg;
      res.ht += value.ht;
      res.me += value.me;
      res.keywords += value.keywords;
      res.rt += value.rt;
      res.urls += value.urls;
    });
    
    return res;
  }
  * */
}

ddoc.views.config = {
  map: function(doc) {
    if(doc.type === "config"){ 
        emit(doc.type, doc);
    }
  }
}

ddoc.views.questions = {
  map: function(doc) {
    var meta = doc._id.split("-");
    if(doc.type === "questions"){ 
        emit(meta[0]+"-"+meta[1], doc);
    }
  }
}

ddoc.views.discussions = {
  map: function(doc) {
    var meta = doc._id.split("-");
    if(doc.type === "discussions"){ 
        emit(meta[0]+"-"+meta[1], doc);
    }
  }
}

ddoc.shows = {};

ddoc.shows.cache = function(head, req) {
  var manifest = "";
  var network = "NETWORK:\n";
  for (var a in this._attachments) {
    if(a.indexOf("js") === -1)
      manifest += ("/" + a + "\n");
    else
      network += ("/" + a + "\n");
  }
  manifest += network;
  var r =
    { "headers": { "Content-Type": "text/cache-manifest"}
    , "body": "CACHE MANIFEST\n" + manifest
    }
  return r;
}

ddoc.shows.discussions = function(doc ,req) {
  
  if(req.query.type === "amount"){
    return toJSON(doc.discussions.length);
  }
  if(req.query.type === "discussions"){
    doc.discussions.forEach(function (discussion){
      discussion.msgs.forEach(function(msg){
        msg.text = msg.text.replace(/&quot;/g,'"');
        
      });
    });
    
    return toJSON(doc.discussions);
  }

}

ddoc.shows.questions = function(doc ,req) {
  var allAnswered = [];
  var unanswered = [];
  var goodAnswered = [];
  var questioner = [];
  var responder = [];

  function isIn(data, key) {
    for(var i=0; i<data.length; i++) {
      if(data[i].text.toLowerCase() === key.toLowerCase())
        return i;
    }
    return -1;
  }
  
  function addToArray(data, key){
    var pos = isIn(data, key);
    if(pos !== -1){
      data[pos].weight++;
    }else{
      data.push({"text":key, "weight":1})
    }
  }
  function aggSort(a, b) {
    return b.weight - a.weight;
  }
    
  doc.questions.forEach(function(question){
    //Fix for automatic replacement 
    question.text = question.text.replace(/&quot;/g,'"');
    addToArray(questioner, question.from_user);
    delete question.metaData;
    if(question.answers.length === 0){
      unanswered.push(question);
    }else{
      allAnswered.push(question);
      var betterAnswers = [];
      //Lets see if there a some good answers.
      question.answers.forEach(function (anwser){
        anwser.text = anwser.text.replace(/&quot;/g,'"');
        //Fill the responder with another user
        addToArray(responder, anwser.from_user);
        //if it has more in commen than just the language is is a better answer. 
        if(anwser.weight > 0.5){
          betterAnswers.push(anwser)
        }
      });
      //if there has been some good answers
      if(betterAnswers.length >0){
        question.answers = betterAnswers;
        goodAnswered.push(question);
      }
    }
  });
  
  if(req.query.type === "allAnswered"){
    return toJSON(allAnswered);
  }
  if(req.query.type === "goodAnswered"){
    return toJSON(goodAnswered);
  }else if(req.query.type === "unanswered"){
    return toJSON(unanswered);
  }else if(req.query.type === "questioner"){
    return toJSON(questioner.sort(aggSort));
  }else if(req.query.type === "responder"){
    return toJSON(responder.sort(aggSort));
  }else if(req.query.type === "stats"){
    return toJSON({"total": doc.questions.length, "allAnswered": allAnswered.length, "goodAnswered":goodAnswered.length, "unanswered": unanswered.length, "questioner":questioner.length, "responder":responder.length});
  }
}


	ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
		if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
			throw "Only admin can delete documents on this database.";
		}
	}
	couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

	module.exports = ddoc;
