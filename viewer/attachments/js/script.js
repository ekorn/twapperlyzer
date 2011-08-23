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
 
 // if a vhost is used the a rewrite rule set up in couchdb link to the 
 //db otherwise it will take the dbname out of the addressbar
var directUrl = document.location.href.split('/')[3];
$.couch.db("dbname").info({
    success: function(data) {
        mydb = $.couch.db("dbname");
        dbReady();
    },
    error: function(data){
      $.couch.db(directUrl).info({
        success: function(data) {
            mydb = $.couch.db(directUrl);
            dbReady();
        }
      });
    }
});
createPages();
  
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
 


//UNSORTED
      $(document).bind("scrollstop", loadMsgAtPageEnd);

//===============END OF DOC READY===============


});});


/**
 * Loading and setting options
 *
 */

function dbReady(){
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
  
  if(!_.isUndefined($_GET.laid)){
    createArchivePage($_GET.laid);
  }
  //The very last thing to do is load the changes feed so webkit can be sure that the site is already fully loaded
  setTimeout(setUpChangesFeed, 1000);
}

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
  twapperSession.templates.simpleContent = Handlebars.compile( $("#simpleContent").html() );
  twapperSession.templates.listContent = Handlebars.compile( $("#listContent").html() );
  twapperSession.templates.archivePageContent = Handlebars.compile( $("#archivePageContent").html() );
  twapperSession.templates.widgetListTemplate = Handlebars.compile( $("#widgetListTemplate").html() );
  twapperSession.templates.archiveListElements = Handlebars.compile( $("#archiveListElements").html());
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
    "navbarId" : "localArchivesNavbar",
    "footerText":""};
  
  $.mobile.pageContainer.append(twapperSession.templates.page(localArchivesPage));
  $('#localArchivesPage').page();
  
  //Archives List
  var archivesPage = {
    "pageId":"listArchivesPage", 
    "pageHeader":"Available Archives", 
    "listId":"archivesList",
    "navbarId" : "listArchivesNavbar",
    "footerText":""};
  
  $.mobile.pageContainer.append(twapperSession.templates.page(archivesPage));
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
          twapperSession.archiveList = [];
          _.each(list, function(listEntry){
            listEntry.aId = listEntry.id;
            listEntry.id = twapperSession.ytkUrlHash +"-"+listEntry.id;
            twapperSession.archiveList.push(listEntry);
          })

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
      
      if(twapperSession.selectedArchive.isSearch){
        popErrorMessage("Not implemented at the moment",1500);
      }else{
        createArchivePage(twapperSession.selectedArchive.entry.id);
      }
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
      return archiveList[i].id.split("-")[1];
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
        twapperSession.localArchiveList =[];
        
        _.each(data.rows, function(localArchiveListEntry){
          twapperSession.localArchiveList.push(localArchiveListEntry.value);
        });

        generateArchiveList($('#localArchiveList'), twapperSession.localArchiveList, null,"alphabetic" );//local archive id
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

function sortArchiveList(orderType){
  var target;
  if($.mobile.activePage.attr("id").split("-")[0] == "listArchivesPage"){
    generateArchiveList($('#archivesList'), twapperSession.archiveList, orderType );
  }else{
    generateArchiveList($('#localArchiveList'), twapperSession.localArchiveList, orderType );
  }
}
 /**
 * Empty the #archivesList and fill it with the content of 
 * archiveList 
 *
 */
function listArchivesPageHandler(event){
  generateArchiveList($('#archivesList'), twapperSession.archiveList, "alphabetic" );//your twapperkeeper archive id
}

