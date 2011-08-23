/**
 * General JQM Helper Functions:
 *
 */

/**
 * Fill a form select element with the data.
 *
 * @param {jquery Object} selectElement The html select element as Jquery Object
 * @param {Array} data A array of Strings.
 */
function fillSelect(selectElement, data){
  selectElement.empty();
  selectElement.append('<option value=""></option>');
  _.each(data, function (element){
    selectElement.append("<option>"+element+"</option>");
  });
  selectElement.selectmenu('refresh');
}

/**
 * The standard error message  
 *
 * @param {String} errorMessage
 * @param {Number} stay The time the popup should be shown.
 */
function popErrorMessage(errorMessage,stay){
  popMessage(errorMessage, stay, "ui-body-e");
}

/**
 * The standard message  
 *
 * @param {String} simpleMessage
 * @param {Number} stay The time the popup should be shown.
 */
function popSimpleMessage(simpleMessage,stay) {
  popMessage(simpleMessage, stay, "ui-body-b");
}

/**
 * The standard message  
 *
 * @param {String} myMessage
 * @param {Number} stay The time the popup should be shown.
 * @param {String} theme The JQM theme of the popup
 */
function popMessage(myMessage,stay, theme) {
  $("<div class='ui-loader ui-overlay-shadow "+ theme +" ui-corner-all'><h1>" + myMessage + "</h1></div>")
  .css({
    display: "block",
    opacity: 0.96,
    top: window.pageYOffset+100
  })
  .appendTo("body").delay(stay)
  .fadeOut(800, function(){
      $(this).remove();
  });
}



/**
 * General Non-JQM Helper Functions:
 *
 */


  /**
 * Serach in a text for
 * - #
 * - @
 * - http
 * and make a html link for them.
 *
 * @param {String} text A Text without html Links
 * @return {String} text A Text with html Links 
 */
function getHTMLLinksForText(text){
  var urls = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  var usernames = /(^|\s)@(\w+)/g;
  var hashtags = /(^|\s)#(\w+)/g;

  //URLs have to be replaced first other wise it will replace more than it should
  var text = text.replace(urls,         "<a href='$1' target=\"_blank\">$1</a>");
  var text = text.replace(usernames, "$1@<a href='http://www.twitter.com/$2' target=\"_blank\">$2</a>");
  var text = text.replace(hashtags , "$1#<a href='http://search.twitter.com/search?q=%23$2' target=\"_blank\" >$2</a>");
  return text;
}
 
 
 /**
 * format a number for better readability.
 *
 * @param {Number} num
 * @param {String} prefix Optional 
 * @return {String} formatted number
 */
function formatNumber(num){
   num += '';
   var splitStr = num.split('.');
   var splitLeft = splitStr[0];
   var splitRight = splitStr.length > 1 ? '.' + splitStr[1] : '';
   var regx = /(\d+)(\d{3})/;
   while (regx.test(splitLeft)) {
      splitLeft = splitLeft.replace(regx, '$1' + ',' + '$2');
   }
   return splitLeft + splitRight;
}

 /**
 * remove all chars except numbers.
 *
 * @param {String} num
 * return {Number} num
 */
function unformatNumber(num) {
   return num.replace(/([^0-9\.\-])/g,'')*1;
}


 /**
 * get a GET Query String and create a object with parameter as fields. 
 * 
 * 
 * @param {String} qs Like ?id=1&foo=bar
 * @return {Object} params
 */
function getQueryParams(qs) {
  qs = qs.split("+").join(" ");

  var params = {};
  var tokens,
  re = /[?&]?([^=]+)=([^&]*)/g;

  while (tokens = re.exec(qs)) {
    params[decodeURIComponent(tokens[1])]
    = decodeURIComponent(tokens[2]);
  }

  return params;
}

 /**
 * A simple check if a String is a url
 * 
 * 
 * @param {String} str
 * @return {Boolean}
 */
function isUrl(str) {
var v = new RegExp();
v.compile("^[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+$");
if (!v.test(str)) {
return false;
}
return true;
}

function copyToClipboard (text) {
  window.prompt ("Copy to clipboard: ", text);
}
