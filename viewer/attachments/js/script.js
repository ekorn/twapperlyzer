var $_GET = getQueryParams(document.location.search);
var map;
var chart;
var userOptions;
var config;
var currentArchive;
var archiveList;
var mydb;

$(window).load(function(){ $(document).ready(function() {
  
/**
 * Loading and setting options:
 *
 */
  mydb = $.couch.db(document.location.href.split('/')[3] || "twapperlyzer");
  mydb.changes().onChange(function(changes) {
    _.each(changes.results, function(change){
      if(change.id == "config"){
        mydb.openDoc("config",  
          {success: 
            function(data) {
              console.log("config Update");
              config = data;
            }
          }
        ); 
      }
      if(currentArchive != null && change.id == currentArchive._id){
        mydb.openDoc(currentArchive._id,  
          {success: 
            function(data) {
              currentArchive = data; 
              checkArchiveParts();
            }
          }
        );
      }
      //Other Docs to watch
    });
  });
  
  
  
  //Loading the different configs
  mydb.openDoc("config",  
    {success: 
      function(configFromDb) {
        config = configFromDb;
      //if(typeof $_GET.ytkURL != 'undefined')
      loadUserConfig(function(err, result){
        if(err != null){
          popErrorMessage("could not load user config",1500);
          $.mobile.changePage("#optionsPage");
        }
      });
      }
    }
  ); 

  $.mobile.pageContainer.append(buildPage("archiveMentionsPage", "archiveMentionsContainer", "Mentions in Archive", "margin: 0px auto; width: 320px; height: 400px; border: none;"));
  $('#archiveMentionsPage').page();
  $.mobile.pageContainer.append(buildPage("archiveHashtagsPage", "archiveHashtagsContainer", "Hastags in the Archive", "margin: 0px auto; width: 320px; height: 400px; border: none;"));
  $('#archiveHashtagsPage').page();
  $.mobile.pageContainer.append(buildPage("archiveLinksPage", "archiveLinksContainer", "Links in the Archive", "width: 98%; height: 80%; margin: 0  auto"));
  $('#archiveLinksPage').page();


/**
 * Event binding for the JQM Pages
 *
 */
  //Welcome Page
  $( '#chooseArchiveForm :submit' ).click(chooseArchiveFormHandler); 

  // Options Page
  $('#optionsPage').live('pagebeforeshow',optionsPageHandler);
  $('#optionsForm :submit' ).click(optionsFormHandler); 
  //copy the chosen select to the text input
  $("#ytkURLSelect").change(function(){
    $("#ytkURLField").val($(this).val());
  });
  $("#dataProviderSelect").change(function(){
    $("#dataProviderField").val($(this).val());
  });
  $('#clearUserConfigButton').click(clearUserConfigHandler)
  
  //list Archives Page 
  $('#listArchivesPage').live('pagebeforeshow',listArchivesPageHandler);
  $('#archivesList').delegate('a', 'click', selectedArchiveByList);

  
  // Show Archive Page
  $('#showArchivePage').live('pagebeforeshow',showArchivePageHandler);
  //FIXME actually I want to bind it with showMsgsPage but it won't work
  $(document).bind("scrollstop", loadMsgAtPageEnd);
  //now.updateDowloadSlider = updateTheDownloadSlider;
  //now.partIsSaved = partIsSaved;
  $('#archiveWidgetsList').delegate('a', 'click', archiveWidgetsListHandler);
  
  $("#debugButton").click(function(){
    console.log("USELESS Buttons");
  });
    
  // Show Msg Page
 
  $('#showMsgsPage').live('pagebeforeshow',showMessagePageHandler);
  $("#moreMsgsButton").click(moreMsgsButtonHandler);
  //Copy the coordinates from the link and prepare the map
  $('#msgList').delegate('a', 'click', exportMessageEntry);

//UNSORTED


//===============END OF DOC READY===============
});});


/**
 * Loading and setting options
 *
 */



