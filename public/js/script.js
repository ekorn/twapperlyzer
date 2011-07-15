var $_GET = getQueryParams(document.location.search);
var map;
var options;
var currentArchive;
var archiveList;

$(window).load(function(){ $(document).ready(function() {
  
/**
 * Loading and setting options:
 *
 */
  getYtkURL();
  now.ready(handleNowReady);
  now.core.on('disconnect', function(){
    console.log("Now is't ready");
  });

/**
 * Event binding for the JQM Pages
 *
 */
  //Welcome Page
  $( '#chooseArchiveForm :submit' ).click(chooseArchiveFormHandler); 

  // Options Page
  $( '#ytkURLForm :submit' ).click(optionsFormHandler); 
  
  //list Archives Page 
  $('#archivesList').delegate('a', 'click', selectedArchiveByList);
  $('#listArchivesPage').live('pagebeforeshow',insertArchiveList);
  
  // Show Archive Page
  $('#showArchivePage').live('pagebeforeshow',handleShowArchivePage);
  //FIXME actually I want to bind it with showMsgsPage but it won't work
  $(document).bind("scrollstop", loadMsgAtPageEnd);
  now.updateDowloadSlider = updateTheDownloadSlider;
  $('#archiveWidgetsList').delegate('a', 'click', archiveWidgetsListHandler);
  
  $("#debugButton").click(function(){
    now.getGeoTagsMsgsFromCurrentArchive(function (data){
      console.log("DEBUG",data);
    });
  });
    
  // Show Msg Page
 
  $('#showMsgsPage').live('pagebeforeshow',showMessagePageHandler);
  $("#moreMsgsButton").click(moreMsgsButtonHandler);
  //Copy the coordinates from the link and prepare the map
  $('#msgList').delegate('a', 'click', exportMessageEntry);

//UNSORTED

    
  now.clientTest = function(par) {
    console.log("nerv",par);
  };
//===============END OF DOC READY===============
});});


/**
 * Loading and setting options
 *
 */
function getYtkURL(){
  if($.cookie('ytkURL') != null){
   options = new twapperlizerClientOptions($.cookie('ytkURL'));
  }
  
  if(typeof $_GET.ytkURL != 'undefined'){
    options = new twapperlizerClientOptions($_GET.ytkURL);
  }

  if(options == null){
    noVaildYtrkURL();
  }else{
    $('#ytkURLField').val($.cookie('ytkURL'));
  }
}

/**
 * The First time when now is ready the archive list is downloaded
 * and saved in the shared space. Afterward the Button will be updated
 * and if a Id is present in the url the corresponding Archive is loaded.  
 *
 */
function handleNowReady() {
  if(now.wasReadyBefore == null && options != null){

    now.wasReadyBefore = true;
    if(options != null){
      now.getArchiveList(options.ytkURL,function(jsondata){
        if(jsondata.status == "ok"){
          archiveList = jsondata.data[0];
          $('#listHashtagsButton .ui-btn-text').text("List Hashtag Archives ("+archiveList.length+")");
          if(typeof $_GET.id != 'undefined'){
            id = new Object();
            id.value = $_GET.id;
            options.selectedArchive = createSelectedArchiveObject(new Array(id));
            $.mobile.changePage("#showArchivePage");
          }
        }else{
          noVaildYtrkURL();
        }
      });    
    }

  }else{
    console.log("Now is reconnected");
  }
  console.log("Now is ready");
}

/**
 * Welcome Page:
 *
 */
 
 /**
 * Get the variables from the chooseArchiveForm and 
 * - check if a ytkURl is present 
 * - find the ID to a given hashtag
 * - create a selectedArchive object
 * 
 * @param {Function} event
 */
function chooseArchiveFormHandler(event){
  event.preventDefault();
  var chooseArchiveFormVars = $('#chooseArchiveForm').serializeArray();
  if(options == null){
    noVaildYtrkURL();
  }else{
   chooseArchiveFormVars[0].value = validateHashtagField(chooseArchiveFormVars[0].value, archiveList);
    if(chooseArchiveFormVars[0].value == "error"){
      popErrorMessage("Can't analyse this archive",500);
    }else{
      options.selectedArchive = createSelectedArchiveObject(chooseArchiveFormVars);
      $.mobile.changePage("#showArchivePage");
    }
  }
}

 /**
 * check if the user input is a valid archive number 
 * find the id to a hastag.
 * 
 * @param {String} value The user input
 * @param {Array} archiveList The list of available archives.
 * @return {Number|String} the id or the string "error" 
 */
