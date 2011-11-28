var $_GET = {};
var map;
var chart;
var chart;
var userOptions = {};
var config;
var messages = {};
var mydb;
var twapperSession = {}; //The temporary variable where all the session data is stored
twapperSession.archiveList = [];
twapperSession.archives = [];
twapperSession.localArchiveList =[];
twapperSession.users = [];
twapperSession.navStore = {};
twapperSession.navStore.step = "";
twapperSession.navStore.time = "total";
twapperSession.navStore.vis = "cloud";

messages.configNotFound = "config not found";
$.mobile.pushStateEnabled = false;

  
$(window).load(function(){ 
  $(document).ready(function() {
    //START HERE
    $('.emoticonized').emoticonize({
        animate: false
    });
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
      //console.log(data.toPage+" comming in.");
      
      //Getting the parameter out
      var params = data.toPage.split("?");
      if(params.length === 2 ){
        data.options.dataUrl = data.toPage;//Whats shown in the locations bar
        data.toPage = params[0] //Where we really going
        $_GET = getQueryParams(params[1]); //the parameter
        //console.log(data.toPage+" without params",$_GET);
      }
      
      //a hack to deal with strange modifications of the urls in links
      //sometimes the domain plus the first page (loadPage in this case)
      //is put in front of the url in the link
     
      data.toPage="#"+data.toPage.split("#")[1];
      //console.log(data.toPage+" now cleaned.");
      
      var reExTarget = /#(\w*)-(\w*)-(\d*)/
      var toPageParts = data.toPage.match(reExTarget);
      var target;
      if(toPageParts === null){ //it is not a standard url with a laid
        target = $(data.toPage); 
        if(target.length === 0){//its not in the DOM
          $.mobile.changePage($('#listArchivesPage'), data.options); //I can't load it so redirect 
        }
      }else{//it is a standard url 
        target = $(data.toPage); 
        if(target.length === 0){//its not in the DOM so I load the laid
          e.preventDefault();
          //console.log("It themes like "+data.toPage+" do not exists.");
          createArchivePage(toPageParts[2]+"-"+toPageParts[3], function(page){
            if(page === '#listArchivesPage'){
              $.mobile.changePage($(page),data.options);
            }else{
              //console.log("URL Routing", page, data.toPage);
              var newTarget = data.toPage;
              if(data.toPage !== page){
                if(data.toPage.indexOf("#page-") !== -1)
                  newTarget = page;
              }
              $.mobile.changePage($(newTarget),data.options);
            }
          });
        }else{ //it is in the DOM 
          //It has parameter but since we stay on the same page no event is triggered, so it have to be handled manually.
          if(params.length === 2 && $.mobile.activePage.attr("id") === data.toPage.substring(1)){
            document.location.hash = "#"+data.options.dataUrl.split("#")[1];
            queryHandler(data.toPage);
          }else{
            console.log($.mobile.activePage.attr("id")," from, nothing to do just let it path to",data.toPage);
          }
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
  //$('#archivesList').delegate('a', 'click', selectedArchiveByList);

  
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
        'fullHTML' : twapperSession.templates.simpleAlert(html)
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
  //console.log("DB info",info);
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
                if(document.location.hash === ""){
                  simpleDialog.target = "#listArchivesPage";
                  createAlert(simpleDialog);
                }else{
                  simpleDialog.target = document.location.hash;
                  createAlert(simpleDialog);
                  $.mobile.changePage(document.location.hash,{ transition: "fade"} );
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
            popErrorMessage("Error while loading user config: "+JSON.stringify(err)+". Check you Options",3500);
            console.log("Error while loading user config:",err);
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
          popErrorMessage("Could not load already analysed archives"+JSON.stringify(status), 3000);
          console.log("Could not load already analysed archives", status);
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
                $("#analyseProgress-"+archiveIdThatChanged).fadeOut(800);
                onDone(archiveIdThatChanged);
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
  Handlebars.registerHelper("formatEpochTimeToFuzzy", function(time){
    return jQuery.timeago(new Date(time*1000));//It is in Epoch time, so sec not milisec
  });
  Handlebars.registerHelper("formatEpochTime", function(time){
    return new Date(time*1000);//It is in Epoch time, so sec not milisec
  });
  Handlebars.registerHelper("htmlLinksForText", getHTMLLinksForText);
  Handlebars.registerHelper("formatNumber", formatNumber);
  
  //Compile Templates
  twapperSession.templates = {};
  twapperSession.templates.page = Handlebars.compile( $("#page").html() );
  twapperSession.templates.simpleAlert = Handlebars.compile( $("#simpleAlert").html() );
  
  twapperSession.templates.normalHeader = Handlebars.compile( $("#normalHeader").html() );
  twapperSession.templates.overviewHeader = Handlebars.compile( $("#overviewHeader").html() );
  
  twapperSession.templates.msgEntryTemplate = Handlebars.compile( $("#msgEntryTemplate").html() );
  twapperSession.templates.simpleContent = Handlebars.compile( $("#simpleContent").html() );
  twapperSession.templates.blockListContent = Handlebars.compile( $("#blockListContent").html() );
  twapperSession.templates.listContent = Handlebars.compile( $("#listContent").html() );
  twapperSession.templates.archivePageContent = Handlebars.compile( $("#archivePageContent").html() );
  
  twapperSession.templates.widgetListTemplate = Handlebars.compile( $("#widgetListTemplate").html() );
  twapperSession.templates.archiveListElements = Handlebars.compile( $("#archiveListElements").html());
  twapperSession.templates.messageElement = Handlebars.compile( $("#messageElement").html());
  twapperSession.templates.messageElement2 = Handlebars.compile( $("#messageElement2").html());
  
  twapperSession.templates.QuestionsWithAnswers = Handlebars.compile( $("#QuestionsWithAnswers").html());
  twapperSession.templates.DiscussionList = Handlebars.compile( $("#DiscussionList").html());
  
  twapperSession.templates.simpleFooter = Handlebars.compile( $("#simpleFooter").html() );
  twapperSession.templates.buttonFooter = Handlebars.compile( $("#buttonFooter").html() );
  twapperSession.templates.buttonLinkFooter = Handlebars.compile( $("#buttonLinkFooter").html() );
  
  twapperSession.templates.navbarArchiveListFooter = Handlebars.compile( $("#navbarArchiveListFooter").html() );
  twapperSession.templates.navbarMemberFooter = Handlebars.compile( $("#navbarMemberFooter").html() );
  twapperSession.templates.navbarQuestionsFooter = Handlebars.compile( $("#navbarQuestionsFooter").html() );
  twapperSession.templates.navbarSingleButtonFooter = Handlebars.compile( $("#navbarSingleButtonFooter").html() );
  twapperSession.templates.navbarVisulasiationFooter = Handlebars.compile( $("#navbarVisulasiationFooter").html() );
  
  //Elements
  twapperSession.templates.simpleList = Handlebars.compile( $("#simpleList").html() );
  
  
  
  Handlebars.registerPartial('header', $("#optionsHeader").html());
  Handlebars.registerPartial('content', $("#optionsContent").html());
  Handlebars.registerPartial('footer', twapperSession.templates.navbarSingleButtonFooter);

  //Options Page
  var optionsPage = {
    "pageId":"optionsPage", 
    "pageHeader":"Options",
    "target": "#aboutPage",
    "footerButtonText":"About twapperlyzer"};
    
  $.mobile.pageContainer.append(twapperSession.templates.page(optionsPage));
  $('#date33').scroller({ preset: 'datetime',theme: 'ios' });
  $('#optionsPage').page();

  //Archives List

  Handlebars.registerPartial('header', twapperSession.templates.normalHeader);
  Handlebars.registerPartial('content', twapperSession.templates.listContent);
  Handlebars.registerPartial('footer',   twapperSession.templates.navbarArchiveListFooter);
  
  var archivesPage = {
    "pageId":"listArchivesPage", 
    "pageHeader":"Archives", 
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

          //$('#listRemoteArchivesButton .ui-btn-text').text("List archives from YourTwapperkeeper ("+twapperSession.archiveList.length+")");
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
 * DEPRECATED since new dynamic page injection
 *
 */
function selectedArchiveByList(event) {
  event.preventDefault();
  event.stopPropagation();
  
  var target = $(this).attr("href");
  var targetParts = target.split("#page-");
  console.log("selectedArchiveByList",target, $(target));
  if( $(target).length === 0){
    console.log("WTF");
    createArchivePage(targetParts[1], function(page){
      console.log("going to ",page);
      $.mobile.changePage(page);
      });
    
  }else{
    twapperSession.laid = targetParts[1];
    //console.log("twapperSession.laid changes to", twapperSession.laid);
    $.mobile.changePage(target);
  }
}

function createArchivePage(requestedLaid, callback){
  var hashId = requestedLaid.split("-");
  
  twapperSession.laid = requestedLaid;
  //console.log("createArchivePage", requestedLaid, callback);
  if(twapperSession.lastLaid != twapperSession.laid){
    mydb.openDoc( requestedLaid,  
      {success: function(data) {
        //console.log("data",data);
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
                    popErrorMessage("Could not update this archive: "+JSON.stringify(err), 2000);
                    console.log("Could not update this archive:", err);
                  }else{
                    popSimpleMessage("Updating this archive: "+result.id, 2000);
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
            timeForAnalyse.setTime(timeForAnalyse.getTime() + (twapperSession.selectedArchive.entry.count*350));
            createDialog("Analysing this archive will take about "+jQuery.timeago(timeForAnalyse)+".<br> Twapperlyzer will send a tweet when it is done, do you want to be mentioned? Than enter your twitter username", function(username){
              if(username !== false ){
                if(username.length >14){
                  popErrorMessage("Your Username is too long you won't get mentioned: ", 2000);
                  username = "";
                }
                $.mobile.showPageLoadingMsg();

                twapperlyzerApi.analyseArchive(twapperSession.selectedArchive.url, config.thisdb, userOptions.dataprovider, username, function(err, result){
                  if(err!==null){
                    popErrorMessage("Could not analyse this archive: "+err.msg, 2000);
                    console.log("Could not analyse this archive",err);
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

function changeTargets(){

  console.log("DEBUG");
}

function setData(data,callback){
  //console.log("looking for "+'#page-'+data._id, callback);
  
  if($('#page-'+data._id).length === 0){
    twapperSession.archives[data._id] = data;
    var laid = data._id;
    twapperSession.archives[laid].timeStats = {"min":0,"max":{}};
    
  //Main Archive Page
  Handlebars.registerPartial('content', twapperSession.templates.archivePageContent);
  Handlebars.registerPartial('widgetList', twapperSession.templates.widgetListTemplate);
  
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
  
  var archivePageData = {
    "pageId":"page-"+data._id, 
    "pageHeader": "Archive: "+data.archive_info.keyword,
    "target": "javascript:changeTargets()",
    //"footerButtonText":"please ignore me",
    "archive": data
    };
  $.mobile.pageContainer.append(twapperSession.templates.page(archivePageData));
  twapperSession.archives[data._id].currentMsg = 0;
  $('#page-'+data._id).page();
  
  //remove out the progress bar when the doc is analysed 
  if(data.status === "done"){
    onDone(laid);
  } 
  
  

  //archiveGrowthPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
  var growthPage = {
    "pageId":"archiveGrowthPage-"+laid, 
    "laid":laid,
    "pageHeader":"Growth", 
    "containerId":"archiveGrowthContainer-"+laid,
    "style":"height:"+Number($(window).height()) - Math.round(5*(Number($(window).height())/100))+"px;",
    "footerText":""
    };
  $.mobile.pageContainer.append(twapperSession.templates.page(growthPage));
  $("#archiveGrowthPage-"+laid).page();
  $("#archiveGrowthPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    queryHandler ("#archiveGrowthPage-"+laid);
  });
  // Map Page
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
  var mapPage = {
    "pageId":"mapPage-"+laid, 
    "laid":laid,
    "pageHeader":"Map", 
    "containerId":"mapContainer-"+laid,
    "style" : ""
    };
  $.mobile.pageContainer.append(twapperSession.templates.page(mapPage));
  $("#mapPage-"+laid).page();

  $("#mapPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    if(_.isUndefined(twapperSession.archives[laid].geo)){
      getAggregatedData("geo",laid,$_GET.from, $_GET.to,function(err, res){
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
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.listContent);
  Handlebars.registerPartial('footer', twapperSession.templates.buttonFooter);
  var showMsgsPage = {
    "pageId":"showMsgsPage-"+laid, 
    "pageHeader":"Messages", 
    "laid":laid,
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
  
  //archiveDiscussionsPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
  
  var discussionsPage = {
  "pageId":"archiveDiscussionsPage-"+laid, 
  "laid":laid,
  "pageHeader":"Discussions", 
  "containerId":"archiveDiscussionsContainer-"+laid,
  "style":""
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(discussionsPage));
  $("#archiveDiscussionsPage-"+laid).page();

  $("#archiveDiscussionsPage-"+laid).live('pagebeforeshow', function(){
    if(_.isUndefined(twapperSession.archives[laid].discussions)){
      $.getJSON(showUrl("discussions",laid),{"type":"discussions"}, function(data) {//This has to be done once and will not be overwritten
        twapperSession.archives[laid].discussions = data;
        $("#archiveDiscussionsPage-"+laid).find( "h1" ).text(twapperSession.archives[laid].discussions.length + " Discussions");
        _.each(twapperSession.archives[laid].discussions, function(discussion){
          Handlebars.registerPartial('message', twapperSession.templates.messageElement2);
          $("#archiveDiscussionsContainer-"+laid).append(twapperSession.templates.DiscussionList(discussion));
        });

      });
    }
  });
  
  //archiveMentionsPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarVisulasiationFooter);
  var mentionsPage = {
  "pageId":"archiveMentionsPage-"+laid, 
  "laid":laid,
  "pageHeader":"Mentions in Archive"
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(mentionsPage));
  $("archiveMentionsPage-"+laid).page();
  
  $("#archiveMentionsPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    
    handleNavbar($("#archiveMentionsPage-"+laid));
   
    if(_.isUndefined(twapperSession.archives[laid].mentions)){
      twapperSession.archives[laid].mentions = {};
    }
    queryHandler ("#archiveMentionsPage-"+laid);
  });
  
  //archiveHashtagsPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarVisulasiationFooter);
  var hashtagsPage = {
  "pageId":"archiveHashtagsPage-"+laid, 
  "laid":laid,
  "pageHeader":"Hashtags in the Archive"
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));

  $("#archiveHashtagsPage-"+laid).page();
  
  $("#archiveHashtagsPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    
    handleNavbar($("#archiveHashtagsPage-"+laid));

    if(_.isUndefined(twapperSession.archives[laid].hashtags)){
      twapperSession.archives[laid].hashtags =  {};
    }
    queryHandler ("#archiveHashtagsPage-"+laid);
  });
  
  //archiveKeywordsPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarVisulasiationFooter);
  var hashtagsPage = {
  "pageId":"archiveKeywordsPage-"+laid, 
  "laid":laid,
  "pageHeader":"Keywords in the Archive"
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));

  $("#archiveKeywordsPage-"+laid).page();
  
  $("#archiveKeywordsPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    handleNavbar($("#archiveKeywordsPage-"+laid));

    
    if(_.isUndefined(twapperSession.archives[laid].keywords)){
      twapperSession.archives[laid].keywords =  {};
    }
    queryHandler ("#archiveKeywordsPage-"+laid);
  });
  
  //archiveMembersPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarVisulasiationFooter);
  var hashtagsPage = {
  "pageId":"archiveMembersPage-"+laid, 
  "laid":laid,
  "pageHeader":"Members in the Archive"
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));

  $("#archiveMembersPage-"+laid).page();
  
  $("#archiveMembersPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    handleNavbar($("#archiveMembersPage-"+laid));
    
    if(_.isUndefined(twapperSession.archives[laid].member)){
      twapperSession.archives[laid].member =  {};
    }
    queryHandler ("#archiveMembersPage-"+laid);
  });
  
  //archiveRetweeterPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarVisulasiationFooter);
  var hashtagsPage = {
  "pageId":"archiveRetweeterPage-"+laid, 
  "laid":laid,
  "pageHeader":"Retweeter"
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(hashtagsPage));

  $("#archiveRetweeterPage-"+laid).page();
  
  $("#archiveRetweeterPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    twapperSession.navStore = resetNavStore(twapperSession.navStore);
    handleNavbar($("#archiveRetweeterPage-"+laid));
    
    if(_.isUndefined(twapperSession.archives[laid].rtUser)){
      twapperSession.archives[laid].rtUser =  {};
    }
    queryHandler ("#archiveRetweeterPage-"+laid);
  });
  
  
  //archiveLinksPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.simpleFooter);
  var linksPage = {
  "pageId":"archiveLinksPage-"+laid, 
  "laid":laid,
  "pageHeader":"Links in the Archive", 
  "containerId":"archiveLinksContainer-"+laid,
  "style":"height:"+(Number($(document).height())-100)+"px;",
  "footerText":""
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(linksPage));
  $("#archiveLinksPage-"+laid).page();
  $("#archiveLinksPage-"+laid).live('pagebeforeshow', function(){
    setDefaultGET();
    if(_.isUndefined(twapperSession.archives[laid].urls)){
      getAggregatedData("urls",laid,$_GET.from, $_GET.to,function(err, res){
        if (err) console.log("Error while fetching urls",err);
        if(res) {
          twapperSession.archives[laid].urls = res;
          addUrlChart("archiveLinksContainer-"+laid, twapperSession.archives[laid].urls, userOptions.showLimit);
        }
      });
    }
  });
  //archiveQuestionsPage
  Handlebars.registerPartial('header', twapperSession.templates.overviewHeader);
  Handlebars.registerPartial('content', twapperSession.templates.simpleContent);
  Handlebars.registerPartial('footer', twapperSession.templates.navbarQuestionsFooter);
  
  var questionsPage = {
  "pageId":"archiveQuestionsPage-"+laid, 
  "laid":laid,
  "pageHeader":"Questions", 
  "containerId":"archiveQuestionsContainer-"+laid,
  "style":""
  };
  $.mobile.pageContainer.append(twapperSession.templates.page(questionsPage));
  $("#archiveQuestionsPage-"+laid).page();

  $("#archiveQuestionsPage-"+laid).live('pagebeforeshow', function(){
    if(_.isUndefined(twapperSession.archives[laid].questions)){
      $.getJSON(showUrl("questions",laid),{"type":"stats"}, function(data) {//This has to be done once and will not be overwritten
        twapperSession.archives[laid].questions = {"stats":data};
        $("#archiveQuestionsPage-"+laid).find( "h1" ).text(twapperSession.archives[laid].questions.stats.total+" Questions");
        var footer = $("#archiveQuestionsPage-"+laid).find( ":jqmData(role=navbar) .ui-btn-text" );
        $(footer[0]).text(twapperSession.archives[laid].questions.stats.goodAnswered+" Good Answered");
        $(footer[1]).text(twapperSession.archives[laid].questions.stats.allAnswered+" All Answered");
        $(footer[2]).text(twapperSession.archives[laid].questions.stats.unanswered+" Unanswered");
        $(footer[3]).text(twapperSession.archives[laid].questions.stats.responder+" Responder");
        $(footer[4]).text(twapperSession.archives[laid].questions.stats.questioner+" Questioner");
        
        queryHandler ("#archiveQuestionsPage-"+laid);
      });
    }
  });
  $.mobile.hidePageLoadingMsg();
  callback("#page-"+data._id);
  
  function setDefaultGET(){

    if(_.isUndefined($_GET.to) && _.isUndefined($_GET.from)){
      
      $_GET.from = twapperSession.archives[laid].timeStats.min;
      $_GET.to = twapperSession.archives[laid].timeStats.max;
    }
  }
  
  function handleNavbar(page){
    if($_GET.from == twapperSession.archives[laid].timeStats.min && 
        $_GET.to == twapperSession.archives[laid].timeStats.max)
      {
      var navbars = page.find( ":jqmData(role=navbar)" );
      $(navbars[0]).hide();
    }
  }
    

    
    //END off overfilling the DOM
  }else{
    console.log("Update....",data);//FIXME
    var tmp = twapperSession.archives[data._id].currentMsg ;
    twapperSession.archives[data._id] = data; 
    twapperSession.archives[data._id].currentMsg = tmp;
      $.mobile.hidePageLoadingMsg();
  callback("#page-"+data._id);
  }
  

}


function onDone(laid){

$("#dynamicArchieInfo-"+laid).empty();
$("#analyseProgress-"+laid).remove();
mydb.view("twapperlyzer/timeStats", {
    success: function(data) {
      if(data.rows.length>0){
        twapperSession.archives[laid].timeStats = data.rows[0].value;
        getDynamicArchieInfo();
      }
    },
    "key":laid,
    error: function(status) {
        popErrorMessage("Could not load the time Statistics"+JSON.stringify(status), 3000);
        console.log("Could not load the time Statistics", status);
    }
});

function getDynamicArchieInfo(){
  //Set the retweet count for header info
  mydb.view("twapperlyzer/rt",
    {
      success: function(rtcount) {
        rtcount = rtcount.rows[0].value;
        tweetcount = Number($("#currentArchiveCount-"+laid).text());
        var line = "<p>"+rtcount+" Retweets ("+Math.round(rtcount/(tweetcount/100))+"%)</p>";
        $("#dynamicArchieInfo-"+laid).append($(line).hide().fadeIn(1000));
        //$('#currentArchiveCount-'+laid).text(msg+", Retweets = "+data.rows[0].value+" ("+Math.round(data.rows[0].value/(msg/100))+"%)");
      },
      "startkey":[laid,0],
      "endkey":[laid,{}],
      error: function(status) {
          popErrorMessage("Could not load the retweet Count"+JSON.stringify(status), 3000);
          console.log("Could not load the retweet Count", status);
      }
    });
  //Sentiment for header info
  mydb.view("twapperlyzer/sentiment",
  {
    success: function(sentiment) {
      sentiment = sentiment.rows[0].value;
      tweetcount = Number($("#currentArchiveCount-"+laid).text());
      var line = '<p class="emoticonized">:-) '+Math.round(sentiment.positive/(tweetcount/100))+'% :-| ' + Math.round(sentiment.neutral/(tweetcount/100)) + '% :-( ' +Math.round(sentiment.negative/(tweetcount/100)) + '% </p>';
      $("#dynamicArchieInfo-"+laid).append($(line).hide().fadeIn(1510));
      //console.log("sentiment", , );
      $('.emoticonized').emoticonize({
        animate: false
      });
    },
    "startkey":[laid, 0],
    "endkey":[laid, {}],
    error: function(status) {
        popErrorMessage("Could not load the user info for "+user.text+". "+JSON.stringify(status), 3000);
        console.log("Could not load the user info for "+user.text ,status);
    }
  });

  //Gender for header info
    mydb.list("twapperlyzer/gender","archiveUser", {
        success: function(gender) {
          var total = gender.male + gender.female + gender.neutral;
          var line = '<p>'+total+' Members, ♀'+Math.round(gender.female/(total/100))+'% ♂'+Math.round(gender.male/(total/100))+'% </p>';
          $("#dynamicArchieInfo-"+laid).append($(line).hide().fadeIn(1520));
        },
        error: function(status) {
            callback(status,null);
        },
        "key":laid
      }
    );
    
    //Language for header info

    mydb.list("twapperlyzer/aggregateMin2","language", {
        success: function(data) {
          var line = "<p>";
          if(data.length === 1){
            line +="All messages are in "+capitalize(data[0].text);
          }else if(data.length > 0)
            line += "Most messages are in "+capitalize(data[0].text);
          if(data.length > 1)
            line += " and some in "+capitalize(data[1].text);
          line +="</p>";
          
          $("#dynamicArchieInfo-"+laid).append($(line).hide().fadeIn(1600));
        },
        error: function(status) {
            callback(status,null);
        },
        "startkey":[laid, 0],
        "endkey":[laid,{}]
      }
    );
  }
  
}

function removeParameter(url, parameter)
{
  var urlparts= url.split('?');

  if (urlparts.length>=2)
  {
      var urlBase=urlparts.shift(); //get first part, and remove from array
      var queryString=urlparts.join("?"); //join it back up

      var prefix = encodeURIComponent(parameter)+'=';
      var pars = queryString.split(/[&;]/g);
      for (var i= pars.length; i-->0;)               //reverse iteration as may be destructive
          if (pars[i].lastIndexOf(prefix, 0)!==-1)   //idiom for string.startsWith
              pars.splice(i, 1);
      url = urlBase+'?'+pars.join('&');
  }
  return url;
}

function resetNavStore(navStore){
  navStore.step = "";
  navStore.time = "total";
  navStore.vis = "cloud";
  return navStore;
}

function queryHandler (page){
  
  pageParts = page.split("-");
  
  //console.log("WHAT now", page, pageParts, $_GET);
  switch(pageParts[0]){
    case "#archiveGrowthPage" :
    
        if(_.isUndefined(twapperSession.archives[twapperSession.laid].growth)){
          grandTotal(twapperSession.laid, function(err, res){
            
            if(res.length === 0){
              $.mobile.changePage("#page-"+twapperSession.laid, {reverse: true});
              popErrorMessage("You just hit a bug this analysis has to be deleted and redone",3000);
            }else{
              twapperSession.archives[twapperSession.laid].growth = res;
              showGrowthChart(twapperSession.laid, twapperSession.archives[twapperSession.laid].growth);
            }
          });
        }else{
          showGrowthChart(twapperSession.laid, twapperSession.archives[twapperSession.laid].growth);
        }
    break;
    
    case "#archiveQuestionsPage" :
      if(!_.isUndefined($_GET.type)){
        getType($_GET.type, pageParts[1]+"-"+pageParts[2]);
      }
    break;
    case "#archiveMentionsPage" :
      setParams(page, "mentions", pageParts[1]+"-"+pageParts[2]);
    break;
    case "#archiveHashtagsPage" :
      setParams(page, "hashtags", pageParts[1]+"-"+pageParts[2]);
    break;
    case "#archiveMembersPage" :
      setParams(page, "member", pageParts[1]+"-"+pageParts[2]);
    break;
    case "#archiveRetweeterPage" :
      setParams(page, "rtUser", pageParts[1]+"-"+pageParts[2]);
    break;
    case "#archiveKeywordsPage" :
      setParams(page, "keywords", pageParts[1]+"-"+pageParts[2]);
    break;
    
    default :
      if(!_.isUndefined($_GET)){
        console.log("No action for ", page," $_GET is ", $_GET);
      }
    break;
  }
}

function setParams(page, name, laid){
  $.mobile.showPageLoadingMsg();
  page = $(page);
  var container = getEmptyContainer(page);
  //Case the total for the archive is requested
  if(
     ($_GET.from == twapperSession.archives[laid].timeStats.min &&  
      $_GET.to == twapperSession.archives[laid].timeStats.max)
      ||($_GET.from = 0 && $_GET.to == {})
      )
    {

    if(_.isUndefined(twapperSession.archives[laid][name].total)){
      //console.log("Werte",$_GET.from, $_GET.to, twapperSession.archives[laid].timeStats.min, twapperSession.archives[laid].timeStats.max);
      getAggregatedData(name,laid,twapperSession.archives[laid].timeStats.min,twapperSession.archives[laid].timeStats.max, function(err, res){
        if (err) console.log("Error while fetching "+name,err);
        if(res) {
          //console.log("total",res);
          twapperSession.archives[laid][name].total = res;
          setVis(twapperSession.archives[laid][name].total);
          page.find("h1").text(twapperSession.archives[laid][name].total.length +" "+ page.find("h1").text());
        }
      });
      }else{
        setVis(twapperSession.archives[laid][name].total);
      }
  }else {//All other cases wont be cached
  //console.log("try to get some "+name, $_GET);
    getAggregatedData(name,laid,$_GET.from,$_GET.to, function(err, res){
      if (err) console.log("Error while fetching mentions",err);
      //console.log("It is ", res);
      if(res) {
        if(res !== {}){
          setVis(res);
        }else{
          //console.log("Show no Data msg");
          container.append("<div><h2>No Data for this Period</h2></div>");
        }
      }
    });
  }
  
  function setVis(data){
    $.mobile.hidePageLoadingMsg();
    highlightCloudListButtons(page);
    if($_GET.vis === "cloud"){
       setCloud(data, container, name+"-"+laid);
       
    }
    if($_GET.vis === "list"){
      setSimpleList( data, container, name+"-"+laid);
    }
  }
}

function step(page, step){
  twapperSession.navStore.step = step;
  var changeHash = true;
  page = $(page);
  var buttonText = $(page.find(":jqmData(role=navbar)")[0]).find(".ui-btn-text");
  
  if(step === "previous"){
    var from = Number($_GET.from) - Number(twapperSession.navStore.time);
    var to   = Number($_GET.from);
    
    if(from < twapperSession.archives[twapperSession.laid].timeStats.min){
      changeHash = false;
    }else{
      var nextFrom = from - Number(twapperSession.navStore.time);
      var nextTo   = Number(from);
      setButtonText(buttonText, nextFrom, nextTo);
    }
  }
  if(step === "forward"){
    var from = Number($_GET.from) + Number(twapperSession.navStore.time);
    var to = Number($_GET.to) + Number(twapperSession.navStore.time);
    
    if(from > twapperSession.archives[twapperSession.laid].timeStats.max){
      changeHash = false;
    }else{
      var nextFrom = from + Number(twapperSession.navStore.time);
      var nextTo = to + Number(twapperSession.navStore.time);
      setButtonText(buttonText, nextFrom, nextTo);
    }
  }
  //console.log("Move on",changeHash, to, from, twapperSession.archives[twapperSession.laid].timeStats);
  if(changeHash === true){
      var newHash = removeParameter(document.location.hash, "from");
      newHash = removeParameter(newHash, "to");
      newHash += "&from="+from+"&to="+to;
      
      //The new Header to reflects the time period
      
      var fromMili = from*1000;
      var toMili = to*1000;
      var from = new Date(fromMili);
      var to = new Date(toMili);
      header = page.find("h1").text(from.toLocaleDateString()+" "+from.toLocaleTimeString()+" - "+to.toLocaleDateString()+" "+to.toLocaleTimeString());
      document.location.hash = newHash;
    }
    
}

function timestep(page, time){
  twapperSession.navStore.time = time;
  var pageParts = page.split("-")
  pageO = $(page);
  var navbars = pageO.find( ":jqmData(role=navbar)" );
  //Click on total Button
  if(time === "total"){
    $(navbars[0]).hide();
    //RESET HEADER
    header = pageO.find("h1").text(pageParts[0].replace("Page","").replace("#archive",""));

    var newHash = removeParameter(document.location.hash, "from");
    newHash = removeParameter(newHash, "to");
    //set period to whole Archive
    newHash += "&from="+twapperSession.archives[twapperSession.laid].timeStats.min+"&to="+twapperSession.archives[twapperSession.laid].timeStats.max;
    
    document.location.hash = newHash;

  }
  else {//Switching from times like from hour to Day
    $(navbars[0]).show();
    var from = $_GET.from;
    var to = Number($_GET.from)+Number(time);
    
    setButtonText($(navbars[0]).find(".ui-btn-text"), 
                    Number($_GET.from) - Number(twapperSession.navStore.time), 
                    Number($_GET.from) + Number(twapperSession.navStore.time));
    
    //The new Header to reflects the time period
    var fromMili = from*1000;
    var toMili = to*1000;
    var from = new Date(fromMili);
    var to = new Date(toMili);
    header = pageO.find("h1").text(from.toLocaleDateString()+" "+from.toLocaleTimeString()+" "+to.toLocaleDateString()+" "+to.toLocaleTimeString());

    var newHash = removeParameter(document.location.hash, "from");
    newHash = removeParameter(newHash, "to");
    newHash += "&from="+$_GET.from+"&to="+(Number($_GET.from)+Number(time));
    document.location.hash = newHash;

  }
}

function setButtonText(buttonText, from, to){
  
  if(from < twapperSession.archives[twapperSession.laid].timeStats.min){
    $(buttonText[0]).text("END");
  }else{
     $(buttonText[0]).text("<=");
  }
  
  if(to > twapperSession.archives[twapperSession.laid].timeStats.max){
    $(buttonText[1]).text("END");
  }else{
    $(buttonText[1]).text("=>");
  }
}

function changeView(page, vis){
  twapperSession.navStore.vis = vis;
  pageO = $(page);
  var navbars = pageO.find( ":jqmData(role=navbar)" );
  if(vis === "period")  {

    
    var startDate;
    var endDate;
    
    var startDateF = function(valueText, inst){
      startDate = new Date(valueText);
      setTimeout(showEndDate, 100);
    };
    function showEndDate(){
      $(page+"-endDate").scroller('show');
    }
    var endDateF = function(valueText, inst){
      var endDate = new Date(valueText);
      
      var newHash = removeParameter(document.location.hash, "from");
      newHash = removeParameter(newHash, "to");
   

      newHash += "&from="+Math.round(startDate.getTime()/1000.0)+"&to="+Math.round(endDate.getTime()/1000.0);
            //unhighlight the buttons
      //The Period
      $($(navbars[2]).find("a")[2]).removeClass("ui-btn-active ui-btn-down-a");//
//console.log($($(navbars[2]).find("a")[2]));
      //highlight the buttons
      if($_GET.vis === "cloud"){
        $($(navbars[2]).find("a")[0]).addClass("ui-btn-down-a ui-btn-active");
      }else if($_GET.vis === "list"){
        $($(navbars[2]).find("a")[1]).addClass("ui-btn-down-a ui-btn-active");
      }
      
      //unhighlight the buttons
      //The <= => Navbar
      _.each($(navbars[0]).find("a"), function(button){
        $(button).removeClass("ui-btn-down-a ui-btn-active");
      });
      //The total
      $($(navbars[1]).find("a")[3]).removeClass("ui-btn-down-a ui-btn-active");

      document.location.hash = newHash;
    };


    //console.log("twapperSession.laid",twapperSession.laid);
    $(page+"-startDate").scroller({ preset: 'datetime', setText:"start date", theme:"ios", onSelect:startDateF });
    $(page+"-startDate").scroller('setDate', (new Date(twapperSession.archives[twapperSession.laid].timeStats.min *1000))); 
    $(page+"-endDate").scroller({ preset: 'datetime', setText:"end date", theme:"ios", onSelect:endDateF });
    $(page+"-endDate").scroller('setDate', (new Date(twapperSession.archives[twapperSession.laid].timeStats.max *1000))); 

    $(page+"-startDate").scroller('show');
    
  }else{
    $(navbars[1]).show();
    if(document.location.hash.indexOf("from=") === -1){
      document.location.hash = document.location.hash.split("?")[0]+"?vis="+vis+"&from="+twapperSession.archives[twapperSession.laid].timeStats.min+"&to="+twapperSession.archives[twapperSession.laid].timeStats.max
    }else{
      document.location.hash = removeParameter(document.location.hash, "vis")+"&vis="+vis;
    }
  }
  
}

function highlightCloudListButtons(page){
  var navbars = page.find( ":jqmData(role=navbar)" );
  _.each($(navbars[2]).find("a"), function(button){
    $(button).removeClass("ui-btn-down-a ui-btn-active");
  });

  //highlight the buttons
  if($_GET.vis === "cloud"){
    $($(navbars[2]).find("a")[0]).addClass("ui-btn-down-a ui-btn-active");
  }else if($_GET.vis === "list"){
    $($(navbars[2]).find("a")[1]).addClass("ui-btn-down-a ui-btn-active");
  }
  
}

function getEmptyContainer(page){
  var container = page.find( ":jqmData(role=content)" );
  container.empty();
  return container;
}

function setCloud(data, container, name){
  container.append('<div id="'+name+'" style = "margin: 0px auto; width:'+$(window).width()+'px; height:'+(Number($(window).height()) - Math.round(25*(Number($(window).height())/100)))+'px; border: none;" >');
  $("#"+name).jQCloud(_.first(data, userOptions.showLimit));
}

//Functions for the Question Page
    function getType(type,laid){
      switch(type){
        case "goodAnswered" :
        if(_.isUndefined(twapperSession.archives[laid].questions.goodAnswered)){
          $.getJSON(showUrl("questions",laid),{"type":"goodAnswered"}, function(data) {
            twapperSession.archives[laid].questions.goodAnswered = data;
            setQuestions(twapperSession.archives[laid].questions.goodAnswered,laid);
          });
        }else{
        setQuestions(twapperSession.archives[laid].questions.goodAnswered,laid);
        }
        break;
        case "allAnswered" :
        if(_.isUndefined(twapperSession.archives[laid].questions.allAnswered)){
          $.getJSON(showUrl("questions",laid),{"type":"allAnswered"}, function(data) {
            twapperSession.archives[laid].questions.allAnswered = data;
            setQuestions(twapperSession.archives[laid].questions.allAnswered,laid);
          });
        }else{
        setQuestions(twapperSession.archives[laid].questions.allAnswered,laid);
        }
        break;
        case "unanswered" :
        if(_.isUndefined(twapperSession.archives[laid].questions.unanswered)){
          $.getJSON(showUrl("questions",aid),{"type":"unanswered"}, function(data) {
            twapperSession.archives[laid].questions.unanswered = data;
            setQuestions(twapperSession.archives[laid].questions.unanswered,laid);
          });
        }else{
          setQuestions(twapperSession.archives[laid].questions.unanswered,laid);
        }
        break;
        case "responder" :
        if(_.isUndefined(twapperSession.archives[laid].questions.responder)){
          $.getJSON(showUrl("questions",laid),{"type":"responder"}, function(data) {
            twapperSession.archives[laid].questions.responder = data;
            setSimpleList(twapperSession.archives[laid].questions.responder, $("#archiveQuestionsContainer-"+laid),"responder"+laid);
          });
        }else{
          setSimpleList(twapperSession.archives[laid].questions.responder, $("#archiveQuestionsContainer-"+laid),"responder"+laid);
        }
        break;
        case "questioner" :
        if(_.isUndefined(twapperSession.archives[laid].questions.questioner)){
          $.getJSON(showUrl("questions",laid),{"type":"questioner"}, function(data) {
            twapperSession.archives[laid].questions.questioner = data;
            setSimpleList(twapperSession.archives[laid].questions.questioner, $("#archiveQuestionsContainer-"+laid) ,"questioner"+laid);
          });
        }else{
          setSimpleList(twapperSession.archives[laid].questions.questioner, $("#archiveQuestionsContainer-"+laid),"questioner"+laid);
        }
        break;
        default:
        if(_.isUndefined(twapperSession.archives[laid].questions.goodAnswered)){
          $.getJSON(showUrl("questions",laid),{"type":"goodAnswered"}, function(data) {
            twapperSession.archives[laid].questions.goodAnswered = data;
            setQuestions(twapperSession.archives[laid].questions.goodAnswered,laid);
          });
        }else{
          setQuestions(twapperSession.archives[laid].questions.goodAnswered,laid);
        }
      } 
    }
    
    function setQuestions(questions, laid){
      $("#archiveQuestionsContainer-"+laid).empty();
      _.each(questions, function(question){
        Handlebars.registerPartial('message', twapperSession.templates.messageElement2);
        $("#archiveQuestionsContainer-"+laid).append(twapperSession.templates.QuestionsWithAnswers(question));
      });
    }

    function setSimpleList(data, container ,name){
      container.empty();
      var first10p = Math.floor((10*(data.length/100)));

      var listData = {};
      //listData.entry = _.first(data, Math.min(first10p, userOptions.showLimit));
      listData.entry = data;
      container.empty();
      container.append(twapperSession.templates.listContent({"listId":"simpleList-"+name}));
      container = container.find( "ul" );
      container.append(twapperSession.templates.simpleList(listData));
      container.listview();
    }
/**
 * Show Archive Page:
 *
 */

function showUrl(type,laid){
  var base = mydb.uri+"/_design/twapperlyzer/_show/";
  if(type === "questions")
    return base+"questions/"+laid+"-qu"
  else if(type === "discussions")
    return  base+"discussions/"+laid+"-di"
}

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
        Handlebars.registerPartial('message', twapperSession.templates.messageElement);
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

function getAggregatedData(view,laid,sk,ek, callback){
  //console.log("sk,ek",sk, ek );
  if(!_.isEmpty(ek)){ 
    ek = Number(ek);
  }
  if(_.isUndefined(ek)){ //Hack to fix trage appearance of undefined
    ek = {};
  }
  //console.log("Now sk,ek",sk, ek );
  mydb.list("twapperlyzer/aggregate",view, {
      success: function(data) {
        callback(null,data);
      },
      error: function(status) {
          callback(status,null);
      },
      //"startkey":[laid, 0],
      //"endkey":[laid,{}]
      "startkey":[laid,Number(sk)],
      "endkey":[laid,ek]
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
