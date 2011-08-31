var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var helper = require('./helper.js');
var conf = require('config');

var apiListArchives = "/apiListArchives.php";
var apiGetTweets =  "/apiGetTweets.php";
var archivesListsCache = new Array();
var archivesListsCacheTime = new Array();

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
  //console.log("try to get Archive",selectedArchive, messagesSoFar);
  if(messagesSoFar != null){
    selectedArchive.limit = selectedArchive.limit - messagesSoFar;
  }
  if(selectedArchive.limit >0){
    var url = selectedArchive.ytkUrl+apiGetTweets+selectedArchive.url+'&l='+Math.min(selectedArchive.limit,conf.twapperlyzer.maxMessages);

    helper.getJSON(url,function(jsondata){
      if(jsondata.status == "ok"){
        //If the archive is bigger download the missing
        if(selectedArchive.limit>conf.twapperlyzer.maxMessages){
          //substract the allready downloaded messages from the total
          selectedArchive.limit = selectedArchive.limit -conf.twapperlyzer.maxMessages;
          
          //Get the missing Messages
          var firstPartOfArchive = new helper.ResponseBean();
          firstPartOfArchive.data = jsondata.data;
          //console.log("firstPartOfArchive",firstPartOfArchive.data.tweets.length, selectedArchive.limit);
          getMoreMsgs(selectedArchive,firstPartOfArchive,function(msgs){
            if(firstPartOfArchive.status == "ok"){
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
  }else{
    var res = new helper.ResponseBean();
    res.status = "error";
    res.msg = "No need to Update";
    callback(res);
  }
}

/**
 * Dowload recursive a archive and return the tweets in the callback
 * @param {Object} selectedArchive The selected archive of the user
 * @param {`ResponseBean`} msgs The part of the messages that are allready downloded
 * @param {`Function`} callback(`ResponseBean`) the complete set of messages or the error
 */
function getMoreMsgs(selectedArchive, firstPartOfArchive, callback){
  if(selectedArchive.limit > 0){
  
    //sending the Download progress
    //everyone.now.sendDownloadProgress(getProgessInPercent(selectedArchive.limit,selectedArchive.totalMsgCount));
    
    //Limit should decrise with each recusion step and in the last Step be smaller than conf.twapperlyzer.maxMessages 
    //this is only importend when the user did a search with specific limit.
    var urlLimit = Math.min(selectedArchive.limit,conf.twapperlyzer.maxMessages);
    
    //The max Id is needed so that the next download start where the last ended.
    selectedArchive.max_id = (_.last(firstPartOfArchive.data.tweets).id);
    firstPartOfArchive.data.tweets.pop();
    urlLimit++;
    
    var url = selectedArchive.ytkUrl+apiGetTweets+selectedArchive.url+"&l="+urlLimit+"&max_id="+selectedArchive.max_id;
    helper.getJSON(url,function(jsondata){
          if(jsondata.status == "ok"){
            firstPartOfArchive.status = jsondata.status;
            firstPartOfArchive.data.tweets = firstPartOfArchive.data.tweets.concat(jsondata.data.tweets);
            //console.log("firstPartOfArchive",firstPartOfArchive.data.tweets.length, selectedArchive.limit);
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
function getMsgs (lastID, limit,ytkUrl,id, callback){
  var url = ytkUrl+apiGetTweets+"?id="+id+"&l="+limit;
  if(lastID != 0){
    url+="&max_id="+lastID;
  }
  helper.getJSON(url, function(response){
      callback(response);
  });
};

/**
 * Load the archive list from the net and send it to the client
 *
 * @param {String} ytkUrl The url of the YourTwapperKeeper instance
 * @param {Function} callback(`ResponseBean`)
 */
function getArchiveList (ytkUrl, callback){

  var getFromNet=false;
  if(!_.isUndefined(archivesListsCacheTime[ytkUrl])){
    if((new Date).getTime() - archivesListsCacheTime[ytkUrl].getTime() > conf.twapperlyzer.archivesListsCacheTime){
      getFromNet = true;
    }else{getFromNet = false;}
  }else{getFromNet = true;}
   
   if(getFromNet){
   helper.getJSON(ytkUrl+apiListArchives,function(jsondata){
        jsondata.data = jsondata.data[0];
        callback(jsondata);
        if(jsondata.status == "ok"){
          archivesListsCache[ytkUrl] = jsondata.data;
          archivesListsCacheTime[ytkUrl] = new Date;
        }
      });
  }else{
    var responseBean = new helper.ResponseBean();
    responseBean.status = "ok";
    responseBean.data = archivesListsCache[ytkUrl];
    console.log("archivesListsCache hit for "+ytkUrl);
    callback(responseBean);
  }
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

/**
 * transform a array to a selected archive object that always include
 * - the id
 * - the ytkUrl
 * - if it is a search
 *
 * @param {Array} array
 * @return {Object} selectedArchive
 */
function createSelectedArchiveObject(params){
  var res = new Object();
  res.ytkUrl = params.ytkUrl;
  res.id = params.id;
  res.url = "?id="+params.id;
  res.isSearch = false;
  
    if(!_.isUndefined(params.startDate)){//Start Date
      var startDate = params.startDate.split("-");
      res.url += "&sy="+startDate[0]+"&sm="+startDate[1]+"&sd="+startDate[2];
      res.isSearch = true;
    }
    if(!_.isUndefined(params.endDate)){// End Date
      var endDate = params.endDate.split("-");
      res.url += "&ey="+endDate[0]+"&em="+endDate[1]+"&ed="+endDate[2];
      res.isSearch = true;
    }
    if(!_.isUndefined(params.from_user)){//From User
      res.url += "&from_user="+params.from_user;
      res.isSearch = true;
    }
    if(!_.isUndefined(params.tweet_text)){//Tweet Text
      res.url += "&tweet_text="+params.tweet_text;
      res.isSearch = true;
    }    
    if(!_.isUndefined(params.o)){//Order
      res.order=params.o;
    }    
    if(!_.isUndefined(params.lang)){//lang
      res.url += "&lang="+params.lang;
      res.isSearch = true;
    }    
    if(!_.isUndefined(params.nort)){//no RTs
      res.url += "&nort="+params.nort;
      res.isSearch = true;
    } 
    if(!_.isUndefined(params.l)){//Limit
      res.limit = params.l
      //This is tricky cause when somebody put in a limit it will 
      //be treated like non search. But the next update 
      //on that archive will fix that.
    }

    
return res;
}


//Module exports
exports.createSelectedArchiveObject = createSelectedArchiveObject;
exports.getMoreMsgs = getMoreMsgs;
exports.getMsgs = getMsgs;
exports.getArchive = getArchive;
exports.archivesListsCache = archivesListsCache;
exports.getArchiveList = getArchiveList;
