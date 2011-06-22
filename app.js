
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var request = require('request');

// Configuration
var port = (process.env.PORT || 3000);

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

everyone.now.getArchive = function(archiveId, callback){
  var myresponse = new Object();
  var data = new Object();
  data.tweets= new Array();
  var that = this;
  var url = this.now.ytkURL+ "apiGetTweets.php?id="+archiveId+"&l="+Math.min(this.now.jsonListArchives[archiveId-1].count,10000);
  
  pGetJSON(url,function(jsondata){
    if(jsondata.status == "ok"){
      that.user.jsonCurrentArchive = jsondata.data;
      myresponse.status = "ok";
      data.archive_info = jsondata.data.archive_info
      for(var i=0; i<5; i++){
        data.tweets[i]=jsondata.data.tweets[i];
      }
      myresponse.data = data
      //myresponse.data.tweets = [];
    }else{
      myresponse = jsondata;
    }
    callback(myresponse);
  });
};

everyone.now.getMsgs = function(from, to, callback){
  for(from; from<Math.min(to,this.user.jsonCurrentArchive.tweets.length); from++){
    this.now.jsonCurrentArchive.tweets[from] = this.user.jsonCurrentArchive.tweets[from]
  }
  callback("ok");
};

var pGetJSON = function (url,callback){
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


