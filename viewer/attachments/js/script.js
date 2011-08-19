var $_GET = getQueryParams(document.location.search);
var map;
var chart;
var userOptions = {};
var config;
var mydb;
var twapperSession = new Object(); //The temporary variable where all the session data is stored
twapperSession.archiveList;
twapperSession.archives = [];

  
$(window).load(function(){ 
  $(document).ready(function() {
  $.mobile.showPageLoadingMsg();
/**
 * Loading and setting options:
 *
 */
 
 //It will take the dbname out of the addressbar or if a vhost is used 
 //the  a rewrite rule set up in the couchdb 
  mydb = $.couch.db(document.location.href.split('/')[3] || "dbname");
  createPages();

if(!_.isUndefined($_GET.laid)){
  createArchivePage($_GET.laid);
}

  //Loading the different configs
  mydb.openDoc("config",  
    {success: 
      function(configFromDb) {
        config = configFromDb;
      //if(typeof $_GET.ytkUrl != 'undefined')
      loadUserConfig(function(err, result){
        $.mobile.hidePageLoadingMsg();
        if(err != null){
          popErrorMessage("could not load user config: "+err+". Check you Options",3500);
          //$.mobile.changePage("#optionsPage");
        }
      });
      }
    }
  ); 

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
  
  //localArchives Page
  $('#localArchivesPage').live('pagebeforeshow',localArchivesPageHandler);
  $('#localArchiveList').delegate('a', 'click', selectedArchiveByList);
  
  //list Archives Page 
  $('#listArchivesPage').live('pagebeforeshow',listArchivesPageHandler);
  $('#archivesList').delegate('a', 'click', selectedArchiveByList);

  
  $("#debugButton").click(function(){
    console.log("Useless");
    setUpChangesFeed();
//END
  });
    
  // Show Msg Page
 
  //Copy the coordinates from the link and prepare the map
  $('#msgList').delegate('a', 'click', exportMessageEntry);

//UNSORTED
      $(document).bind("scrollstop", loadMsgAtPageEnd);

//===============END OF DOC READY===============

//The very last thing to do is load the changes feed so webkit can be sure that the site is alredy fully loaded
setTimeout(setUpChangesFeed, 500);
});});


/**
 * Loading and setting options
 *
 */

function setUpChangesFeed(){
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
      var archiveIdThatChanged = _.detect(_.keys(twapperSession.archives) , function(archiveId){
          return change.id == archiveId;
        });
      
      if(!_.isUndefined(archiveIdThatChanged)){
        mydb.openDoc(archiveIdThatChanged,  
          {success: 
            function(data) {
              twapperSession.archives[archiveIdThatChanged] = data; 
              checkArchiveParts(data);
            }
          }
        );
      }
      //Other Docs to watch
    });
  });
}


function createPages(){
  
  //Helper Functions
  Handlebars.registerHelper("formatEpochTime", function(time){
    return new Date(time*1000);//It is in Epoch time, so sec not milisec
  });
  Handlebars.registerHelper("htmlLinksForText", getHTMLLinksForText);
  Handlebars.registerHelper("formatNumber", formatNumber);
  
  //Compile Templates
  twapperSession.templates = {};
  twapperSession.templates.page = Handlebars.compile( $("#page").html() );
  twapperSession.templates.normalHeader = Handlebars.compile( $("#normalHeader").html() );
  twapperSession.templates.msgEntryTemplate = Handlebars.compile( $("#msgEntryTemplate").html() );
  twapperSession.templates.listContent = Handlebars.compile( $("#listContent").html() );
  twapperSession.templates.archivePageContent = Handlebars.compile( $("#archivePageContent").html() );
  twapperSession.templates.widgetListTemplate = Handlebars.compile( $("#widgetListTemplate").html() );
  twapperSession.templates.archiveListElements = Handlebars.compile( $("#archiveListElements").html());
  twapperSession.templates.archiveLocalListElements = Handlebars.compile( $("#archiveLocalListElements").html() );
  twapperSession.templates.simpleFooter = Handlebars.compile( $("#simpleFooter").html() );
  twapperSession.templates.buttonFooter = Handlebars.compile( $("#buttonFooter").html() );
  twapperSession.templates.navbarArchiveListFooter = Handlebars.compile( $("#navbarArchiveListFooter").html() );

  
  
  
  
  Handlebars.registerPartial('header', $("#optionsHeader").html());
  Handlebars.registerPartial('content', $("#optionsContent").html());
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);

  //Options Page
  var optionsPage = {
    "pageId":"optionsPage", 
    "pageHeader":"Options",
    "footerText":""};
    
  $.mobile.pageContainer.append(twapperSession.templates.page(optionsPage));
  $('#optionsPage').page();



  //WelcomePage
  Handlebars.registerPartial('header', $("#welcomeHeader").html());
  Handlebars.registerPartial('content', $("#welcomeContent").html());
  var welcomePage = {
    "pageId":"welcomePage", 
    "pageHeader":"Twapperlyzer",
    "footerText":""};
    
  $.mobile.pageContainer.append(twapperSession.templates.page(welcomePage));
  $('#welcomePage').page();
  
  //Local Archives List
  Handlebars.registerPartial('header', twapperSession.templates.normalHeader);
  Handlebars.registerPartial('content', twapperSession.templates.listContent);
  Handlebars.registerPartial('footer',   twapperSession.templates.navbarArchiveListFooter);

  var localArchivesPage = {
    "pageId":"localArchivesPage", 
    "pageHeader":"Analysed Archives in DB", 
    "listId":"localArchiveList", 
    "footerText":""};
  
  $.mobile.pageContainer.append(twapperSession.templates.page(localArchivesPage));
  $('#localArchivesPage').page();
  
  //Archives List
  var localArchivesPage = {
    "pageId":"listArchivesPage", 
    "pageHeader":"Available Archives", 
    "listId":"archivesList", 
    "footerText":""};
  
  $.mobile.pageContainer.append(twapperSession.templates.page(localArchivesPage));
  $('#localArchivesPage').page();
  
  
}

