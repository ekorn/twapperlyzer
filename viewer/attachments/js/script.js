var $_GET;
var map;
var chart;
var userOptions = {};
var config;
var messages = {};
var mydb;
var twapperSession = {}; //The temporary variable where all the session data is stored
twapperSession.archiveList = [];
twapperSession.archives = [];
twapperSession.localArchiveList =[];
messages.configNotFound = "config not found";


  
$(window).load(function(){ 
  $(document).ready(function() {
  $.mobile.showPageLoadingMsg();
  $.mobile.page.prototype.options.domCache = true;
  $.timeago.settings.allowFuture = true;
  
  
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
        dbReady(data);
        
    },
    error: function(data){
      $.couch.db(directUrl).info({
        success: function(data) {
            mydb = $.couch.db(directUrl);
            dbReady(data);

        }
      });
    }
});
// Listen for any attempts to call changepage.
$(document).bind( "pagebeforechange", function( e, data ) {
	// We only want to handle changepage calls where the caller is
	// asking us to load a page by URL.Beacuse afterwards when we are done withthe page creation 
  // we send a changePage request with a Object.
	if ( typeof data.toPage === "string" ) {
      console.log(data.toPage+" comming in.");
      
      //Getting the parameter out
      var params = data.toPage.split("?");
      if(params.length === 2 ){
        data.options.dataUrl = data.toPage;//Whats shown in the locations bar
        data.toPage = params[0] //Where we really going
        $_GET = getQueryParams(params[1]); //the parameter
        console.log(data.toPage+" without params",$_GET);
      }
      
      //a hack to deal with strange modifications of the urls in links
      //sometimes the domain plus the first page (loadPage in this case)
      //is put in front of the url in the link
     
      data.toPage="#"+data.toPage.split("#")[1];
      console.log(data.toPage+" now cleaned.");
      
      var reExTarget = /#(\w*)-(\w*)-(\d*)/
      var toPageParts = data.toPage.match(reExTarget);
      var target;
      if(toPageParts === null){ //it is not a standard url with a laid
        target = $(data.toPage); 
        if(target.length === 0){//its not in the DOM
          $.mobile.changePage($('#listArchivesPage'), data.options); //so I can't load it so redirect 
        }
      }else{//it is a standard url 
        target = $(data.toPage); 
        if(target.length === 0){//its not in the DOM so I load the laid
          e.preventDefault();
          console.log("It themes like "+data.toPage+" do not exists.");
          createArchivePage(toPageParts[2]+"-"+toPageParts[3], function(page){
            if(page === '#listArchivesPage'){
              $.mobile.changePage($(page),data.options);
            }else{
              $.mobile.changePage($(data.toPage),data.options);
            }
          });
        }else{ //it is in the DOM 
        
        console.log("nothing to do just let it path to",data.toPage);
        }
      }
	}
});


$(document).bind( "pagechange", function( e, data ) {
//console.log("changeDone",data);
});

$(document).bind( "pagechangefailed", function( e, data ) {
console.log("page change failed",data.toPage);
});

createPages();

/**
 * Event binding for the JQM Pages
 *
 */

  // Options Page
  $('#optionsPage').live('pagebeforeshow',optionsPageHandler);
  $('#optionsForm :submit' ).click(optionsFormHandler); 
  //copy the chosen value from the selectbox to the text input
  $("#ytkURLSelect").change(function(){
    $("#ytkURLField").val($(this).val());
  });
  $("#dataProviderSelect").change(function(){
    $("#dataProviderField").val($(this).val());
  });
  $('#clearUserConfigButton').click(clearUserConfigHandler);

  //list Archives Page 
  $('#listArchivesPage').live('pagebeforeshow',listArchivesPageHandler);
  $('#archivesList').delegate('a', 'click', selectedArchiveByList);

  
  $("#debugButton").click(function(){
    console.log("Useless");
    //END
  });
    
//UNSORTED
      $(document).bind("scrollstop", loadMsgAtPageEnd);

//===============END OF DOC READY===============

});});


