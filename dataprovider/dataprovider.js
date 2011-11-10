/*!
 * twapperlizer
 * Copyright (C) 2011 Nicolas Lehmann 
 * MIT Licensed
 */


/**
 * Module dependencies
 */
var conf = require('config');
var crypto = require('crypto');
var express = require('express');
var request = require('request');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var OAuth = require('oauth').OAuth;
var oAuth= new OAuth("http://twitter.com/oauth/request_token",
                 "http://twitter.com/oauth/access_token", 
                 conf.twitter.consumerKey,  conf.twitter.consumerSecret, 
                 "1.0A", null, "HMAC-SHA1");
var analyser = require('./twapper_modules/analyser.js');
var helper = require('./twapper_modules/helper.js');
var ytk = require('./twapper_modules/yourTwapperkeeper.js');

var check = require('validator').check;
var sanitize = require('validator').sanitize;

var app = module.exports = express.createServer();

var conn;
var db;
helper.getDBConnectionFromConfig(conf.couchdb, function(error, database, connection){
  if(error == null){
    conn = connection;
    db  = database;
  }else{
    console.log("Database error:",error);
  }
});


/**
 * Module Configuration
 */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.set( "json callback", true );
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
 * Express Routes:
 *
 */
 
/**
 * The static file that explain the API
 */
app.get('/', function(req, res){
res.sendfile('public/index.html');
});

app.get('/getArchiveList', getArchiveListHandler);
app.get('/analyseArchive', analyseArchiveHandler);
app.get('/updateArchive',updateArchiveHandler);
app.get('/createOrUpdateArchive',createOrUpdateArchiveHandler);
app.get('/getMsgs',getMsgsHandler);
app.get('/testAPI', function(req,res){
  var responseBean = new helper.ResponseBean();
  responseBean.status = "ok";
  responseBean.msg = "twapperlyzer dataprovider";
  
  sendJSON(req, res, responseBean);
});

app.listen(conf.twapperlyzer.port);

/**
 * Some status output
 */
console.log('Twaperlizer server listening on port http://0.0.0.0:%d', app.address().port);


/**
 * The Functions:
 *
 */
 
 
/**
 * The Request to download the List of URLs and forward them
 * @param archiveListUrl 
 * @param targetUrl
 */
function getArchiveListHandler(req, res){
  try {
    check(req.query.ytkUrl,"Parameter error: in ytkUrl").notNull().isUrl();
    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    
    ytk.getArchiveList(req.query.ytkUrl,function(jsondata){
      sendJSON(req, res, jsondata);
    });
  } catch (e) {
    console.log(e.stack);
    sendError(res, req, e.message);
  }
}

/**
 * The Request to analyse a archive and store it in the DB or 
 * return it direct.
 * @param archiveUrl The 
 * @param targetUrl
 */
function analyseArchiveHandler(req, res){
  console.log("I got",req.url);
  var myDateRegEx = /([0-9]{4})-([0-1]{0,1}[0-9]{1})-([0-3]{0,1}[0-9]{1})/;
  // The expression is quite bad bit it is better than nothing
  try {
    parameterCheck(req);
    //Parameter check done

    getDBConnection(req.query, function(error, dbToSave, connection){
      if(error != null){
        sendError(req, res, error);
      }else{
      var selectedArchive = ytk.createSelectedArchiveObject(req.query);
        ytk.getArchive(selectedArchive, 0, function(archive){
          if(archive.status == "ok"){
            var archiveInfo = createBasicArchiveInfo(selectedArchive, archive.data);
            analyseAndUpdate(archiveInfo, dbToSave, req, res);
//Useless since the information is distributed in x docs
//var urlToDoc = "http://"+connection.host+":"+connection.port+"/"+dbToSave.name+"/"+result.id;
          }else{
            sendError(req, res, archive.msg);
          }
        });
      }
    });
  } catch (e) {
    console.log(e.stack);
    sendError(req, res, e.message);
  }
}

/**
 *  The Request to update a archive, analyse the result and store it in the DB.
 */