function loadUserConfig(callback){
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});
  twapperlyzerStore.get('twapperlyzerOptions', function(twapperlyzerOptions) {
    if(twapperlyzerOptions != null){
      testConfig(twapperlyzerOptions.dataprovider, twapperlyzerOptions.ytkURL, function(err, list){
        if(err == null){
          userOptions = twapperlyzerOptions;
          archiveList = list;
          $('#listHashtagsButton .ui-btn-text').text("List Hashtag Archives ("+archiveList.length+")");
          $('#ytkURLField').val(userOptions.ytkURL);
          $('#dataProviderField').val(userOptions.dataprovider);
          callback(null, true);
        }
        else callback(err, null);
      });
    }else{
      callback("no config found", null);
    }
  });
}

function testConfig(dataprovider, ytkURL, callback){

  /*
  $.jsonp({
    url: mx,
    success: function(data) {
      if(data.status == "ok"){
        getArchiveList(ytkURL,dataprovider, function(err, list){
          if(err == null){
            callback(null, list);
          }else{
            callback(err, null);
          }
        });
        
      }else{
        callback("Dataprovider URL is not valid", null);
      }
    },
    error: function(d,msg) {
      
    }
  });
  */
var testAPI = $.ajax({
    url : 'http://'+dataprovider+'/testAPI?callback=?',
    dataType : "jsonp",
    timeout : 1000
});

testAPI.success(function(data) {
      if(data.status == "ok"){
        getArchiveList(ytkURL,dataprovider, function(err, list){
          if(err == null){
            callback(null, list);
          }else{
            callback(err, null);
          }
        });
        
      }else{
        callback("Dataprovider URL is not valid", null);
      }
});

testAPI.error(function() {
  callback("Dataprovider URL is not valid", null);
});

}


/**
 * The First time when the site is ready the archive list is downloaded.
 * Afterward the Button will be updated and if a Id is present in the
 *  url the corresponding Archive is loaded.  
 *
 */
 
function loadList(){
  getArchiveList(userOptions.ytkURL,function(jsondata){
      archiveList = jsondata[0];
      $('#listHashtagsButton .ui-btn-text').text("List Hashtag Archives ("+archiveList.length+")");
      if(typeof $_GET.id != 'undefined'){
        id = new Object();
        id.value = $_GET.id;
        userOptions.selectedArchive = createSelectedArchiveObject(new Array(id));
        $.mobile.changePage("#showArchivePage");
      }
  }); 
}

function getArchiveList(ytkURL, dataprovider, callback){
  
  $.ajax({
    dataType: 'jsonp',
    data: "ytkURL="+ytkURL,
    jsonp: 'callback',
    url: 'http://'+dataprovider+'/getArchiveList?callback=?',
    success: function(data) {
      if(data.status == "ok"){
        callback(null, data.data[0]);
      }else{
        callback(data, null);
      }
    }
  });
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
  if(userOptions == null){
    noVaildYtrkURL();
  }else{
   chooseArchiveFormVars[0].value = validateHashtagField(chooseArchiveFormVars[0].value, archiveList);
    if(chooseArchiveFormVars[0].value == "error"){
      popErrorMessage("Can't analyse this archive",500);
    }else{
      userOptions.selectedArchive = createSelectedArchiveObject(chooseArchiveFormVars);
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
    if(archiveList[i].keyword.toLowerCase() ==value.toLowerCase()  || archiveList[i].keyword.substring(1, archiveList[i].keyword.length).toLowerCase()  == value.toLowerCase() ){
      return archiveList[i].id;
    }
  }
  return "error";
}

/**
 * Options Page:
 *
 */
function optionsPageHandler(){
  fillSelect($('#ytkURLSelect'), config.YtkUrls);
  fillSelect($('#dataProviderSelect'), config.dataprovider);
  if($('#ytkURLField').val() == ""){
     $('#ytkURLField').val(config.YtkUrls[0]);
  }
  if($('#dataProviderField').val() == ""){
     $('#dataProviderField').val(config.dataprovider[0]);
  }

}

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
  var dataprovider = $('#dataProviderField').val();

  //Cutting the Slash off if needed
  if (ytkURL!=null && ytkURL!=""){
    if(ytkURL.lastIndexOf("/") == (ytkURL.length-1)) {
      ytkURL=ytkURL.slice(0,ytkURL.length-1);
      $('#ytkURLField').val(ytkURL)
    }
  }
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});

  twapperlyzerStore.save(new twapperlyzerClientOptions(ytkURL, dataprovider));
  
  loadUserConfig(function(err,res){
    if(err==null){
      $.mobile.changePage("#welcomePage",{transition: "slide",reverse: true});
      appendNewURLsToConfig([ytkURL,dataprovider], [config.YtkUrls,config.dataprovider]);

    }else{
      twapperlyzerStore.nuke();
      popErrorMessage(" Error: Check your settings",1500);
    }
  });
  
}

