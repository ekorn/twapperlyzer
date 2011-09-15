 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/twapperlyzer'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    , {from:"/api", to:'../../'}
    , {from:"/dbname/*", to:'../../*'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.lists = {};

ddoc.lists.aggrigate = function(head, req){
  function aggrigate(data) {
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

  var row;
  var docs = [];
  while(row = getRow()) {
    docs.push(row.value);
  }
  if(docs.length>0){
    if(docs[0][0].lat !== void 0){
      send(toJSON(aggrigateGeo(docs)));
    }
    else{
      send(toJSON(aggrigate(docs).sort(aggSort)));
    }
  }else{
    send(toJSON({}));
  }
}

ddoc.lists.aggrigateMin2 = function(head, req){
  function aggrigate(data) {
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
  var agg = aggrigate(docs).sort(aggSort);
  var res = [];
  for(var i=0; i<agg.length; i++){
    if(agg[i].weight === 1){
      break
    }
    res.push(agg[i]);
  }

  send(toJSON(res));
}

ddoc.lists.aggrigateLimit25 = function(head, req){
  function aggrigate(data) {
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
  var agg = aggrigate(docs).sort(aggSort);
  send(toJSON(agg.slice(0,25)));
}

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

ddoc.views.questions = {
  map: function(doc) {
    if(doc.type === "questions"){
      emit(doc._id, doc);
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

/*
ddoc.views.male = {
  map: function(doc) {
    if(doc.type === "user"){
      if(doc.gender === "m")
        emit(doc.screen_name, 1);
    }
  },
  reduce: "_count"
}

ddoc.views.female = {
  map: function(doc) {
    if(doc.type === "user"){
      if(doc.gender === "f")
        emit(doc.screen_name, 1);
    }
  },
  reduce: "_count"
}

ddoc.views.unknownGender = {
  map: function(doc) {
    if(doc.type === "user"){
      if(doc.gender === "m,f")
        emit([doc.screen_name, doc.name], 1);
    }
  },
  reduce: "_count"
}

ddoc.views.gender = {
  map: function(doc) {
    if(doc.type === "user"){
        emit([doc.screen_name, doc.name], doc.gender);
    }
  },
  reduce: function (key, values, rereduce){
    var res = {"male":0,"female":0, "total":values.length};
    values.forEach(function(value){
      if(value === "m")
        res.male++;
      if(value === "f")
        res.female++;
    });
    return res;
  }
}

ddoc.views.countUser = {
  map: function(doc) {
    if(doc.type === "user"){
        emit([doc.screen_name], 1);
    }
  },
  reduce: "_count"
}

ddoc.views.reach = {
  map: function(doc) {
    if(doc.type === "user"){
        emit(doc.screen_name, doc.followers_count);
    }
  },
  reduce: "_sum"
}
*/

  //
//http://localhost:5984/twapperlyzer2/_design/twapperlyzer/_view/language?startkey=%221299780000%22&endkey=%221308067200%22&startkey_docid=29863de6315290d576d34e93d122c944-1-1299780000&endkey_docid=29863de6315290d576d34e93d122c944-1-1308067200
  

	ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
		if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
			throw "Only admin can delete documents on this database.";
		}
	}
	couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

	module.exports = ddoc;
