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
var check = require('validator').check;
var sanitize = require('validator').sanitize;

var app = module.exports = express.createServer();

var conn;
var db;
getDBConnectionFromConfig(conf.couchdb, function(error, database, connection){
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
    check(req.query.ytkURL,"Parameter error: in ytkURL").notNull().isUrl();
    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    
    ytk.getArchiveList(req.query.ytkURL,function(jsondata){
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
  //console.log("I got",req.url);
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
            
            var tweetRamStore = archiveInfo.tweets;
            archiveInfo.tweets = new Array();
            dbToSave.save(archiveInfo, function (err, result) {
              if (!result){
                sendError(req, res, err);
                        
              }else{
                
                archiveInfo.tweets = tweetRamStore;
                analyseAndUpdate(archiveInfo, dbToSave);
                //Inform the client
                var urlToDoc = "http://"+connection.host+":"+connection.port+"/"+dbToSave.name+"/"+result.id;
                
                result.status = "ok";
                result.url = urlToDoc;
                console.log("Document saved. at "+ urlToDoc);

                sendJSON(req, res,  result);
              }
            });
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
    check(req.query.dbHost).isUrl();

    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    if(exist(req.query.dbUser)) check(req.query.dbUser).notEmpty();
    if(exist(req.query.dbPw)) check(req.query.dbPw).notEmpty();
    if(exist(req.query.dbSecure)) check(req.query.dbSecure).isBoolean();
    if(exist(req.query.dbPort)) check(req.query.dbPort).isNumber(); else req.query.dbPort = 5984;
  }
  getDBConnection(req.query, function(error, dbToSave, connection){
    if(error != null){
      sendError(req, res, error);
    }else{

      dbToSave.get(req.query.docID, function (err, archiveInfoFromDB) {
        if (err == null){
          req.query.id = archiveInfoFromDB.archive_info.id;
          req.query.ytkURL = archiveInfoFromDB.ytkURL;
          var selectedArchive = ytk.createSelectedArchiveObject(req.query);
          
          ytk.getArchive(selectedArchive, archiveInfoFromDB.messagesSoFar, function(archive){
            if(archive.status == "ok"){
              archiveInfoFromDB.tweets = archive.data.tweets;
              archiveInfoFromDB.archive_info.count = archive.data.tweets.length;
              analyseAndUpdate(archiveInfoFromDB, dbToSave);
              var updating = new helper.ResponseBean();
              updating.status = "ok";
              updating.msg = "updating";
              updating.id = archiveInfoFromDB._id;
              sendJSON(req, res, updating);
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
    check(req.query.ytkURL, "Parameter error: in URL").isUrl();
    check(req.query.l, "Parameter error: in limit").isInt();
    check(req.query.id, "Parameter error: in id").isInt();
    if(exist(req.query.lastID)) check(req.query.lastID).isInt();
    if(exist(req.query.callback)) check(req.query.callback).notEmpty();
    
    ytk.getMsgs (req.query.lastID, req.query.l,req.query.ytkURL,req.query.id, function(messages){
      sendJSON(req, res, messages);
    }); 
  } catch (e) {
    console.log(e.stack);
    sendError(req, res, e.message);
  }
}

function createOrUpdateArchiveHandler(req, res){
  //console.log("I got",req.url);
  var myDateRegEx = /([0-9]{4})-([0-1]{0,1}[0-9]{1})-([0-3]{0,1}[0-9]{1})/;
  // The expression is quite bad bit it is better than nothing
  try {
    parameterCheck(req);
    //Parameter check done
    
    getDBConnection(req.query, function(error, dbToSave, connection){
      if(error != null){
        sendError(req, res, error);
      }else{
        var docID = getDocID(req.query.ytkURL, req.query.id);
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

function analyseAndUpdate(archiveInfo, currentDB){
  analyser.analyseMesseges(archiveInfo, function(result){
    //Update the DB
    currentDB.merge(archiveInfo._id, result, function (err, res) {
       if (!res)
        console.log(err,_.keys(result));
        else{
          console.log("Document updated with",_.keys(result));
        }
    });
  });  
}

function parameterCheck(req){
    check(req.query.ytkURL, "Parameter error: in URL").isUrl();
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
    //DB Params
    if(exist(req.query.dbHost)) {
      check(req.query.dbHost).isUrl();
      check(req.query.dbname).notNull();

      if(exist(req.query.dbUser)) check(req.query.dbUser).notEmpty();
      if(exist(req.query.dbPw)) check(req.query.dbPw).notEmpty();
      if(exist(req.query.dbSecure)) check(req.query.dbSecure).isBoolean();
      if(exist(req.query.dbPort)) check(req.query.dbPort).isNumber(); else req.query.dbPort = 5984;
    }
    //Parameter check done
}
function getDocID(ytkURL, id){
  var md5sum = crypto.createHash('md5');
  md5sum.update(ytkURL);
  
  return md5sum.digest('hex')+"-"+id;
}

function createBasicArchiveInfo(selectedArchive, archive){
  var doc = new Object();
  //doc._id = selectedArchive.ytkURL+"/"+selectedArchive.id;
  doc._id = getDocID(selectedArchive.ytkURL, selectedArchive.id)
  
  doc.archive_info = archive.archive_info;
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
  doc.tweets = archive.tweets;
  
  return doc;
}

//Legancy no longer needed
function getDBParamsFromURL(dbUrl){
  var httpsRegEx = /(https):\/\//;
  var secure = httpsRegEx.test(dbUrl);
  dbUrl = dbUrl.replace("http://","");
  dbUrl = dbUrl.replace("https://","");
  var res = new Object();
  
  var userPassword;

  var hostPort;
  var tmp = _.words(dbUrl, "@");
  if(tmp.length == 2){
    userPassword = _.words(tmp[0], ":");
    //delete http if necessary 
    
    tmp2 = _.words(tmp[1], "/");
  }else{
    tmp2 = _.words(tmp[0], "/");
  }
    hostPort = _.words(tmp2[0], ":");
    if(tmp2.length ==3 ){
      res.doc = tmp2[2];
    }

    res.dbname = tmp2[1]
    
    
    var options = new Object ();
    
    if(secure){
      options.secure = true;
    }
    if(!_.isUndefined(userPassword)){
      options.auth = { username: userPassword[0], password: userPassword[1] };
    }
  

  res.host = hostPort[0];
  res.port = hostPort[1];
  res.options = options;
  
  return res;
}

function getDBParamsFromParams(params){
 
  var res = new Object();

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
    console.log("dbConf",dbConf);
    if(dbConf.host != conf.couchdb.host || dbConf.dbname != conf.couchdb.dbname){
      getDBConnectionFromConfig(dbConf,callback);
    }
    else{callback(null, db, conn);}
  }else{
    callback(null, db, conn);
  }
}

function getDBConnectionFromConfig(dbConf, callback){
  var connection = new(cradle.Connection)(dbConf.host,dbConf.port, dbConf.options);

  connection.info(function (err, json) {
    if (err == null){
      console.log("Couchdb ("+json.version+") at "+dbConf.host+" connected.");
      var forenDb = connection.database(dbConf.dbname); 
      // Create the db if it doesn't exist.
      forenDb.exists(function (error, exists) {
              if (!exists) {
                forenDb.create( 
                  function(error, res){
                    if(error == null){
                      callback(null, forenDb, connection);
                    }else{
                      callback(error, null,null);
                    }
                  });
              }else callback(null, forenDb, connection);
      });
    }
    else{
      err.host = dbConf.host;
      callback(err, null);
      //console.log("info() failed to connect to couchdb : ", err);
    }
  });


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

