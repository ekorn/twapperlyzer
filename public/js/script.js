var apiListArchivesUrl = "";
var apiGetTweetsUrl = "";
var maxMsg=10;
var currentMsg=0;
var addMsgVal=5;
var isNowReady= false;
var map;

$(window).load(function(){ $(document).ready(function() {
//$('#thursdayMensa').trigger('expand');
  //Bindings and Settings
  var selectedArchive;
  var lastselectedArchive;
  var ytkURL = $.cookie('ytkURL');

if(ytkURL== null || ytkURL==""){
    noVaildYtrkURL();
  }else{
    setUpApiUrls(ytkURL);
  }
  
  
now.ready(function(){
  if(isNowReady == false && ytkURL != null){
    now.ytkURL = ytkURL;
    isNowReady = true;  
    now.getJSON(apiListArchivesUrl,function(jsondata){
      console.log(jsondata);
      if(jsondata.status == "ok"){
        now.jsonListArchives = jsondata.data[0];
        $('#listHashtagsButton').parent().find('.ui-btn-text').text("List Hashtag Archives ("+now.jsonListArchives.length+")");
      }else{
        popErrorMessage("Error: "+jsondata.msg+"Check the yourTwapperKepper URL",2500);
      }
    });
  }else{
    popErrorMessage("Error: Check the yourTwapperKepper URL",2500);
  }
  console.log("Now is ready");
} );

now.core.on('disconnect', function(){
  console.log("Now is't ready");
});

  $('#optionsPage').live('pagebeforeshow',function(){
    if(ytkURL!= null && ytkURL!=""){
      $('#ytkURLField').val(ytkURL);
    }
  });
  
  //FIXME actually I want to bind it with showMsgsPage but i won't work
  $(document).bind("scrollstop", function() {
  // From https://github.com/paulirish/infinite-scroll
  pixelsFromWindowBottomToBottom = 0 + $(document).height() - ($(window).scrollTop()) - $(window).height();

  pixelsFromWindowBottomToBottomInPercent=Math.round(pixelsFromWindowBottomToBottom/($(document).height()/100));
  
    if($.mobile.activePage.attr("id")=="showMsgsPage"){
      if(pixelsFromWindowBottomToBottomInPercent<20){
        now.getMsgs(currentMsg,currentMsg+5, function(data){
          addMsgs(now.jsonCurrentArchive.tweets);
        });
      }
      //console.log(pixelsFromWindowBottomToBottomInPercent,"%");
    }
  });
    
    //Welcome Page
    $( '#hashtagForm :submit' ).click( function(event) {
      event.preventDefault();
      var hashtagFormVars = $('#hashtagForm').serializeArray();
      if(ytkURL==null || ytkURL==""){
        noVaildYtrkURL();
      }else{
       hashtagFormVars[0].value = validateHashtagField(hashtagFormVars[0].value, now.jsonListArchives);
        if(hashtagFormVars[0].value == "error"){
          popErrorMessage("Can't analyse this archive",500);
        }else{
          selectedArchive = createSelectetArchiveObject(hashtagFormVars);
          $.mobile.changePage("#showArchivePage");
        }
      }
  }); 
  
  $("#listHashtagsButton").click(function(){

  if(ytkURL==null || ytkURL==""){
      noVaildYtrkURL();
    }else{
      $.mobile.changePage("#listArchivesPage");
      
    }
  });

    // Options Page
  $( '#ytkURLForm :submit' ).click( function(event) {
    event.preventDefault();
    ytkURL = $('#ytkURLField').val();
  if (ytkURL!=null && ytkURL!=""){
    if(ytkURL.lastIndexOf("/") != (ytkURL.length-1))
      ytkURL=ytkURL+"/";
    }
    setUpApiUrls(ytkURL);
    //Client side Cookies don't work in Chrome
    //$.cookie('ytkURL',ytkURL);
    now.getJSON(apiListArchivesUrl,function(jsondata){
      console.log(jsondata);
      if(jsondata.status == "ok"){
        now.jsonListArchives = jsondata.data[0];
        $('#listHashtagsButton').parent().find('.ui-btn-text').text("List Hashtag Archives ("+now.jsonListArchives.length+")");
        $.post('/ytkURLCookie',{ytkURL: ytkURL}, function(data) {
          $.mobile.changePage("#welcomePage",{transition: "slide",reverse: true});
          now.ytkURL = ytkURL;
        });
      }else{
        popErrorMessage("Error: "+jsondata.msg+"Check the yourTwapperKepper URL",2500);
      }
    });
  }); 
  
  //list Archives Page 
  $('#listArchivesPage').live('pagebeforeshow',function(){
    insertArchiveList(now.jsonListArchives);
  });

  $('#archivesList').delegate('a', 'click', function(event) {  
    id = new Object();
    id.value = $(this).attr("ytkaid");
    selectedArchive = createSelectetArchiveObject(new Array(id));
  });

  // Show Archive Page
  $('#showArchivePage').live('pagebeforeshow',function(){

    // First run result in undefied != some-id, so always true.
    if(lastselectedArchive != selectedArchive){
      $('#downloadSliderBox').show();
      $('#downloadSlider').val(0).slider("refresh");
      $('#downloadSliderBox').find('input[type="number"]').hide();
      now.getArchive(selectedArchive,function(jsondata){
        console.log("getArchive", lastselectedArchive, selectedArchive, jsondata);
        if(jsondata.status == "ok"){
          now.jsonCurrentArchive = jsondata.data;
          setArchiveInfo(now.jsonCurrentArchive.archive_info, $('#archive_info'));
          if(now.jsonCurrentArchive.archive_info.count == 0){
            popErrorMessage("Selection has no Messages",1500);
            $.mobile.changePage("#welcomePage");
          }
        }else{
          popErrorMessage("Error: "+jsondata.msg+" Check the yourTwapperKepper URL",2500);
          //$.mobile.changePage("#ErrorPage");
        }
      });
      lastselectedArchive = selectedArchive;
    }

    
  });
  
  $("#debugButton").click(function(){
    now.msgAmount(function (data){
      console.log(data);
    });
  });
  
  // Show Msg Page
  $("#moreMsgsButton").click(function(){
    now.getMsgs(currentMsg,currentMsg+5, function(data){
      //console.log("res :",data, currentMsg ,now.jsonCurrentArchive.tweets.length);
      addMsgs(now.jsonCurrentArchive.tweets);
    });
  });
  
  $('#showMsgsPage').live('pagebeforeshow',function(){
    currentMsg=0;
    setMsgs(now.jsonCurrentArchive.tweets);
  });

  now.updateDowloadSlider = function(progress) {
    $('#downloadSlider').val(progress).slider("refresh");
    
    if(progress == 100){
      $('#downloadSliderBox').fadeOut(800);
      setArchiveInfo(now.jsonCurrentArchive.archive_info, $('#archive_info'));
      console.log(now.jsonCurrentArchive.archive_info);
    }
  };
    
  now.clientTest = function(par) {
    console.log("nerv",par);
  };
  
  $('#mapPage').live('pagebeforeshow', prepareMapPage);
  setUpMap();
//===============END OF DOC READY===============
});});