function appendNewURLsToConfig(urls, arrays){
  var isChanged = false;
  if(urls.length == arrays.length){
    for(var i=0; i<urls.length; i++){
      var wasSeen = _.detect(arrays[i], function(element){
          return element == urls[i];
        });
      if(_.isUndefined(wasSeen)){
        arrays[i].push(urls[i]);
        isChanged = true;
      }
    }
    if(isChanged){
      mydb.saveDoc(config);
    }
  }
}
function clearUserConfigHandler(){
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});
  twapperlyzerStore.nuke();
  popSimpleMessage("User config cleared.", 1000);
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
function listArchivesPageHandler(){
  //Get the Global
  var data = archiveList;
  //Get the html element
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
  var id = new Object();
  id.value = $(this).attr("ytkaid");
  id.name = "id";
  
  var l = new Object();
  l.value = "";
  l.name = "l";
  userOptions.selectedArchive = createSelectedArchiveObject([id,l]);
}

/**
 * Show Archive Page:
 *
 */
 
 /**
 *  Get a archive from the server, ask for the one in options.selectedArchive.
 * - don't ask for the archive it is already present, but 
 *   check if it is this time a search
 * - transform the slider form element into a progress bar.
 * - check if the result has no messages included
 */
function showArchivePageHandler(){
  // First run result in undefied != some-id, so always true.
  if(userOptions.lastselectedArchive != userOptions.selectedArchive){
    setArchiveInfo(archiveList[userOptions.selectedArchive.id-1], $('#archive_info'));
    updateMsgTotal("-");
    $('#geoMarkerCount').text("-");
    $('#downloadSliderBox').show();
    $('#downloadSlider').val(0).slider("refresh");
    $('#downloadSliderBox').find('input[type="number"]').hide();
    //$('#archiveLinksListEntry').hide();
    getArchive(userOptions.selectedArchive.url,function(jsondata){
      mydb.openDoc(jsondata.id,  
        {success: function(data) {
            currentArchive = data; 
            /*
            if(currentArchive.messagesSoFar == 0){
              popErrorMessage("Selection has no Messages",1500);
              $.mobile.changePage("#welcomePage");
            }
            */
            checkArchiveParts();
          }
        
        });
    });
    userOptions.lastselectedArchive = userOptions.selectedArchive;
  }else{
    //console.log("client cache say",userOptions.lastselectedArchive,userOptions.selectedArchive);
    }
}