function validateHashtagField(value, archiveList){
  if(value == "" ){
    return "error";
  }
  if(isNaN(value)){
    return getYTKID(value, archiveList);
  }
  //console.log(value, archiveList.length)
  if(value > 0 && value <= archiveList.length){
    return value;
  }else{
    return "error";
  }
}

 /**
 * find the id to a string(hashtag)
 * 
 * @param {String} value The user input
 * @param {Array} archiveList The list of available archives.
 * @return {Number|String} the id or the string "error" 
 */
function getYTKID(value, archiveList){
  for (var i=0; i<archiveList.length; i++){
    if(archiveList[i].keyword==value){
      return archiveList[i].id;
    }
  }
  return "error";
}

/**
 * Options Page:
 *
 */
 
 /**
 * Get the variables from the optionsForm and 
 * - save the yktURL with a trailing slash
 * - test the URL by downloading the Archive List
 * 
 * @param {Function} event
 */
function optionsFormHandler(event){
  event.preventDefault();
  
  var ytkURL = $('#ytkURLField').val();
  if (ytkURL!=null && ytkURL!=""){
    if(ytkURL.lastIndexOf("/") == (ytkURL.length-1)) {
      ytkURL=ytkURL.slice(0,ytkURL.length-1);
      $('#ytkURLField').val(ytkURL)
    }
  }
  if(!isUrl(ytkURL)){
    popErrorMessage(" Error: Check the yourTwapperKepper URL",1500);
  }else
  //if the download is ok ask the server to set a cookie
  now.getArchiveList(ytkURL,function(jsondata){
    if(jsondata.status == "ok"){
      options = new twapperlizerClientOptions(ytkURL);
      archiveList = jsondata.data[0];
      //Update Button text
       $('#listHashtagsButton .ui-btn-text').text("List Hashtag Archives ("+archiveList.length+")");
       //ask the Server to set the cookie, doing this serverside is 
       //nessary cause chrome dont line local cookies
      $.post('/ytkURLCookie',{ytkURL: ytkURL}, function(data) {
        $.mobile.changePage("#welcomePage",{transition: "slide",reverse: true});
      });
        //Client side Cookies don't work in Chrome
        //$.cookie('ytkURL',ytkURL);
    }else{
    popErrorMessage("Error: "+jsondata.msg+"<br>Check the yourTwapperKepper URL",2500);
    }
  });
}

/**
 * List Archives Page:
 *
 */
 
 /**
 * Empty the #archivesList and fill it with the content of 
 * archiveList 
 *
 */
function insertArchiveList(){
  var data = archiveList;
  var archivesList = $('#archivesList');
  archivesList.empty();
  for(var i=0; i<data.length; i++){
    var entry = data[i];
    var entryHtml = ['<li><a href="#showArchivePage" ytkaid="'+entry.id+'" ><h3>', entry.keyword, '</h3><p>', entry.description,'</p></a><span class="ui-li-count">'+formatNumber(entry.count)+'</span></li>'].join("");
    archivesList.append(entryHtml);
  }
  archivesList.listview('refresh');
}


 /**
 * Get the archive id from the li and create the selectedArchive object.
 * This function is called before the handleShowArchivePage function. 
 *
 */
function selectedArchiveByList(event) {  
  id = new Object();
  id.value = $(this).attr("ytkaid");
  options.selectedArchive = createSelectedArchiveObject(new Array(id));
}

/**
 * Show Archive Page:
 *
 */
 
 /**
 * Get a archive from the server ask for the one in options.selectedArchive 
 * - don't ask for the archive it is already present, but 
 *   check if it is this time a search
 * - transform the slider form element into a progress bar.
 * - save the archive in the now space
 * - check if the result has no messages included
 */