function updateArchiveHandler(req, res){
  try{
  check(req.query.docID,"CouchDB doc id is missing").notNull();
  check(req.query.l, "Parameter error: in limit").isInt();
  if(exist(req.query.dbHost)){
    check(req.query.dbname).notNull();
    //check(req.query.dbHost).isUrl();

    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    if(exist(req.query.dbUser)) check(req.query.dbUser).notEmpty();
    if(exist(req.query.dbPw)) check(req.query.dbPw).notEmpty();
    if(exist(req.query.dbSecure)) check(req.query.dbSecure).isBoolean();
    if(exist(req.query.dbPort)) check(req.query.dbPort).isInt(); else req.query.dbPort = 5984;
  }
  getDBConnection(req.query, function(error, dbToSave, connection){
    if(error != null){
      sendError(req, res, error);
    }else{

      dbToSave.get([req.query.docID,req.query.docID+"-qu",req.query.docID+"-di"], function (err, docs) {
        if (err == null){
          archiveInfoFromDB = docs[0].doc;
          archiveInfoFromDB.questionsDoc = docs[1].doc;
          archiveInfoFromDB.discussionsDoc = docs[2].doc
          req.query.id = archiveInfoFromDB.archive_info.id;
          req.query.ytkUrl = archiveInfoFromDB.ytkUrl;
            //console.log("updateArchiveHandler",req.query.ytkUrl,archiveInfoFromDB.ytkUrl);
          var selectedArchive = ytk.createSelectedArchiveObject(req.query);
          
          ytk.getArchive(selectedArchive, archiveInfoFromDB.messagesSoFar, function(archive){
            if(archive.status == "ok"){
              archiveInfoFromDB.tweets = archive.data.tweets;
              archiveInfoFromDB.archive_info.count = archive.data.archive_info.count;
              analyseAndUpdate(archiveInfoFromDB, dbToSave, req, res);
            }
            else{
              if(archive.msg == "No need to Update"){
                var resBean = new helper.ResponseBean();
                resBean.status = "ok";
                resBean.id = req.query.docID;
                resBean.msg = "No need to Update";
                sendJSON(req, res, resBean);
              }else{
                sendError(req, res,archive.msg);
              }
            }
          });
        }else{
          sendError(req, res, "can't find document at:"+req.query.dbUrl+"/"+req.query.docUrl);
        }
      });
    }
  });

  } catch (e) {
    console.log(e.stack);
    sendError(req, res, e.message);
  }
}

function getMsgsHandler(req, res){
  try {
    check(req.query.ytkUrl, "Parameter error: in URL").isUrl();
    check(req.query.l, "Parameter error: in limit").isInt();
    check(req.query.id, "Parameter error: in id").isInt();
    if(exist(req.query.lastID)) check(req.query.lastID).isInt();
    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    
    ytk.getMsgs (req.query.lastID, req.query.l,req.query.ytkUrl,req.query.id, function(messages){
      sendJSON(req, res, messages);
    }); 
  } catch (e) {
    console.log(e.stack);
    sendError(req, res, e.message);
  }
}

function createOrUpdateArchiveHandler(req, res){
  //console.log("I got",req.url);
  try {
    parameterCheck(req);
    //Parameter check done
    
    getDBConnection(req.query, function(error, dbToSave, connection){
      if(error != null){
        sendError(req, res, error);
      }else{
        var docID = getDocID(req.query.ytkUrl, req.query.id);
        dbToSave.get(docID, function (err, archiveInfoFromDB) {
          if (err != null){
            if(err.error == "not_found"){
              analyseArchiveHandler(req, res);
            }else{
              sendError(req, res, err);
            }
          }else{
            //FOUND id lets update
            req.query.docID = docID;
            updateArchiveHandler(req, res);
          }
        });
        
      }
    });
      
  } catch (e) {
    console.log(e.stack);
    sendError(req, res, e.message);
  }
}