function getArchive(selectedArchive, callback){
  $.ajax({
    dataType: 'jsonp',
    data: selectedArchive,
    jsonp: 'callback',
    url: 'http://'+userOptions.dataprovider+'/createOrUpdateArchive?callback=?',
    success: function(data) {
      if(data.status == "ok"){
        callback(data);
      }else{
        popErrorMessage("Error: "+data.msg+" Can't get Archive",2500);
      }
    }
  });
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
 */
function updateTheDownloadSlider(progress) {
    $('#downloadSlider').val(progress).slider("refresh");
    if(progress == 100){
      $('#downloadSliderBox').fadeOut(800);
    }
}


function checkArchiveParts(){
  updateMsgTotal(currentArchive.messagesSoFar);
  
  if(currentArchive.geoMarker.length != 0){
    partIsSaved("geoMarker");
  }
  if(currentArchive.urls.length != 0){
     partIsSaved("urls");
  }
  if(currentArchive.hashtags.length != 0){
     partIsSaved("hashtags");
  }
  if(currentArchive.mentions.length != 0){
     partIsSaved("mentions");
  }
  if(currentArchive.users.length != 0){
     partIsSaved("users");
  }  
  
}
/**
 * Function that process the ready events that are fired when a 
 * analyse is done.
 *
 */
function partIsSaved(name,data){
  console.log("The Part "+name+" is ready.");
  if(!_.isUndefined(data  )){
    currentArchive[name] = data;
    console.log("Setting data: "+name);
  }
  switch(name){
    case "geoMarker" :
      $('#geoMarkerCount').text(formatNumber(currentArchive.geoMarker.length));
    break;
    case "urls" :
      addUrlChart();
    break;
    case "hashtags" :
       for (var i = 0; i < currentArchive.hashtags.length; i++){
        currentArchive.hashtags[i].url = "http://search.twitter.com/search?q=%23"+currentArchive.hashtags[i].text.substring(1,currentArchive.hashtags[i].text.length);
       }
      $("#archiveHashtagsCount").text(formatNumber(currentArchive.hashtags.length));
    break;
    case "mentions" :
       for (var i = 0; i < currentArchive.mentions.length; i++){
        currentArchive.mentions[i].url = "http://www.twitter.com/"+currentArchive.mentions[i].text;
       }
       
      $("#archiveMentionsCount").text(formatNumber(currentArchive.mentions.length));
    break;   
    case "users" :
      $.mobile.pageContainer.append(buildPage("archiveUsersPage", "archiveUsersContainer"));
      
      $("#archiveUsersCount").text(formatNumber(currentArchive.users.length));
    break;        
  }
}


function addUrlChart(){
  $('#archiveLinksCount').text(formatNumber(currentArchive.urls.length));
  var chartOptions = {
    chart: {
        renderTo: 'archiveLinksContainer',
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false
    },
    title: {
        text: 'Links in the Archive'
    },

    tooltip: {
        formatter: function() {
            return '<b>'+ this.y +'</b> times: '+ this.point.name;
        }
    },
    plotOptions: {
        pie: {
            size: '100%',
            allowPointSelect: true,
            cursor: 'pointer',
            
            dataLabels: {
                distance: -30,
                enabled: false,
                color: '#000000',
                connectorColor: '#000000',
                formatter: function() {
                    return '<b>'+ this.y +'</b> times';
                }
            }
            
        }
    },
    series: []
  };
  var series = {
    type: 'pie',
    name: 'Links',
    point: {
      events: {
        click: function(e) {
         this.slice();
         var clicked = this;
         setTimeout(function(){
             location.href = clicked.config[0];
         }, 500)
         e.preventDefault();
        }
      }
    },
    data: []
  };
  
  _.each(_.first(currentArchive.urls, userOptions.showLimit), function(url){
    series.data.push([ url.text, url.weight]);
  });
  chartOptions.series.push(series);
  
  chart = new Highcharts.Chart(chartOptions);
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
  }else if(target == "#showMsgsPage"){
    $.mobile.changePage(target);
  }else if(target == "#archiveLinksPage"){
    $.mobile.changePage(target);
  }else if(target == "#archiveHashtagsPage"){
    $.mobile.changePage(target);
    $("#archiveHashtagsContainer").html("");
    $("#archiveHashtagsContainer").jQCloud(_.first(currentArchive.hashtags, userOptions.showLimit));
  }else if(target == "#archiveMentionsPage"){
    $.mobile.changePage(target);
    $("#archiveHashtagsContainer").html("");
    $("#archiveMentionsContainer").jQCloud(_.first(currentArchive.mentions, userOptions.showLimit));
  }else if(target == "#archiveUsersPage"){
    $.mobile.changePage(target);
  }
}

/**
 * Clear the map and put the geoMarker on the map. 
 *  -a blue for one Person
 *  -a red one for more Peaple at the same place
 *
 */