function handleShowArchivePage(){
  // First run result in undefied != some-id, so always true.
  if(options.lastselectedArchive != options.selectedArchive){
    setArchiveInfo(archiveList[options.selectedArchive.id-1], $('#archive_info'));
    updateMsgTotal("-");
    $('#downloadSliderBox').show();
    $('#downloadSlider').val(0).slider("refresh");
    $('#downloadSliderBox').find('input[type="number"]').hide();
    now.getArchive(options.selectedArchive,function(jsondata){
      if(jsondata.status == "ok"){
        //console.log("ArchiveInfo",jsondata.data);
        currentArchive = jsondata.data;
        updateMsgTotal(currentArchive.messagesSoFar);
        $('#geoMarkerCount').text(formatNumber(currentArchive.geoInfo.length));
        if(currentArchive.messagesSoFar == 0){
          popErrorMessage("Selection has no Messages",1500);
          $.mobile.changePage("#welcomePage");
        }
      }else{
        popErrorMessage("Error: "+jsondata.msg+" Can't get Archive",2500);
        //$.mobile.changePage("#ErrorPage");
      }
    });
    options.lastselectedArchive = options.selectedArchive;
  }else{
    //console.log("client cache say",options.lastselectedArchive,options.selectedArchive);
    }
}

/**
 * Set the archive info 
 * @param {Object} data The archive_info from a ytk archive
 * @param {Object} parent The html tag where the archive_info should be appended
 */
function setArchiveInfo(data, parent){
parent.empty();
var create_time = new Date(data.create_time*1000);//It is in Epoch time, so sec not milisec
parent.append("<center><h2>"+data.keyword+"</h2><p>"+data.description+"</p><p>"+create_time+"</p><p>total number of tweets = <strong id=\"currentArchiveCount\">"+formatNumber(data.count)+"</strong></p></center>");
$('#browseMessagesCount').text(formatNumber(data.count));
}

/**
 * Set the download slider to a new position and fade it out if the 
 * download is done. Also update the final amount of downloaded messages.
 * @param {Number} progress A Number between 0-100
 * @param {Number} msgTotal The final amount of downloaded messages
 */
function updateTheDownloadSlider(progress) {
    $('#downloadSlider').val(progress).slider("refresh");
    if(progress == 100){
      $('#downloadSliderBox').fadeOut(800);
    }
}

/**
 * Set the right amount of messages to all different places.
 *
 */
function updateMsgTotal(msgTotal){
  $('#browseMessagesCount').text(formatNumber(msgTotal));
  $('#currentArchiveCount').text(formatNumber(msgTotal));
}

function archiveWidgetsListHandler(event){
  event.preventDefault();
  event.stopPropagation();
  var target = $(this).attr("href");
  
  if(target == "#mapPage"){
    setUpGeoMarkerForArchive();
  }else if(target == "#showMsgsPage")
    $.mobile.changePage(target);
  }

/**
 * Clear the map,
 * copy the geoMarker from the Server side and put them on the map
 *
 */
function setUpGeoMarkerForArchive(){
  now.getGeoMarker(function (data){
      setUpMap();
      map.setView(new L.LatLng(51.719444, 8.757222,true), 2);
      var colorMarker = L.Icon.extend({
        iconUrl: '',
        shadowUrl: 'css/images/marker-shadow.png',
        iconSize: new L.Point(25, 41),
        shadowSize: new L.Point(41, 41),
        iconAnchor: new L.Point(22, 94),
        popupAnchor: new L.Point(-3, -76)
      });
      var redMarker = new colorMarker('css/images/marker-red.png');
      for (var i = 0 ; i < data.length; i++) {
        var geoM = data[i];
        // create a marker in the given location and add it to the map
        var marker;
        var text ="";
        //One Message at one place, from one person;
        if(geoM.users.length == 1 && geoM.users[0].tweets.length == 1){
          marker = new L.Marker(new L.LatLng(geoM.lat, geoM.long,true));
          text +="<a href=\"http://twitter.com/#!/"+geoM.users[0].name+"/status/"+geoM.users[0].tweets[0].id+"\" target=\"_blank\">"+geoM.users[0].name+"</a>";
          //console.log("Simple Marker please",_.values(geoM.messages));
        }else if(geoM.users.length == 1){
          marker = new L.Marker(new L.LatLng(geoM.lat, geoM.long,true));
          text +=" <a href=\"http://twitter.com/#!/"+geoM.users[0].name+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[0].tweets.length,9)+"em;\">"+geoM.users[0].name+"</a> ";
          //console.log("Simple Marker please",_.values(geoM.messages));
        }else{
          marker = new L.Marker(new L.LatLng(geoM.lat, geoM.long,true),{icon:redMarker});
          for (var k = 0; k < geoM.users.length; k++){
            text +=" <a href=\"http://twitter.com/#!/"+geoM.users[k].name+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[k].tweets.length,9)+"em;\">"+geoM.users[k].name+"</a> ";
          }
        }
        marker.bindPopup(text,{autoPan:false});  
        map.addLayer(marker);
        //console.log("marker",marker);
      }
      $.mobile.changePage("#mapPage");
    });
}
/**
 * Show Messages Page:
 *
 */
 
  /**
 * Empty the list and fill it with the first messages
 * 
 */
