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
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var analyser = require('./twapper_modules/analyser.js');
var helper = require('./twapper_modules/helper.js');
var ytk = require('./twapper_modules/yourTwapperkeeper.js');
var conf = require('config');

var app = module.exports = express.createServer();
var conn = new(cradle.Connection)(conf.couchdb.host, conf.couchdb.port, {
    auth: { username: conf.couchdb.username, password: conf.couchdb.password }
});
var db = conn.database(conf.couchdb.dbname); 
// Create the db if it doesn't exist.
db.exists(function (error, exists) {
        if (!exists) db.create();
});

/**
 * Module Configuration
 */

var firstMsgsToShow=5;


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
app.listen(conf.twapperlyzer.port);
console.log('Twaperlizer server listening on port http://0.0.0.0:%d', app.address().port);
// Print the database connection information.
conn.info(function (err, json) {
        if (err == null)
                console.log("info()\t\t: " + json);
        else
                console.log("info() failed to connect to couchdb : ", err);
});

var everyone = require('now').initialize(app);
 
 
everyone.now.getArchiveList = ytk.getArchiveList;

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
    ytk.getArchive(selectedArchive, 0, function(archive){
      if(archive.status == "ok"){
        basicArchiveInfo.tweets = archive.data.tweets;
        archiveReady(basicArchiveInfo, callback);
      }
    });
  }else{
    db.get(basicArchiveInfo._id, function (err, archiveInfoFromDB) {
      if (err == null){
        checkForUpdate(selectedArchive, archiveInfoFromDB, callback);
      }else{
        ytk.getArchive(selectedArchive, 0, function(archive){
          if(archive.status == "ok"){
            basicArchiveInfo.tweets = archive.data.tweets;
            archiveReady(basicArchiveInfo, callback);
          }
        });
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
  doc.archive_info = ytk.archivesListsCache[selectedArchive.ytkURL][selectedArchive.id-1];
  doc.messagesSoFar = 0;
  doc.timestamp = new Date();
  doc.lastMessage = 0;
  doc.isSearch = selectedArchive.isSearch;
  doc.ytkURL = selectedArchive.ytkURL;
  //fields for analyses
  doc.urls = new Array();
  doc.geoMarker = new Array();
  doc.mentions = new Array();
  doc.hashtags = new Array();
  doc.users = new Array();
  
  return doc;
}

function checkForUpdate(selectedArchive, archiveInfoFromDB, callback){
  if(selectedArchive.totalMsgCount == archiveInfoFromDB.messagesSoFar){
    var res = new helper.ResponseBean();
    res.status = "ok";
    res.data = archiveInfoFromDB;
    callback(res);
    everyone.now.saveInUserSpace("archiveInfo",archiveInfoFromDB);
    everyone.now.sendDownloadProgress(100);
    console.log("get archive info from database");
  }else{
    
    var res = new helper.ResponseBean();
    res.status = "ok";
    res.data = archiveInfoFromDB;
    callback(res);
    
    everyone.now.saveInUserSpace("archiveInfo",archiveInfoFromDB);
    everyone.now.sendDownloadProgress(getProgessInPercent(archiveInfoFromDB.messagesSoFar,selectedArchive.totalMsgCount));
    ytk.getArchive(selectedArchive, archiveInfoFromDB.messagesSoFar, function(archive){
      if(archive.status == "ok"){
        archiveInfoFromDB.tweets = archive.data.tweets;
        archiveInfoFromDB.archive_info.count = archive.data.tweets.length;
        archiveReady(archiveInfoFromDB, callback);
      }
    });
  }
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
  //console.log("archiveInfo",archiveInfo);
  archiveInfo.messagesSoFar = archiveInfo.messagesSoFar + archiveInfo.tweets.length;
  archiveInfo.lastMessage = _.last(archiveInfo.tweets).id;
  everyone.now.saveInUserSpace("archiveInfo",archiveInfo);
  
  var tweetRamStore = archiveInfo.tweets;
  archiveInfo.tweets = new Array();
  
  var res = new helper.ResponseBean();
  res.status = "ok";
  res.data = archiveInfo;
  callback(res);
  
  everyone.now.sendDownloadProgress(100);
    
  if(!archiveInfo.isSerach){

    db.save(archiveInfo, function (err, res) {
      if (!res)
        console.log("Failed to save document: ", err);
      else{
        console.log("Document saved.",res);
        archiveInfo.tweets = tweetRamStore;
        
        analyser.analyseMesseges(archiveInfo, function(result){
          //archiveInfo.geoMarkerCount = allgeoMarker.length;
          //Save it in the DB
          db.merge(archiveInfo._id, result, function (err, res) {
             if (!res)
              console.log(err,_.keys(result));
              else{
                console.log("Document updated with",_.keys(result));
                //Save it in the Ram
                for (var i = 0; i < _.keys(result).length; i++){
                  everyone.now.partIsReady(_.keys(result)[i], _.values(result)[i]);
                }
              }
          });
        });
        
      }
    });
  }else{
    archiveInfo.tweets = tweetRamStore;
    analyser.analyseMesseges(archiveInfo, function(result){
      //Save it in the Ram
      for (var i = 0; i < _.keys(result).length; i++){
        everyone.now.partIsReady(_.keys(result)[i], _.values(result)[i]);
      }
    });
  }
}

/**
 * Notifying the client that a part of the analyse is ready and saved 
 * in the archiveInfo Var in the this.user space.
 *
 * @param {Array} part
 */
everyone.now.partIsReady = function(name, data){
  this.now.partIsSaved(name, data);
}


everyone.now.saveInUserSpace = function (name, data){
    this.user[name] = data;
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


everyone.now.getMsgs = function(lastID, limit, callback){
  ytk.getMsgs(lastID, limit, this.user.archiveInfo.ytkURL, this.user.archiveInfo.archive_info.id, callback)
};


/**
 * Making the helper.getJSON function available in the everyone.now space,
 * so that it is callable from the client side.
 */
everyone.now.getJSON = helper.getJSON;