/**
 * The First time when the site is ready the archive list is downloaded.
 * Afterward the Button will be updated.
 *
 */
function loadUserConfig(callback){
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});
  twapperlyzerStore.get('twapperlyzerOfflineOptions', function(twapperlyzerOptions) {
    if(twapperlyzerOptions != null){
      userOptions = twapperlyzerOptions;
    }
  });
  twapperlyzerStore.get('twapperlyzerOnlineOptions', function(twapperlyzerOptions) {
    if(twapperlyzerOptions != null){
      if(_.isUndefined($_GET.laid)){
        $.mobile.changePage('#welcomePage',{ transition: "fade"} );
      }
      testConfig(twapperlyzerOptions.dataprovider, twapperlyzerOptions.ytkUrl, function(err, list){
        if(err == null){
          userOptions.ytkUrl = twapperlyzerOptions.ytkUrl;
          userOptions.dataprovider = twapperlyzerOptions.dataprovider;
          twapperSession.ytkUrlHash = MD5(twapperlyzerOptions.ytkUrl);
          twapperSession.archiveList = list;
          $('#listHashtagsButton .ui-btn-text').text("List Hashtag Archives ("+twapperSession.archiveList.length+")");
          $('#ytkURLField').val(userOptions.ytkUrl);
          $('#dataProviderField').val(userOptions.dataprovider);
          callback(null, true);
        }
        else callback(err, null);
      });
    }else{
      callback("no config found", null);
      if(_.isUndefined($_GET.laid)){
        $.mobile.changePage('#optionsPage',{ transition: "fade"} );
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
   chooseArchiveFormVars[0].value = validateHashtagField(chooseArchiveFormVars[0].value, twapperSession.archiveList);
    if(chooseArchiveFormVars[0].value == "error"){
      popErrorMessage("Can't analyse this archive",500);
    }else{
      twapperSession.selectedArchive = createSelectedArchiveObject(chooseArchiveFormVars);
      $.mobile.changePage("#showArchivePage");
    }
  }
}

 /**
 * check if the user input is a valid archive number 
 * find the id to a hastag.
 * 
 * @param {String} value The user input
 * @param {Array} twapperSession.archiveList The list of available archives.
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


  var ytkUrl = $('#ytkURLField').val();
  var dataprovider = $('#dataProviderField').val();

  //Cutting the Slash off if needed
  if (ytkUrl!=null && ytkUrl!=""){
    if(ytkUrl.lastIndexOf("/") == (ytkUrl.length-1)) {
      ytkUrl=ytkUrl.slice(0,ytkUrl.length-1);
      $('#ytkURLField').val(ytkUrl)
    }
  }
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});

  twapperlyzerStore.save(new twapperlyzerClientOnlineOptions(ytkUrl, dataprovider));
  twapperlyzerStore.save(new twapperlyzerClientOfflineOptions());
  
  loadUserConfig(function(err,res){
    if(err==null){
      $.mobile.changePage("#welcomePage",{transition: "slide",reverse: true});
      appendNewURLsToConfig([ytkUrl,dataprovider], [config.YtkUrls,config.dataprovider]);

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


function localArchivesPageHandler(){
  mydb.view("twapperlyzer/listArchives", {
      success: function(data) {
        generateArchiveList($('#localArchiveList'), data.rows);//local archive id
      },
      error: function(status) {
          popErrorMessage("Clod not load Local Archives Analyses"+status, 3000)
          $.mobile.changePage("#welcomePage",{transition: "slide",reverse: true});
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
function listArchivesPageHandler(event){
  generateArchiveList($('#archivesList'), twapperSession.archiveList, twapperSession.ytkUrlHash);//your twapperkeeper archive id
}

function generateArchiveList(parent, data, hash){
  Handlebars.registerHelper("laidHelper", function(id){ return hash+"-"+id});
  parent.empty();
  var template;
  if(hash != null){
    template = twapperSession.templates.archiveListElements;
  }else{
    template = twapperSession.templates.archiveLocalListElements;
  }
  
  data.sort(compareSize);
  var archiveListData = {};
  archiveListData.entry = data;
  parent.append(template(archiveListData));
  parent.listview('refresh');
  
  function compareKeywords(a, b) {
    if(_.isUndefined(a.value)){
      var elementA = a.keyword.toLowerCase( );
      var elementB = b.keyword.toLowerCase( );
    }else{
      var elementA = a.value.keyword.toLowerCase( );
      var elementB = b.value.keyword.toLowerCase( );
    }
    elementA = cutFirstChar(elementA);
    elementB = cutFirstChar(elementB);
    
    if (elementA < elementB) {return -1}
    if (elementA > elementB) {return 1}
    return 0;

    function cutFirstChar(keyword){
      if(keyword.charAt(0) == "#" || keyword.charAt(0) == "@"){
        keyword = keyword.substring(1,keyword.length);
      }
      return keyword;
    }
  }
  
  function compareSize(a, b) {
    if(_.isUndefined(a.value)){
      var elementA = a.count;
      var elementB = b.count;
    }else{
      var elementA = a.value.count;
      var elementB = b.value.count;
    }

    return elementB - elementA;
    
  }
  
  function compareChronologic(a, b) {
    if(_.isUndefined(a.value)){
      var elementA = a.id;
      var elementB = b.id;
    }else{
      var elementA = a.value.id;
      var elementB = b.value.id;
    }
    return elementA - elementB;
  }
}

 /**
 * Get the archive id from the li and create the selectedArchive object.
 * This function is called before the handleShowArchivePage function. 
 *
 */
function selectedArchiveByList(event) {
  event.preventDefault();
  event.stopPropagation();
  
  createArchivePage($(this).attr("href").split("#page-")[1]);
}

function createArchivePage(requestedLaid){
  var hashId = requestedLaid.split("-");
  twapperSession.laid = requestedLaid;
  if(twapperSession.lastLaid != twapperSession.laid){
    mydb.openDoc( requestedLaid,  
      {success: function(data) {
          setData(data);
          if (twapperSession.ytkUrlHash != null){
            
            if(twapperSession.ytkUrlHash == hashId[0] && twapperSession.archiveList[hashId[1]-1].id == hashId[1]){
              if(data.messagesSoFar != twapperSession.archiveList[hashId[1]-1].count){
                console.log("");
                var url = "docID="+requestedLaid+"&l="+twapperSession.archiveList[hashId[1]-1].count;
                updateArchive(url,config.thisdb, userOptions.dataprovider, function(err, result){
                  if(err!=null){
                    popErrorMessage("Could not update this archive: "+err.msg, 2000);
                  }else{
                    popSimpleMessage("Updating this archive: "+err.msg, 2000);
                  }
                });
              }
            }
          }
          
          twapperSession.lastLaid = twapperSession.laid;
        }
      ,error: function(){
        var id = new Object();
        id.value = hashId[1];
        id.name = "id";
        var l = new Object();
        l.value = "";
        l.name = "l";
        twapperSession.selectedArchive = createSelectedArchiveObject([id,l]);
        $.mobile.showPageLoadingMsg();
        getArchiveFromDataprovider(twapperSession.selectedArchive.url,config.thisdb, userOptions.dataprovider,function(data){
          setData(data);
          twapperSession.lastLaid = twapperSession.laid;
        });
      }
      }
    );
  }else{
    $.mobile.changePage("#page-"+twapperSession.laid)
  }
}

 /**
 * Get the archive id from the li and create the selectedArchive object.
 * This function is called before the handleShowArchivePage function. 
 *
 */


 
function getArchiveFromDataprovider(selectedArchiveUrl,thisdb, dataprovider, callback){
    createOrUpdateArchive(selectedArchiveUrl, thisdb, dataprovider, function(err, result){
      if(err!=null){
        popErrorMessage("Could not analyse this archive: "+err.msg, 2000);
      }else{
        mydb.openDoc(result.id,  
          {success: function(data) {
              callback(data);
            }
          });
      }
    });
}


function setData(data){

  if($('#page-'+data._id).length == 0){
    twapperSession.archives[data._id] = data;
    Handlebars.registerPartial('content', twapperSession.templates.archivePageContent);
    Handlebars.registerPartial('widgetList', twapperSession.templates.widgetListTemplate);
    
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    
    var archivePageData = {
      "pageId":"page-"+data._id, 
      "pageHeader": "Archive: "+data.archive_info.keyword,
      
      "archive": data
      };
    $.mobile.pageContainer.append(twapperSession.templates.page(archivePageData));
    twapperSession.archives[data._id].currentMsg = 0;
    $('#page-'+data._id).page();
    $('#archiveWidgetsList-'+data._id).delegate('a', 'click', archiveWidgetsListHandler);
  }else{
    console.log("Update....");//FIXME
    var tmp = twapperSession.archives[data._id].currentMsg ;
    twapperSession.archives[data._id] = data; 
    twapperSession.archives[data._id].currentMsg = tmp;
  }
  
  $.mobile.hidePageLoadingMsg();
  $.mobile.changePage("#page-"+data._id);
}

/**
 * Show Archive Page:
 *
 */
 



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


function checkArchiveParts(currentArchive){
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
  if(!_.isUndefined(data)){
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
  var pageHashId = target.split("-");
  var laid = pageHashId[1]+"-"+pageHashId[2];

  if($(target).length == 0){
    switch(pageHashId[0]){
      case "#showMsgsPage" :
        Handlebars.registerPartial('content', twapperSession.templates.listContent);
        Handlebars.registerPartial('footer', twapperSession.templates.buttonFooter);
        var showMsgsPage = {
          "pageId":"showMsgsPage-"+laid, 
          "pageHeader":"Messgaes", 
          "listId":"msgList-"+laid, 
          "footerButtonId":"moreMsgsButton-"+laid,
          "footerButtonText": "More Messages"
          };
        $.mobile.pageContainer.append(twapperSession.templates.page(showMsgsPage));
        $(target).page();
        $.mobile.changePage(target);
        $("#moreMsgsButton-"+laid).click(loadMessagesFromServer);
        loadMessagesFromServer();
      break;
      
    }
  }else{
    $.mobile.changePage(target);
  }
  /*
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
  */
}


/**
 * Show Messages Page:
 *
 */



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
  
    if($.mobile.activePage.attr("id").indexOf("showMsgsPage") !== -1){
      if(pixelsFromWindowBottomToBottomInPercent<20){
        loadMessagesFromServer();
      }
      //console.log(pixelsFromWindowBottomToBottomInPercent,"%");
    }
}

 /**
 * add messages to the current list
 * 
 */
function loadMessagesFromServer(){
  laid = $.mobile.activePage.attr("id").split("showMsgsPage-")[1];
  var currentArchive = twapperSession.archives[laid];
  var lastID=0;
  if(currentArchive.tweets.length != 0 ){
    
    lastID = currentArchive.tweets[currentArchive.tweets.length-1].id;
  }
  if(currentArchive.currentMsg <= currentArchive.messagesSoFar){
    getMsgs(lastID,userOptions.addMsgVal, userOptions.ytkUrl, currentArchive.archive_info.id,userOptions.dataprovider, function(response){
      if(currentArchive.tweets.length != 0 ){
        response.shift();
      }
      currentArchive.tweets = currentArchive.tweets.concat(response);
      
      var msgList = $('#msgList-'+laid);
      for(currentArchive.currentMsg; currentArchive.currentMsg<currentArchive.tweets.length; currentArchive.currentMsg++){
        var entry = currentArchive.tweets[currentArchive.currentMsg];
        entry.msgid = currentArchive.currentMsg;
        entry.laid = laid;
        if(entry.geo_coordinates_0 == 0){
          entry.geo_coordinates_0 = false;
        }
        msgList.append(twapperSession.templates.msgEntryTemplate(entry));
        //msgList.append(getMsgEntryHTML(entry));
      }
      
      msgList.listview('refresh');
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
  url = "ytkUrl="+userOptions.ytkUrl;
  
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
        url += "&l="+ twapperSession.archiveList[res.id-1].count;
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

/**
 * Own Objects 
 */

/**
 * Hold the user Settings for Functions that should be available when the couchdb is locally installed
 */
function twapperlyzerClientOfflineOptions(){
  this.key = 'twapperlyzerOfflineOptions';
  this.addMsgVal=5;
  this.showLimit = 20;
}

/**
 * Hold the urls to the that needed for new analyses and updates
 */
function twapperlyzerClientOnlineOptions(ytkUrl, dataprovider){
  this.key = 'twapperlyzerOnlineOptions';
  this.ytkUrl = ytkUrl;
  this.dataprovider = dataprovider;
}
