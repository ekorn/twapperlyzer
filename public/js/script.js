var apiListArchivesUrl = "";
var apiGetTweetsUrl = "";
var maxMsg=10;
var currentMsg=0;
var addMsgVal=5;
var isNowReady= false;

$(window).load(function(){ $(document).ready(function() {

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
          hashtagFormVars = splitDates(hashtagFormVars);
          selectedArchive = hashtagFormVars;
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
    var id = new Object();
    id.name = "id";
    id.value = $(this).attr("ytkaid");
    selectedArchive = new Array(id);

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
          popErrorMessage("Error: "+jsondata.msg+"Check the yourTwapperKepper URL",2500);
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

  now.updateDowloadSlider = function(par) {
    $('#downloadSlider').val(par).slider("refresh");
    if(par == 100){
      $('#downloadSliderBox').fadeOut(800);
    }
  };
    
  now.clientTest = function(par) {
    console.log("nerv",par);
  };
  
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
    var entryHtml = ['<li><a href="#showArchivePage" ytkaid="'+entry.id+'" ><em>', entry.keyword, '</em>&nbsp;', entry.description,'</a><span class="ui-li-count">'+entry.count+'</span></li>'].join("");
    archivesList.append(entryHtml);
  }
  archivesList.listview('refresh');
}

function setArchiveInfo(data, parent){
parent.empty();
var create_time = new Date(data.create_time*1000);//It is in Epoch time, so sec not milisec
parent.append("<center><h2>"+data.keyword+"</h2><p>"+data.description+"</p><p>"+create_time+"</p><p>total number of tweets = <strong>"+data.count+"</strong></p></center>");
$('#browseMessagesCount').text(data.count);
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
      entryHtml = [entryHtml, "<p><a target=\"_blank\" href=\"http://www.openstreetmap.org/?mlat="+entry.geo_coordinates_0+"&mlon="+entry.geo_coordinates_1+"&zoom=15&layers=M\">geo info:",entry.geo_type," - lat = ", entry.geo_coordinates_0," - long = ",entry.geo_coordinates_1,"</p>"].join("");
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

function splitDates(hashtagFormVars){
  var startDate = hashtagFormVars[1].value.split("-");
  var sy = new Object();
  sy.name = "sy";
  sy.value = startDate[0];
  
  var sm = new Object();
  sm.name = "sm";
  sm.value = startDate[1];
  
  var sd = new Object();
  sd.name = "sd";
  sd.value = startDate[2];
  
  var endDate = hashtagFormVars[2].value.split("-");
  var ed = new Object();
  ed.name = "ed";
  ed.value = endDate[2];
  var em = new Object();
  em.name = "em";
  em.value = endDate[1];
  var ey = new Object();
  ey.name = "ey";
  ey.value = endDate[0];
  
  hashtagFormVars.splice(1,2,sd,sm,sy,ed,em,ey);
  
  return hashtagFormVars;
}


























/*
var now.jsonCurrentArchive = {"archive_info":{"id":"1","keyword":"#knowaan","description":"Tweets from project group knowAAN at UPB","tags":"","screen_name":"aandev","user_id":"85836202","count":"36","create_time":"1300228322"},"tweets":[{"archivesource":"twitter-search","text":"is wondering how to get access to @TwigKit ... looks like a promising UI framework for our #knowaan project at #upb","to_user_id":"","from_user":"wollepb","id":"78093881635377152","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/twitter.com\/&quot;&gt;web&lt;\/a&gt;","profile_image_url":"http:\/\/a2.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Tue, 07 Jun 2011 13:40:06 +0000","time":"1307454006"},{"archivesource":"twitter-search","text":"\u201c@bramvandeputte: New Researchtable video is public now http:\/\/t.co\/AeVqixs\u201d #knowaan","to_user_id":"","from_user":"wollepb","id":"76009067142848512","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/twitter.com\/#!\/download\/ipad&quot; rel=&quot;nofollow&quot;&gt;Twitter for iPad&lt;\/a&gt;","profile_image_url":"http:\/\/a2.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"Point","geo_coordinates_0":"51.7467","geo_coordinates_1":"8.7168","created_at":"Wed, 01 Jun 2011 19:35:48 +0000","time":"1306956948"},{"archivesource":"twitter-search","text":"OpenStreetMap at OpenTech 2011 http:\/\/zite.to\/mmvs2V #knowaan #maps #opendata","to_user_id":"","from_user":"wollepb","id":"72363237370363904","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/www.zite.com\/&quot; rel=&quot;nofollow&quot;&gt;Zite&lt;\/a&gt;","profile_image_url":"http:\/\/a2.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Sun, 22 May 2011 18:08:34 +0000","time":"1306087714"},{"archivesource":"twitter-search","text":"WOW: http:\/\/vaadin.com - Java framework for building modern web applications that look great and make you and your users happy #knowaan","to_user_id":"","from_user":"wollepb","id":"69334615327916032","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/kiwi-app.net&quot; rel=&quot;nofollow&quot;&gt;kiwi&lt;\/a&gt;","profile_image_url":"http:\/\/a2.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Sat, 14 May 2011 09:33:55 +0000","time":"1305365635"},{"archivesource":"twitter-search","text":"thx @mhausenblas - http:\/\/data.semanticweb.org\/ looks helpful (re 'database of scientific affiliations w\/ geolocations') #knowaan","to_user_id":"","from_user":"wollepb","id":"67576567483731969","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/kiwi-app.net&quot; rel=&quot;nofollow&quot;&gt;kiwi&lt;\/a&gt;","profile_image_url":"http:\/\/a1.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Mon, 09 May 2011 13:08:03 +0000","time":"1304946483"},{"archivesource":"twitter-search","text":"\u201c@otisg: Awesome Lucene performance charts http:\/\/t.co\/ouNRJaa from Mike McCandless #lucene\u201d #knowaan","to_user_id":"","from_user":"wollepb","id":"66396017960030209","from_user_id":"583211","iso_language_code":"en","source":"&lt;a href=&quot;http:\/\/twitter.com\/#!\/download\/ipad&quot; rel=&quot;nofollow&quot;&gt;Twitter for iPad&lt;\/a&gt;","profile_image_url":"http:\/\/a1.twimg.com\/profile_images\/1333572768\/avatar_normal.jpg","geo_type":"Point","geo_coordinates_0":"51.7468","geo_coordinates_1":"8.7167","created_at":"Fri, 06 May 2011 06:56:58 +0000","time":"1304665018"},{"archivesource":"twitter-stream","text":"Tweet Topic Explorer - Explore what people tweet about http:\/\/t.co\/LZdWFwE via @JeffClark #knowaan #visualization","to_user_id":"","from_user":"wollepb","id":"63675708626571264","from_user_id":"15015126","iso_language_code":"en","source":"<a href=\"http:\/\/twitter.com\/tweetbutton\" rel=\"nofollow\">Tweet Button<\/a>","profile_image_url":"http:\/\/a0.twimg.com\/profile_images\/1235327113\/marvin_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Thu Apr 28 18:47:26 +0000 2011","time":"1304016446"},{"archivesource":"twitter-stream","text":"clustering &gt;6000 #edmedia papers took more than 4 hours... very interesting findings #knowaan","to_user_id":"","from_user":"wollepb","id":"60779617274961920","from_user_id":"15015126","iso_language_code":"en","source":"<a href=\"http:\/\/kiwi-app.net\" rel=\"nofollow\">Kiwi<\/a>","profile_image_url":"http:\/\/a0.twimg.com\/profile_images\/1235327113\/marvin_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Wed Apr 20 18:59:24 +0000 2011","time":"1303325964"},{"archivesource":"twitter-stream","text":"looks like @gephi has hit 0.8 alpha #visualization #knowaan http:\/\/gephi.org\/","to_user_id":"","from_user":"wollepb","id":"59953187083403264","from_user_id":"15015126","iso_language_code":"en","source":"<a href=\"http:\/\/kiwi-app.net\" rel=\"nofollow\">Kiwi<\/a>","profile_image_url":"http:\/\/a0.twimg.com\/profile_images\/1235327113\/marvin_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Mon Apr 18 12:15:28 +0000 2011","time":"1303128928"},{"archivesource":"twitter-search","text":"@_denic wenn die pg mitmacht bin ich dabei:-) #knowaan","to_user_id":"32788433","from_user":"shabazza","id":"58789774416297984","from_user_id":"4275888","iso_language_code":"de","source":"&lt;a href=&quot;http:\/\/www.tweetdeck.com&quot; rel=&quot;nofollow&quot;&gt;TweetDeck&lt;\/a&gt;","profile_image_url":"http:\/\/a3.twimg.com\/profile_images\/1168727829\/Picture0007_normal.jpg","geo_type":"","geo_coordinates_0":"0","geo_coordinates_1":"0","created_at":"Fri, 15 Apr 2011 07:12:29 +0000","time":"1302851549"}]};

var apitListArchivesTest = [[{"id":"1","keyword":"#knowaan","description":"Tweets from project group knowAAN at UPB","tags":"","screen_name":"aandev","user_id":"85836202","count":"36","create_time":"1300228322"},{"id":"2","keyword":"#ectel11","description":"Tweets from the EC-TEL 2011 conference","tags":"","screen_name":"aandev","user_id":"85836202","count":"54","create_time":"1300229370"},{"id":"3","keyword":"innovation","description":"Innovation keyword archive","tags":"","screen_name":"aandev","user_id":"85836202","count":"689637","create_time":"1300229406"},{"id":"4","keyword":"#edmedia","description":"Tweets from the ED-MEDIA conferences","tags":"","screen_name":"aandev","user_id":"85836202","count":"59","create_time":"1300229532"},{"id":"5","keyword":"#stellarnet","description":"Tweets from the STELLAR project","tags":"","screen_name":"aandev","user_id":"85836202","count":"25","create_time":"1300229570"},{"id":"6","keyword":"#ple_sou","description":"Tweets from the PLE_SOU conference","tags":"","screen_name":"aandev","user_id":"85836202","count":"395","create_time":"1300229586"},{"id":"7","keyword":"#cscw11","description":"Tweets from the CSCW 2011 conference","tags":"","screen_name":"wollepb","user_id":"15015126","count":"42","create_time":"1300407553"},{"id":"8","keyword":"science2.0","description":"Tweets dealing with the topic Science 2.0","tags":"","screen_name":"wollepb","user_id":"15015126","count":"34","create_time":"1300407606"},{"id":"9","keyword":"#cscw2011","description":"Tweets from the CSCW 2011 conference","tags":"","screen_name":"wollepb","user_id":"15015126","count":"515","create_time":"1300407628"},{"id":"10","keyword":"#CeBIT","description":"Tweets about the CeBIT in Hannover (Germany)","tags":"","screen_name":"twapperlytics","user_id":"237864592","count":"1969","create_time":"1300412290"},{"id":"11","keyword":"Fukushima","description":"Tweets around the keyword Fukushima","tags":"","screen_name":"twapperlytics","user_id":"237864592","count":"2129540","create_time":"1300412502"},{"id":"12","keyword":"#arv11","description":"Tweets from the 2011 Alpine Rendez-Vous","tags":"","screen_name":"wollepb","user_id":"15015126","count":"432","create_time":"1300486335"},{"id":"13","keyword":"#delfi11","description":"Tweets from the DeLFI 2011 conference","tags":"","screen_name":"wollepb","user_id":"15015126","count":"4","create_time":"1300486374"},{"id":"14","keyword":"#educamp","description":"EduCamp tweets","tags":"","screen_name":"wollepb","user_id":"15015126","count":"282","create_time":"1300527637"},{"id":"15","keyword":"#echb11","description":"Tweets from EduCamp Bremen 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"2460","create_time":"1300527656"},{"id":"16","keyword":"#jtelws11","description":"","tags":"","screen_name":"twapperlytics","user_id":"237864592","count":"43","create_time":"1301317131"},{"id":"17","keyword":"#opendata","description":"Chatter dealing with Open Data","tags":"","screen_name":"wollepb","user_id":"15015126","count":"30704","create_time":"1303032782"},{"id":"18","keyword":"#openscience","description":"Chatter dealing with Open Science","tags":"","screen_name":"wollepb","user_id":"15015126","count":"1035","create_time":"1303032801"},{"id":"19","keyword":"#ple","description":"PLE tweets","tags":"","screen_name":"wollepb","user_id":"15015126","count":"9287","create_time":"1303032841"},{"id":"20","keyword":"#research20","description":"Tweets dealing with Research 2.0","tags":"","screen_name":"wollepb","user_id":"15015126","count":"53","create_time":"1303032924"},{"id":"21","keyword":"#mendeley","description":"Mendeley tweets","tags":"","screen_name":"wollepb","user_id":"15015126","count":"562","create_time":"1304036273"},{"id":"22","keyword":"#ginkgo","description":"ginkgo tweets","tags":"","screen_name":"wollepb","user_id":"15015126","count":"192","create_time":"1304036325"},{"id":"23","keyword":"#jtelss11","description":"Tweets from the JTEL Summer School 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"542","create_time":"1304036388"},{"id":"24","keyword":"#rw2011","description":"Tweets from the Royal Wedding 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"130629","create_time":"1304038699"},{"id":"25","keyword":"#royalwedding","description":"Tweets from the Royal Wedding 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"1058716","create_time":"1304063851"},{"id":"26","keyword":"#iknow11","description":"Tweets from the i-KNOW 2011 conference","tags":"","screen_name":"wollepb","user_id":"15015126","count":"4","create_time":"1304202527"},{"id":"27","keyword":"#scio12","description":"Tweets around Science Online 2012","tags":"","screen_name":"wollepb","user_id":"15015126","count":"654","create_time":"1304338036"},{"id":"28","keyword":"bin laden","description":"The bin Laden raid (and unfolding stories)","tags":"","screen_name":"wollepb","user_id":"15015126","count":"3664511","create_time":"1304338070"},{"id":"29","keyword":"#esc11","description":"Eurovision Song Contest 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"18049","create_time":"1305049610"},{"id":"30","keyword":"#ardesc","description":"ESC 2011 auf der ARD","tags":"","screen_name":"wollepb","user_id":"15015126","count":"23854","create_time":"1305050365"},{"id":"31","keyword":"#io2011","description":"Google IO 2011","tags":"","screen_name":"wollepb","user_id":"15015126","count":"40750","create_time":"1305050466"},{"id":"32","keyword":"#esc","description":"Eurovision Song Contest","tags":"","screen_name":"wollepb","user_id":"15015126","count":"41758","create_time":"1305401147"},{"id":"33","keyword":"#eurovision","description":"Eurovision Song Contest","tags":"","screen_name":"wollepb","user_id":"15015126","count":"73489","create_time":"1305401172"},{"id":"34","keyword":"#arple11","description":"Tweets from the ARPLE workshop","tags":"","screen_name":"wollepb","user_id":"15015126","count":"2","create_time":"1305972748"},{"id":"35","keyword":"#arnets11","description":"Tweets from the ARNets workshop","tags":"","screen_name":"wollepb","user_id":"15015126","count":"12","create_time":"1305972764"},{"id":"36","keyword":"@DB_Bahn","description":"bahn.de Twitter Service Chanel","tags":"","screen_name":"twapperlytics","user_id":"237864592","count":"4043","create_time":"1307527276"}],36];
*/

