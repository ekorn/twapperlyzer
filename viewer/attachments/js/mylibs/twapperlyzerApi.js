
function testAPI(dataprovider, callback){
  
var jsonpTestAPI = $.ajax({
    url : 'http://'+dataprovider+'/testAPI?callback=?',
    dataType : "jsonp",
    timeout : 1000
});

jsonpTestAPI.success(function(data) {
      if(data.status == "ok"){
        callback(null,data);
      }else{
        callback("Dataprovider URL is not valid", null);
      }
});

jsonpTestAPI.error(function() {
  callback("Dataprovider URL is not valid", null);
});

}

function getArchiveList(ytkUrl, dataprovider, callback){
  
  var jsonpGetArchiveList = $.ajax({
    dataType: 'jsonp',
    data: "ytkUrl="+ytkUrl,
    jsonp: 'callback',
    url: 'http://'+dataprovider+'/getArchiveList?callback=?',
    timeout : 1000
  });
  
  jsonpGetArchiveList.success(function(data){ 
    if(data.status == "ok"){
      callback(null, data.data);
    }else{
      callback(data, null);
    }
  });
  
  jsonpGetArchiveList.error(function() {
    callback("ytk URL URL is not valid", null);
  });
}

function testConfig(dataprovider, ytkUrl, callback){
  testAPI(dataprovider, function(err, result){
    if(err != null){
      callback(err,null)
    }else{
      getArchiveList(ytkUrl, dataprovider, function(err, result){
        if(err != null){
          callback(err,null);
        }else{
          callback(null, result);
        }
      });
    }
  });
}

function analyseArchive (selectedArchive,dbconfig,dataprovider, callback){
  twapperlizerCall(selectedArchive,dbconfig,dataprovider,"analyseArchive", callback);
}
function updateArchive (selectedArchive,dbconfig,dataprovider, callback){
  twapperlizerCall(selectedArchive,dbconfig,dataprovider,"updateArchive", callback);
}
function createOrUpdateArchive(selectedArchive,dbconfig,dataprovider, callback){
  twapperlizerCall(selectedArchive,dbconfig,dataprovider,"createOrUpdateArchive", callback);
}

function twapperlizerCall(selectedArchive,dbconfig,dataprovider,apiFunction, callback){
  $.ajax({
    dataType: 'jsonp',
    data: selectedArchive+"&"+serializeToURLEncoding(dbconfig),
    jsonp: 'callback',
    url: 'http://'+dataprovider+'/'+apiFunction+'?callback=?',
    success: function(data) {
      if(data.status == "ok"){
        callback(null, data);
      }else{
        callback(data, null);
      }
    }
  });
}


function getMsgs(lastID,limit, ytkUrl, id,dataprovider, callback){
  $.ajax({
    dataType: 'jsonp',
    data: "ytkUrl="+ytkUrl+"&l="+limit+"&id="+id+"&lastID="+lastID,
    jsonp: 'callback',
    url: 'http://'+dataprovider+'/getMsgs?callback=?',
    success: function(data) {
      if(data.status == "ok"){
        callback(data.data.tweets);
      }else{
        callback(data, null);
      }
    }
  });
}


function serializeToURLEncoding (obj, prefix) {
  var str = [];
  for(var p in obj) {
    var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
    str.push(typeof v == "object" ? 
      serializeToURLEncoding(v, k) :
      encodeURIComponent(k) + "=" + encodeURIComponent(v));
  }
  return str.join("&");
}