function analyseAndUpdate(archiveInfo, currentDB, request, response){
  var ptime = new Date();
  analyser.analyseMesseges(archiveInfo, function(err, analysePart, callback){
    if (err) throw err;
    //maybe change to all types
    if(analysePart.type === "user"){
      db.get(analysePart._id, function (err, doc){
        if (err) {
          db.save(analysePart._id, analysePart, function (err, res) {
            if (err) {
              console.log("Cannot resolve error in save",err,analysePart);
              throw err;
            }else{
            callback(null, "ok");
            }
          });
        }else{
          var newDoc = mergeDocs(doc, analysePart);
          db.save(newDoc._id, newDoc, function (err, res) {
            if (err) {
              console.log("Cannot resolve error in save",err,analysePart);
              throw err;
            }else{
            callback(null, "ok");
            }
          });
        }
      });
    }else{
      db.save(analysePart._id, analysePart, function (err, res) {
        if (err) {
          console.log("Error while save ",analysePart, err);
          db.get(analysePart._id, function (err, doc){
            if (err) {
              console.log("Cannot resolve error in get",err);
              throw err;
            }else{
              var newDoc = mergeDocs(doc, analysePart);
              db.save(newDoc._id, newDoc, function (err, newres) {
                if (err) {
                  console.log("Cannot resolve error in save",err);
                  throw err;
                }else{
                  handleRes(newres);
                }
              });
            }
          });
        }else{
           handleRes(res);
        }
        
        function handleRes(res){
          if(!_.isUndefined(analysePart.messagesSoFar)){
            if(analysePart.status === "analysing"){
              callback(null, "ok")
              var updating = new helper.ResponseBean();
              updating.status = "ok";
              updating.msg = "analysing";
              updating.id = archiveInfo._id;
              sendJSON(request, response, updating);
            }else if(analysePart.status === "done" && res._rev.split("-")[0]==2){
              db.get("config", function(err, res){
                var analyseTime = (new Date().getTime()- ptime.getTime());
                var tweet = "after "+helper.convertMilliseconds(analyseTime).clock+" is #twapperlyzer done with "+analysePart.archive_info.keyword
                if (res) {
                  tweet+=" see http://"+res.standardUrl+"/#page-"+analysePart._id;
                }
                if(exist(request.query.mention) && request.query.mention !== "" ){
                  tweet = "@"+request.query.mention+" "+tweet
                }
                if(conf.twapperlyzer.sendTweets === true ){
                  oAuth.post("http://api.twitter.com/1/statuses/update.json", conf.twitter.accessToken, 
                  conf.twitter.accessTokenSecret, {"status":tweet}, function(error, data) {
                    if(error) console.log(require('sys').inspect(error));
                  }); 
                }else{
                  console.log("tweet",tweet);
                }
              });
            }
          }else{
            callback(null, "ok");
          }
        }
      });
    }
  });
}

function mergeDocs(oldDoc, newDoc){
  if(oldDoc.type !== "hourData" && oldDoc.type !== "user" && oldDoc.type !== "meta" && oldDoc.type !== "questions" && oldDoc.type !== "discussions"){
    var error = {"error":"cant merge documents with type "+oldDoc.type} ;
    console.log(error);
    throw error;
  }
  
  if(oldDoc.type === "hourData" ){
    oldDoc.weight += newDoc.weight;
    oldDoc.rt += newDoc.rt;
    oldDoc.rt += newDoc.rt;
    oldDoc.rtu = analyser.aggrigateAggrigatedData(oldDoc.rtu, newDoc.rtu);
    oldDoc.ht = analyser.aggrigateAggrigatedData(oldDoc.ht, newDoc.ht);
    oldDoc.un = analyser.aggrigateAggrigatedData(oldDoc.un, newDoc.un);
    oldDoc.geo = analyser.aggrigateGeo(oldDoc.geo, newDoc.geo);
    oldDoc.keywords = analyser.aggrigateAggrigatedData(oldDoc.keywords, newDoc.keywords);
    oldDoc.language = analyser.aggrigateAggrigatedData(oldDoc.language, newDoc.language);
    oldDoc.me = analyser.aggrigateAggrigatedData(oldDoc.me, newDoc.me);
    oldDoc.sentiment.positive += newDoc.sentiment.positive;
    oldDoc.sentiment.neutral += newDoc.sentiment.neutral;
    oldDoc.sentiment.negative += newDoc.sentiment.negative;
    oldDoc.urls = analyser.aggrigateAggrigatedData(oldDoc.urls, newDoc.urls);
    
    return oldDoc;
  }
  
  if(oldDoc.type === "user" ){
    newDoc._rev = oldDoc._rev;
    if(!(_.detect(oldDoc.archives, function(archive){
      return archive[0] === newDoc.archives[0][0];
    }))){
      newDoc.archives = newDoc.archives.concat(oldDoc.archives);
    }
    return newDoc;
  }
  if(oldDoc.type === "meta" || oldDoc.type === "questions"|| oldDoc.type === "discussions"){
    newDoc._rev = oldDoc._rev;
    
    return newDoc;
  }
}