function showMessagePageHandler(){
  var msgList = $('#msgList');
  msgList.empty();
  options.currentMsg=0;
  loadMessagesFromServer();
}

 /**
 * adding messages to the list.
 * 
 */
function addMsgs(data){
  var msgList = $('#msgList');
  for(options.currentMsg; options.currentMsg<data.length; options.currentMsg++){
    var entry = data[options.currentMsg];
    entry.msgid = options.currentMsg;
    msgList.append(getMsgEntryHTML(entry));
  }
  
  msgList.listview('refresh');
}

/**
 * create a string with a list entry (html code)  for a message object
 *
 */
function getMsgEntryHTML(entry){
  var entryHtml = ["<li ><img src=", entry.profile_image_url.replace("normal","bigger"), "> <h3>",entry.from_user,"</h3><p><strong>",getHTMLLinksForText(entry.text),"</strong></p><p>",entry.created_at," Tweet id <a href=\"http://twitter.com/#!/",entry.from_user,"/status/",entry.id,"\" target=\"_blank\">",entry.id,"</a></p>"].join("");

  if(entry.geo_coordinates_0 != 0 ){
    entryHtml = [entryHtml, '<p><a href="#mapPage" msgid="',entry.msgid,'">geo info:',entry.geo_type," - lat = ", entry.geo_coordinates_0," - long = ",entry.geo_coordinates_1,"</p>"].join("");
  }
  entryHtml = [entryHtml,"</li>"].join("");
  return entryHtml;
}


 /**
 * Load new messages if the user scrolled down to the last 20% of the Page
 * by expanding the currentArchive.tweets on the server side
 * 
 */
function loadMsgAtPageEnd() {
  // From https://github.com/paulirish/infinite-scroll
  pixelsFromWindowBottomToBottom = 0 + $(document).height() - ($(window).scrollTop()) - $(window).height();

  pixelsFromWindowBottomToBottomInPercent=Math.round(pixelsFromWindowBottomToBottom/($(document).height()/100));
  
    if($.mobile.activePage.attr("id")=="showMsgsPage"){
      if(pixelsFromWindowBottomToBottomInPercent<20){
        loadMessagesFromServer();
      }
      //console.log(pixelsFromWindowBottomToBottomInPercent,"%");
    }
}

 /**
 * add messages to the current list by expanding the 
 * currentArchive.tweets on the server side
 * 
 */
function moreMsgsButtonHandler(){
    loadMessagesFromServer();
  }

function loadMessagesFromServer(){
  var lastID=0;
  if(currentArchive.tweets.length != 0 ){
    
    lastID = currentArchive.tweets[currentArchive.tweets.length-1].id;
  }
  if(options.currentMsg <= currentArchive.messagesSoFar){
    now.getMsgs(lastID,options.addMsgVal, function(response){
      response.shift(); 
      currentArchive.tweets = currentArchive.tweets.concat(response);
      addMsgs(currentArchive.tweets);
    });
  }

}

/**
 * Check if link was a Link to a map and if so 
 * - clear the map
 * - set up the Map with this the message object 
 *
 */
function exportMessageEntry(event) {  
  if ($(this).attr("msgid") != null){
    // set the map view to a given center and zoom and add the CloudMade layer
    var entry = currentArchive.tweets[$(this).attr("msgid")];
    setUpMap();
    var msgLocation = new L.LatLng(entry.geo_coordinates_0, entry.geo_coordinates_1,true);
    map.setView(msgLocation, 13);
    map.addLayer(getAvantarMarker(msgLocation, getHTMLLinksForText(entry.text), entry.profile_image_url));
  }
}

/**
 * Map Page:
 *
 */
 
/**
 * Set up the map to present a single message. There for it generate 
 * a marker with the avatar icon of the user and the linked text.
 *
 * @param {Object} entry The message Object from a archive of a ytk instance
 */
