/*!
 * twapperlizer
 * Copyright (C) 2011 Nicolas Lehmann 
 * MIT Licensed
 */


/**
 * Module dependencies
 */
var crypto = require('crypto');
var express = require('express');
var cradle = require('cradle');
var request = require('request');
var _ = require('underscore')._
var twapperlyzerCache = require('./twapper_modules/twapperlyzerCache.js')

var app = module.exports = express.createServer();
var conn = new(cradle.Connection)();
var db = conn.database('twapperlyzer'); 
// Create the db if it doesn't exist.
db.exists(function (error, exists) {
        if (!exists) db.create();
});

/**
 * Module Configuration
 */
var port = (process.env.PORT || 3000);
var maxMessages = 500;
var firstMsgsToShow=5;
var expireTime = 60000*30;
var apiListArchives = "/apiListArchives.php";
var apiGetTweets =  "/apiGetTweets.php";

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.use(express.logger({ format: ':method :url' }));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

/**
 * Module Globals
 */
var cache = new twapperlyzerCache.TwapperlyzerCache(expireTime);
var archivesListsCache = new Array();


/**
 * Express Routes:
 *
 */
 
/**
 *  The static JQM page that load all the client side JS code.
 */
app.get('/', function(req, res){
res.sendfile('public/index.html');
});

/**
 *  The Request set the cockie to save the yourTwapperKeeper instance on the client side.
 */
app.post('/ytkURLCookie', function(req, res){
  //it is in req.body since its post, if it would be a get the data would be in req.query
  res.cookie('ytkURL', req.body.ytkURL);
  res.send("ok");
  //res.send(JSON.stringify(myresponse)); 
});

/**
 *  Binding the port an load NowJS
 */
app.listen(port);
console.log('Twaperlizer server listening on port http://0.0.0.0:%d', app.address().port);
// Print the database connection information.
conn.info(function (err, json) {
        if (err == null)
                console.log("info()\t\t: " + json);
        else
                console.log("info() failed\t\t: " + err);
});

var everyone = require('now').initialize(app);
 

/**
 *  A simple Object to transport the status of action
 */
function ResponseBean(){
  this.status;
  this.data;
  this.msg;
}

/**
 * Load the archive list from the net and send it to the client
 *
 * @param {String} ytkURL The url of the YourTwapperKeeper instance
 * @param {Function} callback(`ResponseBean`)
 */
 everyone.now.getArchiveList = function (ytkURL, callback){
    pGetJSON(ytkURL+apiListArchives,function(jsondata){
      callback(jsondata);
      if(jsondata.status == "ok"){
        archivesListsCache[ytkURL] = jsondata.data[0];
      }
    });
};
 

/**
 * Load the selectedArchive from the database or the net.
 *
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Function} callback(`ResponseBean`)
 */
everyone.now.getArchive = function (selectedArchive, callback){
  var that = this;

  selectedArchive.totalMsgCount = selectedArchive.limit;
  var basicArchiveInfo = createBasicArchiveInfo(selectedArchive);

  //Deside the case
  if(selectedArchive.isSearch){
    archiveDownload(selectedArchive, basicArchiveInfo,  callback);
  }else{
    db.get(basicArchiveInfo._id, function (err, archiveInfoFromDB) {
      if (err == null){
        checkForUpdate(selectedArchive, archiveInfoFromDB, callback);
      }else{
        archiveDownload(selectedArchive, basicArchiveInfo, callback);
        console.log("Cant get Document Error: ",err, basicArchiveInfo._id);
      }
    });
  }
};

function createBasicArchiveInfo(selectedArchive){

  var doc = new Object();
  //doc._id = selectedArchive.ytkURL+"/"+selectedArchive.id;
  var md5sum = crypto.createHash('md5');
  md5sum.update(selectedArchive.ytkURL);
  md5sum.update(selectedArchive.id);
  
  doc._id =  md5sum.digest('hex');
  doc.archive_info = archivesListsCache[selectedArchive.ytkURL][selectedArchive.id-1];
  doc.messagesSoFar = "0";
  doc.timestamp = new Date();
  doc.lastMessage = "0";
  doc.isSearch = selectedArchive.isSearch;
  doc.ytkURL = selectedArchive.ytkURL;
  return doc;
}

function checkForUpdate(selectedArchive, archiveInfoFromDB, callback){
  if(selectedArchive.totalMsgCount == archiveInfoFromDB.messagesSoFar){
    var res = new ResponseBean();
    res.status = "ok";
    res.data = archiveInfoFromDB;
    callback(res);
    everyone.now.saveInUserSpace("archiveInfo",archiveInfoFromDB);
    everyone.now.sendDownloadProgress(100);
    console.log("get archive info from database");
  }else{
    //Untested
    var res = new ResponseBean();
    res.status = "ok";
    res.data = archiveInfoFromDB;
    callback(res);
    everyone.now.saveInUserSpace("archiveInfo",archiveInfoFromDB);
    everyone.now.sendDownloadProgress(getProgessInPercent(archiveInfoFromDB.messagesSoFar,selectedArchive.totalMsgCount));
    archiveInfoFromDB.tweets = new Array({id:archiveInfoFromDB.lastMessage});
    getTheMissingMsgs(selectedArchive, archiveInfoFromDB, callback);
  }
}