function setUpGeoMarkerForArchive(){
  var data = currentArchive.geoMarker;
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
    var pos = new L.LatLng(geoM.lat, geoM.long,true);
    //One Message at one place, from one person;
    if(geoM.users.length == 1 && geoM.users[0].tweets.length == 1){
      marker = new L.Marker(pos);
      text +="<a href=\"http://twitter.com/#!/"+geoM.users[0].name+"/status/"+geoM.users[0].tweets[0].id+"\" target=\"_blank\">"+geoM.users[0].name+"</a>";
      //console.log("Simple Marker please",_.values(geoM.messages));
    }else if(geoM.users.length == 1){
      marker = new L.Marker(pos);
      text +=" <a href=\"http://twitter.com/#!/"+geoM.users[0].name+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[0].tweets.length,9)+"em;\">"+geoM.users[0].name+"</a> ";
      //console.log("Simple Marker please",_.values(geoM.messages));
    }else{
      marker = new L.Marker(pos,{icon:redMarker});
      for (var k = 0; k < geoM.users.length; k++){
        text +=" <a href=\"http://twitter.com/#!/"+geoM.users[k].name+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[k].tweets.length,9)+"em;\">"+geoM.users[k].name+"</a> ";
      }
    }
    marker.bindPopup(text,{autoPan:false});  
    map.addLayer(marker);
    //console.log("marker",marker);
  }
  $.mobile.changePage("#mapPage");
    
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
  userOptions.currentMsg=0;
  loadMessagesFromServer();
}

 /**
 * adding messages to the list.
 * 
 */
function addMsgs(data){
  var msgList = $('#msgList');
  for(userOptions.currentMsg; userOptions.currentMsg<data.length; userOptions.currentMsg++){
    var entry = data[userOptions.currentMsg];
    entry.msgid = userOptions.currentMsg;
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
  if(userOptions.currentMsg <= currentArchive.messagesSoFar){
    getMsgs(lastID,userOptions.addMsgVal, userOptions.ytkURL, currentArchive.archive_info.id, function(response){
      response.shift(); 
      currentArchive.tweets = currentArchive.tweets.concat(response);
      addMsgs(currentArchive.tweets);
    });
  }

}

function getMsgs(lastID,limit, ytkURL, id, callback){
  $.ajax({
    dataType: 'jsonp',
    data: "ytkURL="+ytkURL+"&l="+limit+"&id="+id+"&lastID="+lastID,
    jsonp: 'callback',
    url: 'http://'+userOptions.dataprovider+'/getMsgs?callback=?',
    success: function(data) {
      if(data.status == "ok"){
        callback(data.data.tweets);
      }else{
        popErrorMessage("Error: "+jsondata.msg+" Can't get Messages",2500);
      }
    }
  });
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
 * transform a array to a selected archive object that always include
 * - the id
 * - the ytkURL
 * - if it is a search
 *
 * @param {Array} array
 * @return {Object} selectedArchive
 */
function createSelectedArchiveObject(array){
  res = new Object;
  res.id = array[0].value;
  url = "ytkURL="+userOptions.ytkURL;
  
  _.each(array, function(element){
      //every fild that is set will get in the url
      if(element.value != ""){
        url += "&"+element.name+"="+element.value;
      }
      if(element.name == "nort" && element.value != null){
         url += "&"+element.name+"="+element.value;
      }
      //and the limit even if it is not set
      if(element.name == "l" && element.value == ""){
        url += "&l="+ archiveList[res.id-1].count;
      }
    });
  res.url = url;
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

function buildPage(id, container, header,style){
var page ='<div data-role="page" id="'+id+'" data-url="'+id+'">';
 
  page +='<div data-role="header">';
  page +='<a href="#optionsPage" class="ui-btn-right"  data-icon="gear" >Options</a>';
  page +='  <h1>'+header+'</h1>';
  page +='</div>';
 
  page +='<div data-role="content" id="'+container+'", style="'+style+'">';
  page +='</div>';
 
  page +='<div data-role="footer">';
  page +='<h4>Footer</h4>';
  page +='</div>';
page +='</div>';

return page;
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
function twapperlyzerClientOptions(ytkURL, dataprovider){
  this.key = 'twapperlyzerOptions';
  this.ytkURL = ytkURL;
  this.currentMsg=0;
  this.addMsgVal=5;
  this.selectedArchive;
  this.lastselectedArchive;
  this.showLimit = 20;
  this.dataprovider = dataprovider;
}