function setUpMap(entry){
  var mapContainer = $('#mapContainer');
  
  //Adjust the map container to the maximum
  var usedHeight = 0;
        
  mapContainer.siblings().each(function() {
    usedHeight += $(this).outerHeight();
  });
        
  mapContainer.height(mapContainer.parent().height() - usedHeight);
  
  //clear the old map data
  if (map) {
      $('#mapContainer').html('');
    }
    
  // initialize the map on the "map" div
  map = new L.Map('mapContainer');
  
  // create a CloudMade tile layer
  var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/d692a017c2bc4e45a59d57699d0e0ea7/997/256/{z}/{x}/{y}.png',
      cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
      cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttribution});
      
  // add the CloudMade layer to the map
  map.addLayer(cloudmade);
}

function getAvantarMarker(msgLocation, text, imageUrl){
  /**
 * The Icons for the map in the avantar size.
 */
  var AvantarIcon = L.Icon.extend({
    iconUrl: '',
    shadowUrl: '',
    iconSize: new L.Point(45, 45),
    shadowSize: new L.Point(68, 95),
    iconAnchor: new L.Point(22, 94),
    popupAnchor: new L.Point(-3, -76)
});
  var icon = new AvantarIcon(imageUrl);
  // create a marker in the given location and add it to the map
  var marker = new L.Marker(msgLocation, {icon: icon});
  // attach a given HTML content to the marker and immediately open it
  marker.bindPopup(text,{autoPan:false});  
 // marker = new L.Marker(msgLocation);
 
 return marker;
}

/**
 * General JQM Helper Functions:
 *
 */
 
/**
 * redirect to the options page and show a error popup. 
 *
 */
function noVaildYtrkURL(){
  popErrorMessage("You have to enter a vaild YourTwapperKeeper instance.",2000);
  $.mobile.changePage("#optionsPage");
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
 * transform a array to a selected archive object that always include
 * - the id
 * - the ytkURL
 * - if it is a search
 *
 * @param {Array} array
 * @return {Object} selectedArchive
 */
function createSelectedArchiveObject(array){
  var res = new Object();
  res.ytkURL = options.ytkURL;
  res.url = "?id="+array[0].value;
  res.id = array[0].value;
  res.isSearch = false;
  
  if(array.length >7){
    if(array[1].value != ""){//Start Date
      var startDate = array[1].value.split("-");
      res.url = res.url +"&sy="+startDate[0]+"&sm="+startDate[1]+"&sd="+startDate[2];
      res.isSearch = true;
    }
    if(array[2].value != ""){// End Date
      var endDate = array[2].value.split("-");
      res.url = res.url +"&ey="+endDate[0]+"&em="+endDate[1]+"&ed="+endDate[2];
      res.isSearch = true;
    }
    if(array[3].value != ""){//From User
      res.url = res.url +"&"+array[3].name+"="+array[3].value;
      res.isSearch = true;
    }
    if(array[4].value != ""){//Tweet Text
      res.url = res.url +"&"+array[4].name+"="+array[4].value;
      res.isSearch = true;
    }    
    if(array[5].value != "d"){//Order
      res.order=array[5].value;
    }    
   
    if(array[6].value != ""){//Limit
      res.limit = array[6].value;
      res.isSearch = true;
    }else{
      res.limit = archiveList[res.id-1].count;
    }
    if(array[7].value != ""){//lang
      res.url = res.url +"&"+array[7].name+"="+array[7].value;
      res.isSearch = true;
    }    
    if(array[8] != null){ // no RTs
      res.url = res.url +"&"+array[8].name+"="+array[8].value;
      res.isSearch = true;
    } 
  }else{
    res.limit = archiveList[res.id-1].count;
  }
  return res;
}

 /**
 * format a number for better readability.
 *
 * @param {Number} num
 * @param {String} prefix Optional 
 * @return {String} formatted number
 */
function formatNumber(num,prefix){
   prefix = prefix || '';
   num += '';
   var splitStr = num.split('.');
   var splitLeft = splitStr[0];
   var splitRight = splitStr.length > 1 ? '.' + splitStr[1] : '';
   var regx = /(\d+)(\d{3})/;
   while (regx.test(splitLeft)) {
      splitLeft = splitLeft.replace(regx, '$1' + ',' + '$2');
   }
   return prefix + splitLeft + splitRight;
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
/**
 * Own Objects 
 */

/**
 * Holding a bunch of variables so that the global space is not to polluted 
 */
function twapperlizerClientOptions(ytkURL){
  this.ytkURL = ytkURL;
  this.currentMsg=0;
  this.addMsgVal=5;
  this.selectedArchive;
  this.lastselectedArchive;
}

