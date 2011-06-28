
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var request = require('request');

// Configuration
var port = (process.env.PORT || 3000);
var maxMessages = 1000;

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


// Routes

app.get('/', function(req, res){
/*
  res.render('index', {
    title: 'Express'
  });
  */
res.sendfile('public/index.html');
});

app.post('/ytkURLCookie', function(req, res){
  //it is in req.body since its post, if it would be a get the data would be in req.query
  res.cookie('ytkURL', req.body.ytkURL);
  res.send("ok");
  //res.send(JSON.stringify(myresponse)); 
});

app.listen(port);
console.log("Express server listening on port http://0.0.0.0:%d", app.address().port);
 

// The now.js part
/*
  apiListArchivesUrl = url+ "apiListArchives.php";
  apiGetTweetsUrl = url+ "apiGetTweets.php";
*/
var everyone = require("now").initialize(app);

everyone.now.getArchive = function(selectedArchive, callback){
  
  var myresponse = new Object();
  var data = new Object();
  data.tweets= new Array();
  var that = this;
  var amountOfMsg;
  var placeOfLimitInArray;

  // Request all Msgs
  
   amountOfMsg = this.now.jsonListArchives[selectedArchive[0].value-1].count;

  if(selectedArchive.length >10){
    //Request comes from the welcomePage Function
    if(selectedArchive[10].value == ''){
      selectedArchive[10].value = amountOfMsg;
      placeOfLimitInArray = 10;
    }else{
      amountOfMsg = selectedArchive[10].value;
    }
  }else{
    //Request comes from the ListArchive Function
    var l = new Object();
    l.name = "l";
    l.value = amountOfMsg;
    selectedArchive.push(l); 
    placeOfLimitInArray = 1;
  }
  // END
  selectedArchive.amountOfMsg = amountOfMsg;
  selectedArchive.totalMsgCount = amountOfMsg;
  selectedArchive.placeOfLimitInArray = placeOfLimitInArray;
  selectedArchive.staticURLPart = that.now.ytkURL+ "apiGetTweets.php";
  

  
  selectedArchive[selectedArchive.placeOfLimitInArray].value = maxMessages;
  var url = this.now.ytkURL+ "apiGetTweets.php"+arrayToURLString(selectedArchive);

  pGetJSON(url,function(jsondata){
    if(jsondata.status == "ok"){
      that.user.jsonCurrentArchive = jsondata.data;
      myresponse.status = "ok";
      data.archive_info = jsondata.data.archive_info
      if(jsondata.data.tweets == null){
        jsondata.data.tweets = new Array();
      }
 
      if(jsondata.data.tweets.length< maxMessages){
        data.archive_info.count = jsondata.data.tweets.length;
      }
      
      for(var i=0; i<Math.min(5,jsondata.data.tweets.length); i++){
        data.tweets[i]=jsondata.data.tweets[i];
      }
      myresponse.data = data
    }else{
      myresponse = jsondata;
    }
    callback(myresponse);

  
    if(selectedArchive.amountOfMsg>maxMessages){
      selectedArchive.amountOfMsg = selectedArchive.amountOfMsg -maxMessages;
      var max_id = new Object();
      max_id.name = "max_id";
      max_id.value = "";
      selectedArchive.push(max_id);
            
      getMoreMsgs(selectedArchive, that.user.jsonCurrentArchive.tweets,function(data){
        that.user.jsonCurrentArchive.tweets = data;
        that.now.updateDowloadSlider(100);
      });
      
    }else{
      that.now.updateDowloadSlider(100);
    }
  });
};


function getMoreMsgs(selectedArchive, msgs, callback){
  if(selectedArchive.amountOfMsg>0){
    var progessInPercent=Math.floor(100-(selectedArchive.amountOfMsg/(selectedArchive.totalMsgCount/100)));
    //console.log(selectedArchive.amountOfMsg,"/",(selectedArchive.totalMsgCount/100),"=",progessInPercent,"%");
    everyone.now.sendDownloadProgress(progessInPercent);
    selectedArchive[selectedArchive.placeOfLimitInArray].value = Math.min(selectedArchive.amountOfMsg,maxMessages); //LIMIT
    selectedArchive[selectedArchive.length-1].value = (msgs[msgs.length-1].id); //ID
    var url = selectedArchive.staticURLPart+arrayToURLString(selectedArchive);
    pGetJSON(url,function(jsondata){
          if(jsondata.status == "ok"){
            msgs = msgs.concat(jsondata.data.tweets);
            selectedArchive.amountOfMsg=selectedArchive.amountOfMsg-maxMessages;

            getMoreMsgs(selectedArchive, msgs,callback);
          }
          else{
            //fire event Error in Download
            console.log(jsondata.msg);
          }
    });
  }else{
  //Fire Event Download done
    console.log("REcusion End");
    //FIXME move to send the progress in %
    
    callback(msgs);
  }
}

everyone.now.msgAmount = function (callback){
callback(this.user.jsonCurrentArchive.tweets.length);
}

everyone.now.sendDownloadProgress = function (par){
this.now.updateDowloadSlider(par);
}


everyone.now.getMsgs = function(from, to, callback){
  for(from; from<Math.min(to,this.user.jsonCurrentArchive.tweets.length); from++){
    this.now.jsonCurrentArchive.tweets[from] = this.user.jsonCurrentArchive.tweets[from]
  }
  callback("ok");
};

var pGetJSON = function (url,callback){
  //console.log("try to reach: ", url);
  request({ uri:url }, function (error, response, body) {
    var myresponse = new Object();
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
        myresponse.msg = "JSON not valid";
      }
    }
    else{
      myresponse.status = "error";
      myresponse.msg = "JSON not valid";
    }
    console.log("JSON response: ", myresponse.status, "for: ",url);
    callback(myresponse);
  });
}
everyone.now.getJSON = pGetJSON;

function arrayToURLString(array){
  var urlString ="";
  for(var i=0; i<array.length; i++){
    urlString = [urlString, "&",array[i].name, "=", array[i].value].join("");
  }
  urlString = ["?",urlString.substring(1)].join("");
  return urlString;
}