function setUpApiUrls(url){
  apiListArchivesUrl = url+ "apiListArchives.php";
  apiGetTweetsUrl = url+ "apiGetTweets.php";
}
function noVaildYtrkURL(){
  //popErrorMessage("You have to enter a vaild YourTwapperKeeper instance.",2000);
  $.mobile.changePage("#optionsPage");
}
function insertArchiveList(data){
  var archivesList = $('#archivesList');
  archivesList.empty();
  for(var i=0; i<data.length; i++){
    var entry = data[i];
    var entryHtml = ['<li><a href="#showArchivePage" ytkaid="'+entry.id+'" ><em>', entry.keyword, '</em>&nbsp;', entry.description,'</a><span class="ui-li-count">'+formatNumber(entry.count)+'</span></li>'].join("");
    archivesList.append(entryHtml);
  }
  archivesList.listview('refresh');
}

function setArchiveInfo(data, parent){
parent.empty();
var create_time = new Date(data.create_time*1000);//It is in Epoch time, so sec not milisec
parent.append("<center><h2>"+data.keyword+"</h2><p>"+data.description+"</p><p>"+create_time+"</p><p>total number of tweets = <strong>"+formatNumber(data.count)+"</strong></p></center>");
$('#browseMessagesCount').text(formatNumber(data.count));
}