function parameterCheck(req){
    var myDateRegEx = /([0-9]{4})-([0-1]{0,1}[0-9]{1})-([0-3]{0,1}[0-9]{1})/;
    // The expression is quite bad bit it is better than nothing
  
    check(req.query.ytkUrl, "Parameter error: in URL "+req.query.ytkUrl).isUrl();
    check(req.query.l, "Parameter error: in limit").isInt();
    check(req.query.id, "Parameter error: in id").isInt();
    if(exist(req.query.nort)) check(req.query.nort).isAlpha();
    if(exist(req.query.startDate)) check(req.query.startDate).regex(myDateRegEx);
    if(exist(req.query.endDate)) check(req.query.endDate).regex(myDateRegEx);
    if(exist(req.query.from_user)) sanitize(req.query.from_user).xss();
    if(exist(req.query.text)) sanitize(req.query.text).xss();
    if(exist(req.query.o)) check(req.query.o).is(/[a,d]/);
    if(exist(req.query.lang)) check(req.query.lang).isAlpha().len(2, 2);
    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    if(exist(req.query.mention)) check(req.query.mention).isAlphanumeric().len(0, 15);
    
    //DB Params
    if(exist(req.query.dbHost)) {
      //check(req.query.dbHost).isUrl();
      check(req.query.dbname).notNull();

      if(exist(req.query.dbUser)) check(req.query.dbUser).notEmpty();
      if(exist(req.query.dbPw)) check(req.query.dbPw).notEmpty();
      if(exist(req.query.dbSecure)) check(req.query.dbSecure).isBoolean();
      if(exist(req.query.dbPort)) check(req.query.dbPort).isInt(); else req.query.dbPort = 5984;
    }
    //Parameter check done
}
function getDocID(ytkUrl, id){
  var md5sum = crypto.createHash('md5');
  md5sum.update(ytkUrl);
  
  return md5sum.digest('hex')+"-"+id;
}

function createBasicArchiveInfo(selectedArchive, archive){
  var doc = {};
  //doc._id = selectedArchive.ytkUrl+"/"+selectedArchive.id;
  doc._id = getDocID(selectedArchive.ytkUrl, selectedArchive.id)
  
  doc.archive_info = archive.archive_info;
  doc.messagesSoFar = 0;
  doc.timestamp = new Date();
  doc.type = "meta";
  doc.status = "init";
  doc.isSearch = selectedArchive.isSearch;
  doc.ytkUrl = selectedArchive.ytkUrl;
  doc.questionsDoc =  {"_id": doc._id+"-qu", "type":"questions", "questions": []};
  doc.discussionsDoc =  {"_id": doc._id+"-di", "type":"discussions", "discussions": []};
  doc.tweets = archive.tweets;
  
  return doc;
}

function getDBParamsFromParams(params){
 
  var res = {};

  var options = new Object ();
  
  options.secure = false;
  
  if(!_.isUndefined(params.dbSecure)){
    options.secure = dbSecure;
  }
  if(!_.isUndefined(params.dbUser) && !_.isUndefined(params.dbPw)){
    options.auth = { username: params.dbUser , password: params.dbPw };
  }
  
  res.dbname = params.dbname;
  res.host = params.dbHost;
  res.port = params.dbPort;
  res.options = options;
  
  return res;
}

function getDBConnection(params, callback){
  if(exist(params.dbHost)){
    var dbConf = getDBParamsFromParams(params);
    if(dbConf.host != conf.couchdb.host || dbConf.dbname != conf.couchdb.dbname){
      helper.getDBConnectionFromConfig(dbConf,callback);
    }
    else{callback(null, db, conn);}
  }else{
    callback(null, db, conn);
  }
}
function exist(param){
 return !(typeof param === 'undefined');
}

function sendError(req, res, message){
  var response = new helper.ResponseBean();
  response.status = "error";
  response.msg = message;
  sendJSON(req, res, response);
  console.log("Error: ",message);
}

function sendJSON(req, res, response){
  res.header('Charset', 'utf-8');
  
  if(_.isUndefined(req.query.callback)){
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(response));  
  }else{
    res.header('Content-Type', 'text/javascript');
    res.send(req.query.callback + '('+JSON.stringify(response)+');');
  }
}

