var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var helper = require('./helper.js');
var conf = require('config');

var apiListArchives = "/apiListArchives.php";
var apiGetTweets =  "/apiGetTweets.php";
var archivesListsCache = new Array();

/**
 * Load the selectedArchive from the net, after getting the archive info and the 
 * first couple of messages it continue and download the remaing. 
 *
 * @param {Object} selectedArchive The selected archive of the user
 * @param {Number} messagesSoFar Is 0 if it is a fresh download or the 
 *                 count of the previously downloaded messages.
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function getArchive(selectedArchive, messagesSoFar, callback){
  
if(messagesSoFar != null){
  selectedArchive.limit = selectedArchive.limit - messagesSoFar;
}

  var url = selectedArchive.ytkURL+apiGetTweets+selectedArchive.url+'&l='+Math.min(selectedArchive.limit,conf.twapperlyzer.maxMessages);
  //Get the First results to show the user something
  helper.getJSON(url,function(jsondata){
    if(jsondata.status == "ok"){
      //If the archive is bigger download the missing
      if(selectedArchive.limit>conf.twapperlyzer.maxMessages){
        //substract the allready downloaded messages from the total
        selectedArchive.limit = selectedArchive.limit -conf.twapperlyzer.maxMessages;
        
        //Get the missing Messages
        var firstPartOfArchive = new helper.ResponseBean();
        firstPartOfArchive.data = jsondata.data;
        getMoreMsgs(selectedArchive,firstPartOfArchive,function(msgs){
          if(firstPartOfArchive.status=="ok"){
            callback(firstPartOfArchive);
          }else{
            gettingArchiveFaild(firstPartOfArchive, callback);
          }
        });
      
      }else{
         callback(jsondata);
      }
    }else{
      gettingArchiveFaild(jsondata, callback);
    }
  });
}

/**
 * Dowload recursive a archive and return the tweets in the callback
 * @param {Object} selectedArchive The selected archive of the user
 * @param {`ResponseBean`} msgs The part of the messages that are allready downloded
 * @param {`Function`} callback(`ResponseBean`) the complete set of messages or the error
 */
function getMoreMsgs(selectedArchive, firstPartOfArchive, callback){
  if(selectedArchive.limit>0){
  
    //sending the Download progress
    //everyone.now.sendDownloadProgress(getProgessInPercent(selectedArchive.limit,selectedArchive.totalMsgCount));
    
    //Limit should decrise with each recusion step and in the last Step be smaller than conf.twapperlyzer.maxMessages 
    //this is only importend when the user did a search with specific limit.
    var urlLimit = Math.min(selectedArchive.limit,conf.twapperlyzer.maxMessages);
    
    //The max Id is needed so that the next download start where the last ended.
    selectedArchive.max_id = (_.last(firstPartOfArchive.data.tweets).id);
    firstPartOfArchive.data.tweets.pop();
    urlLimit++;
    
    var url = selectedArchive.ytkURL+apiGetTweets+selectedArchive.url+"&l="+urlLimit+"&max_id="+selectedArchive.max_id;
    helper.getJSON(url,function(jsondata){
          if(jsondata.status == "ok"){
            firstPartOfArchive.status = jsondata.status;
            firstPartOfArchive.data.tweets = firstPartOfArchive.data.tweets.concat(jsondata.data.tweets);
            //Decrising the amount of messages that still need to get downloaded 
            selectedArchive.limit=selectedArchive.limit-conf.twapperlyzer.maxMessages;
            getMoreMsgs(selectedArchive, firstPartOfArchive,callback);
          }
          else{
          callback(jsondata);
          }
    });
  }else{
    //everyone.now.sendDownloadProgress(100);
    firstPartOfArchive.data.archive_info.count=firstPartOfArchive.data.tweets.length;
    callback(firstPartOfArchive);
  }
}




/**
 * Dowload messages from ytk instace to the and return them via callback
 *
 * @param {Number} lastID
 * @param {Number} limit
 * @param {String} url;
 * @param {Function} callback(`Array`)
 */
function getMsgs (lastID, limit,ytkURL,id, callback){
  var url = ytkURL+apiGetTweets+"?id="+id+"&l="+limit;
  if(lastID != 0){
    url+="&max_id="+lastID;
  }
  helper.getJSON(url, function(response){
    if(response.status == "ok"){
      callback(response.data.tweets);
    }else{
      console.log("Error while loading messages ",response);
    }
  });
};

/**
 * Load the archive list from the net and send it to the client
 *
 * @param {String} ytkURL The url of the YourTwapperKeeper instance
 * @param {Function} callback(`ResponseBean`)
 */
function getArchiveList (ytkURL, callback){
    helper.getJSON(ytkURL+apiListArchives,function(jsondata){
      callback(jsondata);
      if(jsondata.status == "ok"){
        archivesListsCache[ytkURL] = jsondata.data[0];
      }
    });
};
 


/**
 * Is called when getting the Archive faild and handle the error.
 *
 * @param {`ResponseBean`} err
 * @param {Function} callback(`ResponseBean`) Comes from the getArchive function.
 */
function gettingArchiveFaild(err, callback){
  console.log('gettingArchiveFaild', err.status);
}


//Module exports
exports.getMoreMsgs = getMoreMsgs;
exports.getMsgs = getMsgs;
exports.getArchive = getArchive;
exports.archivesListsCache = archivesListsCache;
exports.getArchiveList = getArchiveList;
