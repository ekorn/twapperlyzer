 
 /*
  buildPage2(, , , );
  var simplePage = Handlebars.compile( $("#page").html() );
  Handlebars.registerPartial('content', $("#simpleContent").html());
  Handlebars.registerPartial('footer', $("#simpleFooter").html());
  */
  //var mypage = {"pageID":"archiveMentionsPage", "headerText":"Mentions in Archive", "containerID":"archiveMentionsContainer","style":"margin: 0px auto; width: 320px; height: 400px; border: none;", "footerText":"Footer"};
 // $.mobile.pageContainer.append(simplePage(mypage));
  //$('#archiveMentionsPage').page();
  
  
  //$.mobile.pageContainer.append();
  //$('#archiveMentionsPage').page();
  /*
  $.mobile.pageContainer.append(buildPage("archiveHashtagsPage", "archiveHashtagsContainer", "Hastags in the Archive", "margin: 0px auto; width: 320px; height: 400px; border: none;"));
  $('#archiveHashtagsPage').page();
  $.mobile.pageContainer.append(buildPage("archiveLinksPage", "archiveLinksContainer", "Links in the Archive", "width: 98%; height: 80%; margin: 0  auto"));
  $('#archiveLinksPage').page();
  $.mobile.pageContainer.append(buildPage("localArchivesPage", "localArchivesContainer", "Analysed Archives", ""));
  $('#localArchivesContainer').append('<ul data-role="listview" data-filter="true" id="localArchiveList"></ul>');
  
  $('#localArchivesPage').page();
*/

function addUrlChart(){
  $('#archiveLinksContainer').html('');
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