/**
 * Load the selectedArchive from the net, after getting the archive info and the 
 * first couple of messages it returns it to the client and download the remaing. 
 *
 * @param {Object} that The this scope of the getArchive function
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function archiveDownload(selectedArchive, archiveInfo, callback){
  var url = selectedArchive.ytkURL+apiGetTweets+selectedArchive.url+'&l='+Math.min(selectedArchive.limit,maxMessages);
  //Get the First results to show the user something
  pGetJSON(url,function(jsondata){
    if(jsondata.status == "ok"){
      archiveInfo.tweets = jsondata.data.tweets;
      //If the archive is bigger download the missing
      if(selectedArchive.limit>maxMessages){
        //substract the allready downloaded messages from the total
        selectedArchive.limit = selectedArchive.limit -maxMessages;
        
        getTheMissingMsgs(selectedArchive, archiveInfo, callback);
      
      }else{
         archiveReady(archiveInfo, callback);
      }
    }else{
      gettingArchiveFaild(jsondata, callback);
    }

  });
}



/**
 * Augment the incomplte archive with messages from the net, 
 * put it in the cache and inform the client.
 *
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Object} archiveInfo The incomplete archive.
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function getTheMissingMsgs(selectedArchive, archiveInfo, callback){
  //Get the missing Messages
  var savedMsgs = new ResponseBean();
  savedMsgs.data = archiveInfo.tweets
  getMoreMsgs(selectedArchive,savedMsgs,function(msgs){
    if(msgs.status=="ok"){
      archiveInfo.tweets = msgs.data;
      archiveReady(archiveInfo, callback);
    }else{
      gettingArchiveFaild(msgs, callback);
    }
  });
}

/**
 * Save the archive in the now.user space and in the cache, inform the client 
 * that the archive is now saved.
 *
 * @param {Object} that The this scope of the getArchive Function
 * @param {Object} archive The complete archive.
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function archiveReady(archiveInfo, callback){

  analyse(archiveInfo, function(doc){
    if(!archiveInfo.isSerach){
      db.save(doc, function (err, res) {
        if (!res)
          console.log("Failed to save document: ", err);
        else
          console.log("Document saved.",res);
      });
    }
    everyone.now.saveInUserSpace("archiveInfo",doc);
    var res = new ResponseBean();
    res.status = "ok";
    res.data = doc;
    callback(res);
    everyone.now.sendDownloadProgress(100);
  });
}

/**
 * Is called when getting the Archive faild and handle the error.
 *
 * @param {`ResponseBean`} err
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function gettingArchiveFaild(err, callback){
  console.log('gettingArchiveFaild', err.status);
}

everyone.now.saveInUserSpace = function (name, data){
    this.user[name] = data;
}

everyone.now.getGeoMarker = function (callback){
    callback(this.user.archiveInfo.geoInfo);
}

/**
 * Dowload recursive a archive and return the tweets in the callback
 * @param {Object} selectedArchive The selected archive of the user
 * @param {`ResponseBean`} msgs The part of the messages that are allready downloded
 * @param {`Function`} callback(`ResponseBean`) the complete set of messages or the error
 */
function getMoreMsgs(selectedArchive, msgs, callback){
  if(selectedArchive.limit>0){
  
    //sending the Download progress
    everyone.now.sendDownloadProgress(getProgessInPercent(selectedArchive.limit,selectedArchive.totalMsgCount));
    
    //Limit should decrise with each recusion step and in the last Step be smaller than maxMessages 
    //this is only importend when the user did a search with specific limit.
    var urlLimit = Math.min(selectedArchive.limit,maxMessages);
    
    //The max Id is needed so that the next download start where the last ended.
    selectedArchive.max_id = (msgs.data[msgs.data.length-1].id);
    msgs.data.pop();
    urlLimit++;
    
    var url = selectedArchive.ytkURL+apiGetTweets+selectedArchive.url+"&l="+urlLimit+"&max_id="+selectedArchive.max_id;
    pGetJSON(url,function(jsondata){
          if(jsondata.status == "ok"){
            msgs.status = jsondata.status;
            msgs.data = msgs.data.concat(jsondata.data.tweets);
            //Decrising the amount of messages that still need to get downloaded 
            selectedArchive.limit=selectedArchive.limit-maxMessages;
            getMoreMsgs(selectedArchive, msgs,callback);
          }
          else{
          callback(jsondata);
          }
    });
  }else{
    everyone.now.sendDownloadProgress(100);
    callback(msgs);
  }
}