function generateArchiveList(parent, data, orderType){
  parent.empty();
  var template = twapperSession.templates.archiveListElements;

  if(parent.attr("orderType") == orderType){
    data.reverse();
  }else{
    switch(orderType){
      case "alphabetic" :
        data.sort(compareKeywords);
        parent.attr("orderType", orderType);
      break;
      case "size" :
        data.sort(compareSize);
        parent.attr("orderType", orderType);
      break;
      case "chronologic" :
        data.sort(compareChronologic);
        parent.attr("orderType", orderType);
      break;
    }
  }


  var archiveListData = {};
  archiveListData.entry = data;
  parent.append(template(archiveListData));
  parent.listview('refresh');
  
  function compareKeywords(a, b) {
    
    var elementA = cutFirstChar(a.keyword.toLowerCase());
    var elementB = cutFirstChar(b.keyword.toLowerCase());

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
    var elementA = a.count;
    var elementB = b.count;

    return elementB - elementA;
  }
  
  function compareChronologic(a, b) {
    var elementA = a.id.split("-")[1];
    var elementB = b.id.split("-")[1];

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
            var listEntry = _.detect(twapperSession.archiveList, function(le){return le.id == requestedLaid});
            if(twapperSession.ytkUrlHash == hashId[0] && !_.isUndefined(listEntry)){
              if(data.messagesSoFar != listEntry.count){
                console.log("");
                var url = "docID="+requestedLaid+"&l="+listEntry.count;
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
    
    //Main Archive Page
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
    // Map Page
    Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    var mapPage = {
      "pageId":"mapPage-"+data._id, 
      "pageHeader":"Map", 
      "containerId":"mapContainer-"+data._id,
      "style" : ""
      };
    $.mobile.pageContainer.append(twapperSession.templates.page(mapPage));
    $("#mapPage-"+data._id).page();
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


    switch(pageHashId[0]){
      
      case "#showMsgsPage" :
        if($(target).length == 0){
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
          
          //Copy the coordinates from the link and prepare the map
          $('#msgList-'+laid).delegate('a', 'click', exportMessageEntry);
          
          $("#moreMsgsButton-"+laid).click(loadMessagesFromServer);
          $.mobile.changePage(target);
          loadMessagesFromServer();
        }else{
          $.mobile.changePage(target);
        }
      break;
      
      case "#mapPage" :
        setUpGeoMarkerForArchive(twapperSession.archives[laid].geoMarker,'mapContainer-'+laid)
        $.mobile.changePage(target);
      break;
      
      case "#archiveMentionsPage" :
        if($(target).length == 0){
          Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
          Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
          var mentionsPage = {
          "pageId":"archiveMentionsPage-"+laid, 
          "pageHeader":"Mentions in Archive", 
          "containerId":"archiveMentionsContainer-"+laid,
          "style":"margin: 0px auto; width: 320px; height: 400px; border: none;", 
          "footerText":""
          };
          $.mobile.pageContainer.append(twapperSession.templates.page(mentionsPage));
          $(target).page();
          
          $("#archiveMentionsContainer-"+laid).jQCloud(_.first(twapperSession.archives[laid].mentions, userOptions.showLimit));
          
          $.mobile.changePage(target);
        }else{
          $.mobile.changePage(target);
        }
      break;
      case "#archiveHashtagsPage" :
        if($(target).length == 0){
          Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
          Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
          var hashtagsPage = {
          "pageId":"archiveHashtagsPage-"+laid, 
          "pageHeader":"Hastags in the Archive", 
          "containerId":"archiveHashtagsContainer-"+laid,
          "style":"margin: 0px auto; width: 320px; height: 400px; border: none;", 
          "footerText":""
          };
          $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));
          $(target).page();
          $("#archiveHashtagsContainer-"+laid).jQCloud(_.first(twapperSession.archives[laid].hashtags, userOptions.showLimit));
          $.mobile.changePage(target);
        }else{
          $.mobile.changePage(target);
        }
      break;
      case "#archiveLinksPage" :
        Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
        Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
        var linksPage = {
        "pageId":"archiveLinksPage-"+laid, 
        "pageHeader":"Links in the Archive", 
        "containerId":"archiveLinksContainer-"+laid,
        "style":"width: 98%; height: 80%; margin: 0  auto",
        "footerText":""
        };
        $.mobile.pageContainer.append(twapperSession.templates.page(linksPage));
        $(target).page();
        addUrlChart("archiveLinksContainer-"+laid, twapperSession.archives[laid].urls, userOptions.showLimit);
        $.mobile.changePage(target);
      break;
    }
}


/**
 * Show Messages Page:
 *
 */



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
  var laid = getLaidFromPageName();
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
    var laid = getLaidFromPageName();
    // set the map view to a given center and zoom and add the CloudMade layer
    var entry = twapperSession.archives[laid].tweets[$(this).attr("msgid")];
    setUpMap('mapContainer-'+laid);
    var msgLocation = new L.LatLng(entry.geo_coordinates_0, entry.geo_coordinates_1,true);
    map.setView(msgLocation, 13);
    map.addLayer(getAvantarMarker(msgLocation, getHTMLLinksForText(entry.text), entry.profile_image_url));
    
  }
}



function getLaidFromPageName(){
  var tmp = $.mobile.activePage.attr("id").split("-");
  return tmp[1]+"-"+tmp[2];
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
  var laid = twapperSession.ytkUrlHash+"-"+array[0].value;
  res.entry = _.detect(twapperSession.archiveList, function(le)
    {return le.id == laid});

  res.isSearch = false;
  url = "ytkUrl="+userOptions.ytkUrl;

  _.each(array, function(element){
      //every fild that is set will get in the url
      if(element.value != ""){
        url += "&"+element.name+"="+element.value;
        if(!element.value == "o"){
          res.isSearch = true;
        }
      }
      if(element.name == "nort" && element.value != null){
         url += "&"+element.name+"="+element.value;
         res.isSearch = true;
      }
      //and the limit even if it is not set
      if(element.name == "l" && element.value == ""){
        url += "&l="+ res.entry.count;
      }
    });
  res.url = url;
  return res;
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
