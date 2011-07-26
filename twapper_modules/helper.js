var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var conf = require('config');
var request = require('request');

/**
 *  A simple Object to transport the status of action
 */
function ResponseBean(){
  this.status;
  this.data;
  this.msg;
}

/**
 * Get JSON Data over the net
 *
 * @param {String} url
 * @param {Function} callback(`ResponseBean`)
 */
var getJSON = function (url,callback){
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


//Module exports
exports.getJSON = getJSON;
exports.ResponseBean = ResponseBean;