/**
 * Dowload recursive a archive and return the tweets in the callback
 * @param {Number} percentage
 * @param {Number} base
 */
function getProgessInPercent(percentage,base){
  return Math.floor(100-(percentage/(base/100)));
}

/**
 * A dummy function to get debug values to the client.
 * @param {Function} callback
 */
everyone.now.msgAmount = function (callback){
callback(this.user.jsonCurrentArchive.tweets.length);
}

/**
 * Call a function on the client to update the download progress bar.
 * @param {Number} percent
 */
everyone.now.sendDownloadProgress = function (percent){
this.now.updateDowloadSlider(percent);
}

/**
 * Copy messages from this.user space to the this.now space. To make them 
 * available on the client side.
 *
 * @param {Number} from
 * @param {Number} to
 * @param {Function} callback(`String`)
 */
everyone.now.getMsgs = function(lastID, limit, callback){
  var url = this.user.archiveInfo.ytkURL+apiGetTweets+"?id="+this.user.archiveInfo.archive_info.id+"&l="+limit;
  if(lastID != 0){
    url+="&max_id="+lastID;
  }
  pGetJSON(url, function(response){
    if(response.status == "ok"){
      callback(response.data.tweets);
    }else{
      console.log("Error while loading messages ",response);
    }
  });
};

/**
 * Get JSON Data over the net
 *
 * @param {String} url
 * @param {Function} callback(`ResponseBean`)
 */
var pGetJSON = function (url,callback){
  //console.log("try to reach: ", url);
  request({ uri:url }, function (error, response, body) {
    var myresponse = new ResponseBean();
    if (error) {
      myresponse.status = "error";
      myresponse.msg = "Could not connect to: "+url;
    }else if(body[0]=="{" || body[0]=="["){
      myresponse.status = "ok";
      try {
        myresponse.data = JSON.parse(body);
      } catch (err) {
        myresponse.status = "error";
        console.log('GetJSON Error', err);
        myresponse.msg = 'Can not parse JSON :';
      }
    }
    else{
      myresponse.status = "error";
      myresponse.msg = "JSON not valid: ";
    }
    console.log('JSON response: ', myresponse.status, 'for: ',url);
    callback(myresponse);
  });
}

/**
 * Making the pGetJSON function available in the everyone.now space,
 * so that it is callable from the client side.
 */
everyone.now.getJSON = pGetJSON;

function analyse(archiveInfo,callback){
  
  //The diffrent analyses
  archiveInfo.geoInfo = getGeoInfoFromMessages(archiveInfo.tweets)
  
  archiveInfo.messagesSoFar = archiveInfo.tweets.length;
  archiveInfo.lastMessage = _.last(archiveInfo.tweets).id;
  archiveInfo.tweets = new Array();
  callback(archiveInfo);
}

/**
 * Search for messages that are have a geo tag and aggregate 
 * them if the are on the same position.
 * 
 * @param{Array} messages The Messages that came from twapperkeeper
 * @return{Array} res The aggregated geo Positions of in input Array
 */
function getGeoInfoFromMessages(messages){
  var res = new Array();
  var al = messages.length;
  for (var i = 0; i <al ; i++) {
    if(messages[i].geo_coordinates_0 != 0 || messages[i].geo_coordinates_1 != 0){
      //detect if the was already a message send at this place
      var wasSeen =  _.detect(res, function(marker){
        return (marker.lat == messages[i].geo_coordinates_0 && marker.long == messages[i].geo_coordinates_1);
        });
      if(_.isUndefined(wasSeen)){
        //Setting uo a new marker with a position
        var geoMarkerInfo = new Object();
        geoMarkerInfo.lat = messages[i].geo_coordinates_0;
        geoMarkerInfo.long = messages[i].geo_coordinates_1;
        
        //a user with name
        var user = new Object();
        user.name = messages[i].from_user;
                
        //and the tweetID + time
        user.tweets = new Array();
        var newTweet = new Object();
        newTweet.id = messages[i].id;
        newTweet.time = messages[i].time;
        user.tweets.push(newTweet);
        
        //adding the user to marker
        geoMarkerInfo.users = new Array(user);

        res.push(geoMarkerInfo);
      }else{
        //detect if it is the same user as last time
        var user =  _.detect(wasSeen.users, function(user){
          return (user.name == messages[i].from_user);
        });
        if(_.isUndefined(user)){
          //A new User
          user = new Object();
          user.name = messages[i].from_user;
          
          //Set up his tweet Array
          user.tweets = new Array();
          var newTweet = new Object();
          newTweet.id = messages[i].id;
          newTweet.time = messages[i].time;
          user.tweets.push(newTweet);
          
          wasSeen.users.push(user);
        }else{
          //Just add the new tweet to the existing Array
          var newTweet = new Object();
          newTweet.id = messages[i].id;
          newTweet.time = messages[i].time;
          user.tweets.push(newTweet);
        }
      }
    }
  }
  return res;
}
