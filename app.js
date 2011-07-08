/*!
 * twapperlizer
 * Copyright (C) 2010-2011 Nicolas Lehmann 
 * MIT Licensed
 */


/**
 * Module dependencies
 */

var express = require('express');

var app = module.exports = express.createServer();
var request = require('request');
 
var twapperlyzerCache = require('./twapper_modules/twapperlyzerCache.js')

/**
 * Module Configuration
 */
var port = (process.env.PORT || 3000);
var maxMessages = 200;
var firstMsgsToShow=5;
var expireTime = 60000*30;

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
var everyone = require('now').initialize(app);
 



//apiListArchivesUrl = url+ "apiListArchives.php";
//apiGetTweetsUrl = url+ "apiGetTweets.php";

/**
 *  A simple Object to tranport the status of action
 */
function ResponseBean(){
  this.status;
  this.data;
  this.msg;
}

 

/**
 * Load the selectedArchive from the net or the cache.
 *
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Function} callback(`ResponseBean`)
 */
everyone.now.getArchive = function (selectedArchive, callback){
  var that = this;

  selectedArchive.totalMsgCount = selectedArchive.limit;
  selectedArchive.staticURLPart = this.now.ytkURL+ 'apiGetTweets.php';
  
  //Deside the case
  if(selectedArchive.isSearch){
    archiveDownload(that, selectedArchive, callback);
  }else{
    if(cache.isInCache(this.now.ytkURL, selectedArchive.id)){
      getArchiveFromCache(that, selectedArchive, this.now.ytkURL, callback);
    }else{
      archiveDownload(that, selectedArchive, callback);
    }
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
function archiveDownload(that, selectedArchive, callback){
  var url = selectedArchive.staticURLPart+selectedArchive.url+'&l='+Math.min(selectedArchive.limit,maxMessages);
  //Get the First results to show the user something
  pGetJSON(url,function(jsondata){
    if(jsondata.status == "ok"){
      //Saving the if it is a Search or not to decide if it belongs in cache
      jsondata.data.archive_info.noCache = selectedArchive.isSearch;
      //Return the First results
      setUpCallback(jsondata.data, (selectedArchive.limit<maxMessages),callback);
    }else{
      gettingArchiveFaild(jsondata);
    }
    
    //If the archive is bigger download the missing
    if(selectedArchive.limit>maxMessages){
      //substract the allready downloaded messages from the total
      selectedArchive.limit = selectedArchive.limit -maxMessages;
      getTheMissingMsgs(that, selectedArchive, jsondata.data);
    
    }else{
       archiveReady(that,jsondata.data);
    }
  });
}

/**
 * Load the selectedArchive from the cache and returns it to the client. 
 * After getting the archive from the cache it make sure that it's still up to 
 * date. If not it will download the remaing. 
 *
 * @param {Object} that The this scope of the getArchive Function
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive Function.
 */
function getArchiveFromCache(that, selectedArchive, ytkURL, callback){
  var archiveFromCache = cache.getFromCache(ytkURL, selectedArchive.id);
  if(archiveFromCache.archive_info.count == selectedArchive.limit){
    //The easy case just return the cached result.
    setUpCallback(archiveFromCache, true, callback);
    archiveFromCache.archive_info.noCache = true;
    archiveReady(that, archiveFromCache);
  }else{
    //FIXME This is still untested 
    //The Version from the cache has to be updated
    
    //substract the allready cached messages from the total
    selectedArchive.limit = selectedArchive.limit -archiveFromCache.archive_info.count;
    
    //First return the cached results
    setUpCallback(archiveFromCache, false, callback);
    
    getTheMissingMsgs(that, selectedArchive, archiveFromCache);
  }
}

/**
 * Augment the incomplte archive with messages from the net, 
 * put it in the cache and inform the client.
 *
 * @param {Object} that The this scope of the getArchive Function
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Object} savedArchive The incomplete archive.
 */
function getTheMissingMsgs(that, selectedArchive, savedArchive){
  //Get the missing Messages
  var savedMsgs = new ResponseBean();
  savedMsgs.data = savedArchive.tweets
  getMoreMsgs(selectedArchive,savedMsgs,function(msgs){
    if(msgs.status=="ok"){
      savedArchive.tweets = msgs.data;
      archiveReady(that, savedArchive);
    }else{
      gettingArchiveFaild(msgs);
    }
  });
}

/**
 * Build and prepare a `ResponseBean` with the archive info and the 
 * first couple of messages. Finnaly send it back to the client.
 *
 * @param {Object} archive The ytk archive
 * @param {Boolean} isComplete True if the archive is allready complete
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive Function.
 */
function setUpCallback(archive, isComplete, callback){
  var myresponse = new ResponseBean();

  var fakeArchive = new Object();
  //need a empty arry to copy the first messages
  fakeArchive.tweets= new Array();
  myresponse.data = fakeArchive;
  myresponse.status = "ok";
  myresponse.data.archive_info = archive.archive_info;
  
  //other wise the loop might fail
  if(archive.tweets == null){
    archive.tweets = new Array();
  }
  
  //Copy the first messages to save bandwidth
  for(var i=0; i<Math.min(firstMsgsToShow,archive.tweets.length); i++){
    myresponse.data.tweets[i]=archive.tweets[i];
  }
  
  if(!isComplete){
    myresponse.data.archive_info.count = "-";
  }

  callback(myresponse);
}

/**
 * Save the archive in the now.user space and in the cache, inform the client 
 * that the archive is now saved.
 *
 * @param {Object} that The this scope of the getArchive Function
 * @param {Object} archive The complete archive.
 */
function archiveReady(that, archive){
  //Correct the length in the info
  archive.archive_info.count = archive.tweets.length;
  //Save the final whole archive in the userspace
  that.user.jsonCurrentArchive = archive;
  
  // If it is no seach add it to the cache, it dosen't make sense to cache searches
  if(!archive.archive_info.noCache){
    cache.addToCache(that.now.ytkURL, archive);
  }

  //Also update the length info and the download progrss on the client side
  that.now.jsonCurrentArchive.archive_info.count = archive.tweets.length;
  everyone.now.sendDownloadProgress(100);
}

/**
 * Is called when getting the Archive faild and handle the error.
 *
 * @param {`ResponseBean`} err
 */
function gettingArchiveFaild(err){
  console.log('gettingArchiveFaild', err.status);
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
    
    var url = selectedArchive.staticURLPart+selectedArchive.url+"&l="+urlLimit+"&max_id="+selectedArchive.max_id;
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
everyone.now.getMsgs = function(from, to, callback){
  for(from; from<Math.min(to,this.user.jsonCurrentArchive.tweets.length); from++){
    this.now.jsonCurrentArchive.tweets[from] = this.user.jsonCurrentArchive.tweets[from]
  }
  callback("ok");
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
    if (error && response.statusCode !== 200) {
      myresponse.status = "error";
      myresponse.msg = "Could not connect to: "+url;
    }
    if(body[0]=="{" || body[0]=="["){
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