/**
 * Loading and setting options
 *
 */

function createAlert(html){
  $(this).simpledialog({
        'mode' : 'blank',
        'prompt': false,
        'forceInput': false,
        'fullHTML' : twapperSession.templates.simpleDialog(html)
    });
}

function createDialog(text, callback){
  $(this).simpledialog({
    'mode' : 'string',
    'prompt' : text,
    'buttons' : {
    'Analyse' : {
        click: function () { callback($(this).attr('data-string')); },
      },
    'Cancel': {
      click: function () { callback(false); },
      icon: "delete",
      theme: "c"
    }
    }
  });
}

function dbReady(info){
  
  //Loading the different configs
  mydb.openDoc("config",  
    {success: 
      function(configFromDb) {
        config = configFromDb;
        //Create the about page
        Handlebars.registerPartial('header', twapperSession.templates.normalHeader);
        Handlebars.registerPartial('content', $("#aboutContent").html());
        Handlebars.registerPartial('footer',   twapperSession.templates.simpleFooter);
        
        var aboutPage = {
          "pageId":"aboutPage", 
          "pageHeader":"About twapperlyzer",
          "dataproviderUrl": configFromDb.dataprovider[0],
          "adminEmail": configFromDb.adminEmail,
          "adminName": configFromDb.adminName,
          "footerText": ""
          };
          
        $.mobile.pageContainer.append(twapperSession.templates.page(aboutPage));
        $('#aboutPage').page();
  
      //=====
      loadUserConfig(function(err, result){
        $.mobile.hidePageLoadingMsg();
        //ERROR
        if(err !== null){
          //IT's likly that this is the first visit
          if (err == messages.configNotFound){

            //Set up the default conf
            var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});
            twapperlyzerStore.save(new twapperlyzerClientOnlineOptions(configFromDb.ytkUrls[0], configFromDb.dataprovider[0]));
            twapperlyzerStore.save(new twapperlyzerClientOfflineOptions());

            //Try if it is working
            loadUserConfig(function(err,res){
              //Fine it is working 
              if(err===null){
                var simpleDialog = {
                  "dialogHeader":"No Config found", 
                  "dialogText":"Since twapperlyzer could not find a configuration, it will set up the default one. You can change the default settings by clicking options in the upper right corner.",
                  "target": ""
                };
                //Lets inform the user about the default conf and route him to his target
                if(_.isUndefined($_GET.laid)){
                  simpleDialog.target = "#listArchivesPage";
                  createAlert(simpleDialog);
                }else{
                  createArchivePage($_GET.laid, function(page){
                    simpleDialog.target = page;
                    createAlert(simpleDialog);
                  });
                }
              }else{//Default Conf does not work this should never happen 
                var simpleDialog = {
                  "dialogHeader":"Default config invaild", 
                  "dialogText":"The default settings don't work, you might contact the twapperlyzer admin: "+err,
                  "target": "#aboutPage"
                };
                twapperlyzerStore.nuke();
                createAlert(simpleDialog);
              }
            });
  

          }else{//Some minor Error, just let the user now where he can change his settings and route him to his target
            popErrorMessage("Error while loading user config: "+err+". Check you Options",3500);
            if(document.location.hash === ""){
              $.mobile.changePage('#listArchivesPage',{ transition: "fade"} );
            }else{ //Move to the requited page
              $.mobile.changePage(document.location.hash,{ transition: "fade"} );
              //createArchivePage($_GET.laid, function(page){
                //$.mobile.changePage(page,{ transition: "fade"} );
                //});
            }
          }
        }else{//All fine just route him to his target
          if(document.location.hash === ""){
            $.mobile.changePage('#listArchivesPage',{ transition: "fade"} );
          }else{ //Move to the requited page
          $.mobile.changePage(document.location.hash,{ transition: "fade"} );
            //createArchivePage($_GET.laid, function(page){
              //$.mobile.changePage(page,{ transition: "fade"} );
            //});
          }
        }
    
      });
      }
    }
  ); 
  
  
  //Load the archive List from the DB
  mydb.view("twapperlyzer/listArchives", {
      success: function(data) {
        _.each(data.rows, function(localArchiveListEntry){
          twapperSession.localArchiveList.push(localArchiveListEntry.value);
        });
      },
      error: function(status) {
          popErrorMessage("Could not load already analysed archives"+status, 3000);
      }
  });
  
  //The very last thing to do is load the changes feed so webkit can be sure that the site is already fully loaded
  setTimeout(setUpChangesFeed, 4000);
}