function setMsgs(data){
  var msgList = $('#msgList');
  msgList.empty();
  addMsgs(data);
}

function addMsgs(data){
  //console.log("addMsgs",currentMsg,data);
  var msgList = $('#msgList');
  for(currentMsg; currentMsg<data.length; currentMsg++){
    var entry = data[currentMsg];
    //console.log();
    msgList.append(getMsgEntryHTML(entry));
  }
  
  msgList.listview('refresh');
}


function getMsgEntryHTML(entry){
var entryHtml = ["<li ><img src=", entry.profile_image_url.replace("normal","bigger"), "> <h3>",entry.from_user,"</h3><p><strong>",getHTMLLinksForText(entry.text),"</strong></p><p>",entry.created_at," Tweet id <a href=\"http://twitter.com/#!/",entry.from_user,"/status/",entry.id,"\" target=\"_blank\">",entry.id,"</a></p>"].join("");

    if(entry.geo_coordinates_0 != 0 ){
      entryHtml = [entryHtml, '<p><a href="#mapPage" >geo info:',entry.geo_type," - lat = ", entry.geo_coordinates_0," - long = ",entry.geo_coordinates_1,"</p>"].join("");
    }
    entryHtml = [entryHtml,"</li>"].join("");
    return entryHtml;
}

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

function getYTKID(value, archiveList){
  for (var i=0; i<archiveList.length; i++){
    if(archiveList[i].keyword==value){
      return archiveList[i].id;
    }
  }
  return "error";
}


    function popErrorMessage(errorMessage,stay){
    popMessage(errorMessage, stay, "ui-body-e");
    }
    
    function popSimpleMessage(simpleMessage,stay) {
        popMessage(simpleMessage, stay, "ui-body-b");
    }
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

function getHTMLLinksForText(text){
  var urls = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  var usernames = /(^|\s)@(\w+)/g;
  var hashtags = /(^|\s)#(\w+)/g;

  //URLs have to be replaced first other wise it will replace more than it should
  var text = text.replace(urls,         "<a href='$1' target=\"_blank\">$1</a>");
  var text = text.replace(usernames, "$1@<a href='http://www.twitter.com/$2' >$2</a>");
  var text = text.replace(hashtags , "$1#<a href='http://search.twitter.com/search?q=%23$2' >$2</a>");
  return text;
}

function createSelectetArchiveObject(array){
  var res = new Object();
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
      console.log(array[3]);
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
      res.limit = now.jsonListArchives[res.id-1].count;
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
    res.limit = now.jsonListArchives[res.id-1].count;
  }
  
  return res;
}

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

function unformatNumber(num) {
   return num.replace(/([^0-9\.\-])/g,'')*1;
}

String.prototype.trim = function() {
   return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
   return this.replace(/^\s+/g,"");
}
String.prototype.rtrim = function() {
   return this.replace(/\s+$/g,"");
}

function prepareMapPage(evt, ui) {
  console.log("HUHUHhuh");

} 
    
function setUpMap(){
  var mapContainer = $('#mapContainer');
  var usedHeight = 0;
        
  mapContainer.siblings().each(function() {
    usedHeight += $(this).outerHeight();
  });
        
  mapContainer.height(mapContainer.parent().height() - usedHeight);
  if (map) {
      $('#mapContainer').html('');
    }
//
// create a CloudMade tile layer
  var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/d692a017c2bc4e45a59d57699d0e0ea7/997/256/{z}/{x}/{y}.png',
      cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
      cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttribution});

  // initialize the map on the "map" div
  map = new L.Map('mapContainer');

  // set the map view to a given center and zoom and add the CloudMade layer
  map.setView(new L.LatLng(51.505, -0.09), 18).addLayer(cloudmade);

  // create a marker in the given location and add it to the map
  var markerLocation = new L.LatLng(51.5, -0.09),
  marker = new L.Marker(markerLocation);
  map.addLayer(marker);

  // attach a given HTML content to the marker and immediately open it
  marker.bindPopup("A pretty CSS3 popup Kuchen.<br />Easily customizable.").openPopup();
}