function setUpChangesFeed(){
  mydb.changes().onChange(function(changes) {
    _.each(changes.results, function(change){
      //Watch for config changes, somebody could add another datasource or ytkUrl
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
      //check if the archive is visited by the user in this Session and update the data
      var archiveIdThatChanged = _.detect(_.keys(twapperSession.archives) , function(archiveId){
          return change.id == archiveId;
        });
      
      if(!_.isUndefined(archiveIdThatChanged)){
        mydb.openDoc(archiveIdThatChanged,  
          {success: 
            function(data) {
              twapperSession.archives[archiveIdThatChanged] = data;
              //Fade out the progress bar when the doc is analysed 
              if(twapperSession.archives[archiveIdThatChanged].status === "done"){
                $("#analyseProgress-"+twapperSession.archives[archiveIdThatChanged]._id).fadeOut(800);
              }
              //Fade in the progress bar when the doc is analysing
              if(data.status === "analysing"){
                $("#analyseProgress-"+data._id).fadeIn(800);
              } 
              //checkArchiveParts(data);
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
    return jQuery.timeago(new Date(time*1000));//It is in Epoch time, so sec not milisec
  });
  Handlebars.registerHelper("htmlLinksForText", getHTMLLinksForText);
  Handlebars.registerHelper("formatNumber", formatNumber);
  
  //Compile Templates
  twapperSession.templates = {};
  twapperSession.templates.page = Handlebars.compile( $("#page").html() );
  twapperSession.templates.simpleDialog = Handlebars.compile( $("#simpleDialog").html() );
  
  twapperSession.templates.normalHeader = Handlebars.compile( $("#normalHeader").html() );
  twapperSession.templates.msgEntryTemplate = Handlebars.compile( $("#msgEntryTemplate").html() );
  twapperSession.templates.simpleContent = Handlebars.compile( $("#simpleContent").html() );
  twapperSession.templates.blockListContent = Handlebars.compile( $("#blockListContent").html() );
  twapperSession.templates.listContent = Handlebars.compile( $("#listContent").html() );
  twapperSession.templates.archivePageContent = Handlebars.compile( $("#archivePageContent").html() );
  twapperSession.templates.widgetListTemplate = Handlebars.compile( $("#widgetListTemplate").html() );
  twapperSession.templates.archiveListElements = Handlebars.compile( $("#archiveListElements").html());
  twapperSession.templates.simpleFooter = Handlebars.compile( $("#simpleFooter").html() );
  twapperSession.templates.buttonFooter = Handlebars.compile( $("#buttonFooter").html() );
  twapperSession.templates.buttonLinkFooter = Handlebars.compile( $("#buttonLinkFooter").html() );
  
  twapperSession.templates.navbarArchiveListFooter = Handlebars.compile( $("#navbarArchiveListFooter").html() );
  twapperSession.templates.navbarMemberFooter = Handlebars.compile( $("#navbarMemberFooter").html() );

  
  //Elements
  twapperSession.templates.simpleList = Handlebars.compile( $("#simpleList").html() );
  
  
  
  Handlebars.registerPartial('header', $("#optionsHeader").html());
  Handlebars.registerPartial('content', $("#optionsContent").html());
  Handlebars.registerPartial('footer', twapperSession.templates.buttonLinkFooter);

  //Options Page
  var optionsPage = {
    "pageId":"optionsPage", 
    "pageHeader":"Options",
    "target": "#aboutPage",
    "footerButtonText":"About twapperlyzer"};
    
  $.mobile.pageContainer.append(twapperSession.templates.page(optionsPage));
  $('#optionsPage').page();

  //Archives List

  Handlebars.registerPartial('header', twapperSession.templates.normalHeader);
  Handlebars.registerPartial('content', twapperSession.templates.listContent);
  Handlebars.registerPartial('footer',   twapperSession.templates.navbarArchiveListFooter);
  
  var archivesPage = {
    "pageId":"listArchivesPage", 
    "pageHeader":"Available Archives", 
    "listId":"archivesList",
    "navbarId" : "listArchivesNavbar"
    };
  
  $.mobile.pageContainer.append(twapperSession.templates.page(archivesPage));
  $('#listArchivesPage').page();
  
    // Show Single User Map Page
    Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    var mapPage = {
      "pageId":"mapPageForSingleUser", 
      "pageHeader":"Show User", 
      "containerId":"mapContainerForSingleUser",
      "style" : ""
      };
    $.mobile.pageContainer.append(twapperSession.templates.page(mapPage));
    $("#mapPageForSingleUser").page();
    
    /**
     * If a Geo link was clicked
     * - clear the map
     * - set up the Map with this the message object 
     */
     
    $("#mapPageForSingleUser").live('pagebeforeshow', function(){

      // set the map view to a given center and zoom and add the CloudMade layer
      var entry = twapperSession.archives[twapperSession.laid].tweets[$_GET.msgid];
      setUpMap('mapContainerForSingleUser');
      var msgLocation = new L.LatLng(entry.geo_coordinates_0, entry.geo_coordinates_1,true);
      map.setView(msgLocation, 13);
      map.addLayer(getAvantarMarker(msgLocation, getHTMLLinksForText(entry.text), entry.profile_image_url));
    });
}

/**
 * The First time when the site is ready the archive list is downloaded.
 * Afterward the Button will be updated.
 *
 */
function loadUserConfig(callback){
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});
  twapperlyzerStore.get('twapperlyzerOfflineOptions', function(twapperlyzerOptions) {
    if(twapperlyzerOptions !== null){
      userOptions = twapperlyzerOptions;
    }
  });
  twapperlyzerStore.get('twapperlyzerOnlineOptions', function(twapperlyzerOptions) {
    if(twapperlyzerOptions !== null){

      twapperlyzerApi.testConfig(twapperlyzerOptions.dataprovider, twapperlyzerOptions.ytkUrl, function(err, list){
        if(err === null){
          userOptions.ytkUrl = twapperlyzerOptions.ytkUrl;
          userOptions.dataprovider = twapperlyzerOptions.dataprovider;
          twapperSession.ytkUrlHash = MD5(twapperlyzerOptions.ytkUrl);
          twapperSession.archiveList = [];
          _.each(list, function(listEntry){
            listEntry.aId = listEntry.id;
            listEntry.id = twapperSession.ytkUrlHash +"-"+listEntry.id;
            twapperSession.archiveList.push(listEntry);
          });

          $('#listRemoteArchivesButton .ui-btn-text').text("List archives from YourTwapperkeeper ("+twapperSession.archiveList.length+")");
          $('#ytkURLField').val(userOptions.ytkUrl);
          $('#dataProviderField').val(userOptions.dataprovider);
          callback(null, true);
        }
        else callback(err, null);
      });
    }else{
      callback(messages.configNotFound, null);
    }
  });
}

/**
 * Options Page:
 *
 */
function optionsPageHandler(){
  fillSelect($('#ytkURLSelect'), config.ytkUrls);
  fillSelect($('#dataProviderSelect'), config.dataprovider);
  if($('#ytkURLField').val() === ""){
     $('#ytkURLField').val(config.ytkUrls[0]);
  }
  if($('#dataProviderField').val() === ""){
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
  if (ytkUrl!==null && ytkUrl!==""){
    if(ytkUrl.lastIndexOf("/") === (ytkUrl.length-1)) {
      ytkUrl=ytkUrl.slice(0,ytkUrl.length-1);
      $('#ytkURLField').val(ytkUrl);
    }
  }
  var twapperlyzerStore = new Lawnchair('twapperlyzerStore', function(){});

  twapperlyzerStore.save(new twapperlyzerClientOnlineOptions(ytkUrl, dataprovider));
  twapperlyzerStore.save(new twapperlyzerClientOfflineOptions());
  
  loadUserConfig(function(err,res){
    if(err===null){
      $.mobile.changePage("#listArchivesPage",{transition: "slide",reverse: true});
      appendNewURLsToConfig([ytkUrl,dataprovider], [config.ytkUrls,config.dataprovider]);

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

function sortArchiveList(orderType){
  generateArchiveList($('#archivesList'), twapperSession.archiveList,twapperSession.localArchiveList, orderType );
}
 /**
 * Empty the #archivesList and fill it with the content of 
 * archiveList 
 *
 */
function listArchivesPageHandler(event){
  generateArchiveList($('#archivesList'), twapperSession.archiveList,twapperSession.localArchiveList, "-" );//your twapperkeeper archive id
}




function generateArchiveList(parent, archiveList,localArchiveList, orderType){
  parent.empty();

  if(parent.attr("orderType") == orderType){
    archiveList.reverse();
    localArchiveList.reverse();
  }else{
    switch(orderType){
      case "alphabetic" :
        archiveList.sort(compareKeywords);
        localArchiveList.sort(compareKeywords);
        parent.attr("orderType", orderType);
      break;
      case "size" :
        archiveList.sort(compareSize);
        localArchiveList.sort(compareSize);
        parent.attr("orderType", orderType);
      break;
      case "chronologic" :
        archiveList.sort(compareChronologic);
        localArchiveList.sort(compareChronologic);
        parent.attr("orderType", orderType);
      break;
      
      default:
        archiveList.sort(compareKeywords);
        localArchiveList.sort(compareChronologic);
        parent.attr("orderType", "alphabetic");
    }
  }

  var archiveListData = {};
  if(archiveList.length > 0 ){

    archiveListData.entry = archiveList;
    var remoteDivider = '<li data-role="list-divider">Archives from YourTwapperkeeper</li> ';
     parent.append(remoteDivider);
    parent.append(twapperSession.templates.archiveListElements(archiveListData));
    var hash = archiveList[0].id.split("-")[0];
    localArchiveList = _.reject(localArchiveList, function(archive){
      return archive.id.split("-")[0] == hash;
    }); 
  }
  if(localArchiveList.length >0){
  var localDivider = '<li data-role="list-divider">Already analysed archives</li> ';
    parent.append(localDivider);
    archiveListData.entry = localArchiveList;
    parent.append(twapperSession.templates.archiveListElements(archiveListData));
  }
  parent.listview('refresh');
  
  function compareKeywords(a, b) {
    function cutFirstChar(keyword){
      if(keyword.charAt(0) == "#" || keyword.charAt(0) == "@"){
        keyword = keyword.substring(1,keyword.length);
      }
      return keyword;
    }
    
    var elementA = cutFirstChar(a.keyword.toLowerCase());
    var elementB = cutFirstChar(b.keyword.toLowerCase());

    if (elementA < elementB) {return -1;}
    if (elementA > elementB) {return 1;}
    return 0;


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
  
  createArchivePage($(this).attr("href").split("#page-")[1], function(page){$.mobile.changePage(page);});
}

function createArchivePage(requestedLaid, callback){
  var hashId = requestedLaid.split("-");
  
  twapperSession.laid = requestedLaid;
  if(twapperSession.lastLaid != twapperSession.laid){
    mydb.openDoc( requestedLaid,  
      {success: function(data) {
        console.log("data",data);
          setData(data, callback);
          //Check if the updated message count from the list has more messages that the one analysed in the archive.
          if (twapperSession.ytkUrlHash !== null){
            var listEntry = _.detect(twapperSession.archiveList, function(le){return le.id == requestedLaid;});
            if(twapperSession.ytkUrlHash == hashId[0] && !_.isUndefined(listEntry)){
              if(data.messagesSoFar != listEntry.count){
                var url = "docID="+requestedLaid+"&l="+listEntry.count;
                //If so do the update
                twapperlyzerApi.updateArchive(url,config.thisdb, userOptions.dataprovider, function(err, result){
                  if(err!==null){
                    popErrorMessage("Could not update this archive: "+err.msg, 2000);
                  }else{
                    popSimpleMessage("Updating this archive: "+result, 2000);
                  }
                });
              }
            }
          }
          
          twapperSession.lastLaid = twapperSession.laid;
        },
        error: function(){
        //lets check if the ytkURL is fitting to the one that is set up
          if(hashId[0] !== twapperSession.ytkUrlHash){
            console.log("attempted to call page with wrong laid");
            callback("#listArchivesPage");
          }
          //Doc does not exist lets ask for the username and  create one
          else{
            var id = {};
            id.value = hashId[1];
            id.name = "id";
            var l = {};
            l.value = "";
            l.name = "l";
            twapperSession.selectedArchive = createSelectedArchiveObject([id,l]);

            var timeForAnalyse = new Date();
            timeForAnalyse.setTime(timeForAnalyse.getTime() + (twapperSession.selectedArchive.entry.count*200));
            createDialog("Analysing this archive will take about "+jQuery.timeago(timeForAnalyse)+".<br> Twapperlyzer will send a tweet when it is done, do you want to be mentioned? Than enter your twitter username", function(username){
              if(username !== false ){
                if(username.length >14){
                  popErrorMessage("Your Username ist too lang you won't get mentioned: ", 2000);
                  username = "";
                }
                $.mobile.showPageLoadingMsg();

                twapperlyzerApi.analyseArchive(twapperSession.selectedArchive.url, config.thisdb, userOptions.dataprovider, username, function(err, result){
                  if(err!==null){
                    popErrorMessage("Could not analyse this archive: "+err.msg, 2000);
                  }else{
                    mydb.openDoc(result.id,  
                      {success: function(data) {
                        setData(data,callback);
                        twapperSession.lastLaid = twapperSession.laid;
                        }
                      });
                  }
                });
                
              }
            });
          }
        }
      }
    );
  }else{
    callback("#page-"+twapperSession.laid);
  }
}


function setData(data,callback){
  if($('#page-'+data._id).length === 0){
    twapperSession.archives[data._id] = data;
    var laid = data._id;
    
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
    
    //Fade out the progress bar when the doc is analysed 
    if(data.status === "done"){
      $("#analyseProgress-"+data._id).remove();
    } 

    //$('#archiveWidgetsList-'+data._id).delegate('a', 'click', archiveWidgetsListHandler);
    // Map Page
    Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    var mapPage = {
      "pageId":"mapPage-"+laid, 
      "pageHeader":"Map", 
      "containerId":"mapContainer-"+laid,
      "style" : ""
      };
    $.mobile.pageContainer.append(twapperSession.templates.page(mapPage));
    $("#mapPage-"+laid).page();
  
    $("#mapPage-"+laid).live('pagebeforeshow', function(){
      if(_.isUndefined(twapperSession.archives[laid].geo)){
        getTotal("geo",laid,function(err, res){
          if (err) console.log("Error while fetching GeoData",err);
          if(res) {
            twapperSession.archives[laid].geo = res
            setUpGeoMarkerForArchive(twapperSession.archives[laid].geo,'mapContainer-'+laid);
          }
        });
      }else{
        setUpGeoMarkerForArchive(twapperSession.archives[laid].geo,'mapContainer-'+laid);
      }
    });
      
  
    //show Messages Page
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
    $("#showMsgsPage-"+laid).page();
    
    $("#moreMsgsButton-"+laid).click(loadMessagesFromServer);
    $("#showMsgsPage-"+laid).live('pagebeforeshow', function(){
      loadMessagesFromServer();
    });
    
    //archiveMentionsPage
    Handlebars.registerPartial('content', twapperSession.templates.blockListContent);
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    var mentionsPage = {
    "pageId":"archiveMentionsPage-"+laid, 
    "pageHeader":"Mentions in Archive", 
    "blockId":"archiveMentionsContainer-"+laid,
    "style":"margin: 0px auto; width: 320px; height: 400px; border: none;", 
    "listHeader":"Total Mentions in this Archive: ",
    "listId": "mentionsListId-"+laid,
    "footerText":""
    };
    $.mobile.pageContainer.append(twapperSession.templates.page(mentionsPage));
    $("archiveMentionsPage-"+laid).page();
    
    $("#archiveMentionsPage-"+laid).live('pagebeforeshow', function(){
      if(_.isUndefined(twapperSession.archives[laid].mentions)){
        getTotal("mentions",laid,function(err, res){
          if (err) console.log("Error while fetching mentions",err);
          if(res) {
            twapperSession.archives[laid].mentions = res;
            $("#archiveMentionsContainer-"+laid).jQCloud(_.first(twapperSession.archives[laid].mentions, userOptions.showLimit));
            var mentionsListData = {};
            mentionsListData.entry = twapperSession.archives[laid].mentions;
            $("#mentionsListId-"+laid).append(twapperSession.templates.simpleList(mentionsListData));
            $("#mentionsListId-"+laid).listview('refresh');
          }
        });
      }
    });
    
    //archiveHashtagsPage
    Handlebars.registerPartial('content', twapperSession.templates.blockListContent);
    Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
    var hashtagsPage = {
    "pageId":"archiveHashtagsPage-"+laid, 
    "pageHeader":"Hastags in the Archive", 
    "blockId":"archiveHashtagsContainer-"+laid,
    "style":"margin: 0px auto; width: 320px; height: 400px; border: none;", 
    "listHeader":"Total Hashtags in this Archive: ",
    "listId": "hashtagListId-"+laid,
    "footerText":""
    };
    $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));
    $("#archiveHashtagsPage-"+laid).page();
    $("#archiveHashtagsPage-"+laid).live('pagebeforeshow', function(){
      if(_.isUndefined(twapperSession.archives[laid].hashtags)){
        getTotal("hashtags",laid,function(err, res){
          if (err) console.log("Error while fetching hashtags",err);
          if(res) {
            twapperSession.archives[laid].hashtags = res;
            $("#archiveHashtagsContainer-"+laid).jQCloud(_.first(twapperSession.archives[laid].hashtags, userOptions.showLimit));
            var hashtagListData = {};
            hashtagListData.entry = twapperSession.archives[laid].hashtags;
            $("#hashtagListId-"+laid).append(twapperSession.templates.simpleList(hashtagListData));
            $("#hashtagListId-"+laid).listview('refresh');
          }
        });
      }
    });
    
    //archiveMembersPage
    Handlebars.registerPartial('content', twapperSession.templates.listContent);
    Handlebars.registerPartial('footer', twapperSession.templates.navbarMemberFooter);
    var membersPage = {
    "pageId":"archiveMembersPage-"+laid, 
    "pageHeader":"Members", 
    "listId":"archiveMembersContainer-"+laid,
    "style":""
    };
    $.mobile.pageContainer.append(twapperSession.templates.page(membersPage));
    $("#archiveMembersPage-"+laid).page();
    
    //archiveLinksPage
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
    $("#archiveLinksPage-"+laid).page();
    $("#archiveLinksPage-"+laid).live('pagebeforeshow', function(){
      if(_.isUndefined(twapperSession.archives[laid].urls)){
        getTotal("urls",laid,function(err, res){
          if (err) console.log("Error while fetching urls",err);
          if(res) {
            twapperSession.archives[laid].urls = res;
            addUrlChart("archiveLinksContainer-"+laid, twapperSession.archives[laid].urls, userOptions.showLimit);
          }
        });
      }
    });
    
    //END off overfilling the DOM
  }else{
    console.log("Update....");//FIXME
    var tmp = twapperSession.archives[data._id].currentMsg ;
    twapperSession.archives[data._id] = data; 
    twapperSession.archives[data._id].currentMsg = tmp;
  }
  
  $.mobile.hidePageLoadingMsg();
  callback("#page-"+data._id);
}

/**
 * Show Archive Page:
 *
 */

function getRTInfo(){
  var laid = getLaidFromPageName();
  var container = $("#archiveMembersContainer-"+laid);
  var currentArchive = twapperSession.archives[laid];
  
  var first10p = Math.floor((10*(currentArchive.rtUser.length/100)));

  container.empty();
  var listData = {};
  listData.entry = _.first(currentArchive.rtUser, first10p);
  container.append(twapperSession.templates.simpleList(listData));
  container.listview('refresh');
}

function getQuestionerInfo(){
  var laid = getLaidFromPageName();
  var container = $("#archiveMembersContainer-"+laid);
  var currentArchive = twapperSession.archives[laid];
  
  var first10p = Math.floor((10*(currentArchive.questioner.length/100)));

  container.empty();
  var listData = {};
  listData.entry = _.first(currentArchive.questioner, first10p);
  container.append(twapperSession.templates.simpleList(listData));
  container.listview('refresh');
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
  if(currentArchive.tweets.length !== 0 ){
    
    lastID = currentArchive.tweets[currentArchive.tweets.length-1].id;
  }
  if(currentArchive.currentMsg <= currentArchive.messagesSoFar){
    twapperlyzerApi.getMsgs(lastID,userOptions.addMsgVal, userOptions.ytkUrl, currentArchive.archive_info.id,userOptions.dataprovider, function(response){
      if(currentArchive.tweets.length !== 0 ){
        response.shift();
      }
      currentArchive.tweets = currentArchive.tweets.concat(response);
      
      var msgList = $('#msgList-'+laid);
      for(currentArchive.currentMsg; currentArchive.currentMsg<currentArchive.tweets.length; currentArchive.currentMsg++){
        var entry = currentArchive.tweets[currentArchive.currentMsg];
        entry.msgid = currentArchive.currentMsg;
        entry.laid = laid;
        if(entry.geo_coordinates_0 === "0"){
          entry.geo_coordinates_0 = false;
        }
        msgList.append(twapperSession.templates.msgEntryTemplate(entry));
      }
      
      msgList.listview('refresh');
    });
  }
}

/**
 *Copy the laid from the address bar and return it
 */
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
  res = {};
  var laid = twapperSession.ytkUrlHash+"-"+array[0].value;
  res.entry = _.detect(twapperSession.archiveList, function(le)
    {return le.id === laid;});

  res.isSearch = false;
  url = "ytkUrl="+userOptions.ytkUrl;

  _.each(array, function(element){
      //every fild that is set will get in the url
      if(element.value !== ""){
        url += "&"+element.name+"="+element.value;
        if(element.value !== "o"){
          res.isSearch = true;
        }
      }
      if(element.name === "nort" && element.value !== null){
         url += "&"+element.name+"="+element.value;
         res.isSearch = true;
      }
      //and the limit even if it is not set
      if(element.name === "l" && element.value === ""){
        url += "&l="+ res.entry.count;
      }
    });
  res.url = url;
  return res;
}

function getTotal(view,laid, callback){
  mydb.list("twapperlyzer/aggrigate",view, {
      success: function(data) {
        callback(null,data);
      },
      error: function(status) {
          callback(status,null);
      },
      "startkey":[laid,0],
      "endkey":[laid,{}]
    }
  );
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
