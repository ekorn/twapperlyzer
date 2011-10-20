function addUrlChart(containerId, urls, showLimit) {
	//console.log("addUrlChart",containerId,$('#'+containerId), urls, showLimit);
	$('#'+containerId).html('');

	var chartOptions = {
		chart: {
			renderTo: containerId,
         height: Number($(window).height()) - Math.round(15*(Number($(window).height())/100)),
         width: Number($(window).width()) - Math.round(8*(Number($(window).width())/100)),
			plotShadow: false
		},
		title: {
			text: urls.length +' Links '
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
				click: function (e) {
					this.slice();
					var clicked = this;
					setTimeout(function(){
            window.open(clicked.config[0],"_blank");
					}, 500);
					e.preventDefault();
				}
			}
		},
		data: []
	};

	_.each(_.first(urls, showLimit), function (url) {
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
function setUpGeoMarkerForArchive(data, mapContainerId) {

	setUpMap(mapContainerId);

	map.setView(new L.LatLng(51.719444, 8.757222, true), 2);
	var ColorMarker = L.Icon.extend({
		iconUrl: '',
		shadowUrl: 'css/images/marker-shadow.png',
		iconSize: new L.Point(25, 41),
		shadowSize: new L.Point(41, 41),
		iconAnchor: new L.Point(22, 94),
		popupAnchor: new L.Point(-3, -76)
	});
	var redMarker = new ColorMarker('css/images/marker-red.png');
	for (var i = 0 ; i < data.length; i++) {
		var geoM = data[i];
		// create a marker in the given location and add it to the map
		var marker;
		var text = "";
		var pos = new L.LatLng(geoM.lat, geoM.lon, true);
		//One Message at one place, from one person;
		if(geoM.users.length === 1 && geoM.users[0].tweets.length === 1) {
			marker = new L.Marker(pos);
			text +="<a href=\"http://twitter.com/#!/"+geoM.users[0].text+"/status/"+geoM.users[0].tweets[0]+"\" target=\"_blank\" >"+geoM.users[0].text+"</a>";
			//console.log("Simple Marker please",_.values(geoM.users));
		} else if(geoM.users.length == 1) {//More than one message from one place and person.
			marker = new L.Marker(pos);
			text +=" <a href=\"http://twitter.com/#!/"+geoM.users[0].text+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[0].tweets.length,9)+"em;\">"+geoM.users[0].text+"</a> ";
			//console.log("Simple Marker please",_.values(geoM.users));
		} else {//More than one Person at one place, the amount of messages is irrelevant 
			marker = new L.Marker(pos, {
				icon:redMarker
			});
			for (var k = 0; k < geoM.users.length; k++) {
				text +=" <a href=\"http://twitter.com/#!/"+geoM.users[k].text+"\" target=\"_blank\" style=\"font-size : 1."+Math.min(geoM.users[k].tweets.length,9)+"em;\">"+geoM.users[k].text+"</a> ";
			}
		}
		marker.bindPopup(text, {
			autoPan:false
		});
		map.addLayer(marker);
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
function setUpMap(mapContainerId) {
	var mapContainer = $('#'+mapContainerId);
	//console.log("setUpMap",mapContainerId, mapContainer);
	//Adjust the map container to the maximum
	var usedHeight = 0;

	mapContainer.siblings().each( function() {
		usedHeight += $(this).outerHeight();
	});
	mapContainer.height(mapContainer.parent().height() - usedHeight);

	//clear the old map data
	if (map) {
		mapContainer.html('');
	}

	// initialize the map on the "map" div
	map = new L.Map(mapContainerId);

	// create a CloudMade tile layer
	var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/d692a017c2bc4e45a59d57699d0e0ea7/997/256/{z}/{x}/{y}.png',
	cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
	cloudmade = new L.TileLayer(cloudmadeUrl, {
		maxZoom: 18,
		attribution: cloudmadeAttribution
	});

	// add the CloudMade layer to the map
	map.addLayer(cloudmade);
	map.setView(new L.LatLng("51.706764", "8.771238",true), 13);
}

function getAvantarMarker(msgLocation, text, imageUrl) {
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
	var marker = new L.Marker(msgLocation, {
		icon: icon
	});
	// attach a given HTML content to the marker and immediately open it
	marker.bindPopup(text, {
		autoPan:false
	});
	// marker = new L.Marker(msgLocation);

	return marker;
}


function grandTotal(laid, callback){
     mydb.list("twapperlyzer/totalByDay","grandTotal", 
    {
      success: function(data) {
        callback(null, data);
        //console.log("grandTotal", data);
      },
      error: function(status) {
          callback(status,null);
      },
      "startkey":[laid, 0],
      "endkey":[laid,{}]
    }
  );
}
  
//'archiveOverviewContainer-'+laid,
function showGrowthChart(laid, data){
  
  //console.log("document"+ $(document).width()+"x"+$(document).height());
  //console.log("window"+ $(window).width()+"x"+$(window).height());
    
  $('#archiveGrowthContainer-'+laid).html('');
  var chartOptions = {
       chart: {
         renderTo: 'archiveGrowthContainer-'+laid,
         zoomType: 'x',
         height: Number($(window).height()) - Math.round(15*(Number($(window).height())/100)),
         width: Number($(window).width()) - Math.round(8*(Number($(window).width())/100)),
      },
      title: {
         text: null
         //x: -20 //center
      },
      xAxis: {
         type: 'datetime',
         maxZoom: 14 * 24 * 3600000, // fourteen days
         title: {
            text: 'Time'
         }
      },
      yAxis: {
         title: {
            text: 'Amount'
         }
      },
      tooltip: {
         formatter: function() {
                   return '<b>'+ this.series.name +'</b><br/>'+
               (new Date(this.x)).toDateString() +':  <b>'+this.y +'</b>';
         }
      },
      legend: {
         layout: 'vertical',
         floating: true,
         backgroundColor: '#FFFFFF',
         align: 'right',
         verticalAlign: 'top',
         x: -10,
         y: 100,
         borderWidth: 1
      },
      plotOptions: {
           area: {
              lineWidth: 1,
              marker: {
                 enabled: false,
                 states: {
                    hover: {
                       enabled: true,
                       radius: 5
                    }
                 }
              },
              shadow: true,
              states: {
                 hover: {
                    lineWidth: 1                  
                 }
              }
           }
      },
      series: []
   } 
   
  var line = {
       pointInterval: 30* 24 * 3600 * 1000,//month*day*hour*sec
       pointStart: 1299780000*1000,
       name: 'Messages',
       data: [25, 7, 4, 2, 2, 1, 2]
    };
    
    var msgLine = {
       type: 'area',
       pointInterval:24 * 3600 * 1000,//day*hour*sec
       pointStart: 0,
       name: 'Messages',
       data: []
      };
    var rtLine = {
       type: 'area',
       pointInterval:24 * 3600 * 1000,//day*hour*sec
       pointStart: 0,
       name: 'Retweets',
       data: []
      };
    //Unique Users total new per day
    var userLine = {
       type: 'line',
       pointInterval:24 * 3600 * 1000,//day*hour*sec
       pointStart: 0,
       name: 'New Users',
       data: []
      };
    //Unique Users total new per day
    var userLine2 = {
       type: 'area',
       pointInterval:24 * 3600 * 1000,//day*hour*sec
       pointStart: 0,
       name: 'Users Total',
       data: []
      };
      msgLine.pointStart = rtLine.pointStart = userLine.pointStart = userLine2.pointStart = data[0].from *1000;
      
      var day = 86400;
      var from = data[0].from;
      var to = from + day;
      var till = _.last(data).from;
      lastEntry = data[0];
      var totalUsersSoFar = 0;
      _.each(data, function(entry){
        
        var daysPassed = Math.round((entry.from-lastEntry.from)/day)-1;
        
        if(daysPassed === 1){
          var point = [((entry.from-day)*1000), 0];
          msgLine.data.push(point);
          rtLine.data.push(point);
          if(_.last(userLine.data)[1]!=0 || entry.un !== 0)
            userLine.data.push(point);

        }else if (daysPassed > 1){
          var startpoint = [((lastEntry.from+day)*1000), 0];
          msgLine.data.push(startpoint);
          rtLine.data.push(startpoint);
          
          
          var endpoint = [((entry.from-day)*1000), 0];
          msgLine.data.push(endpoint);
          rtLine.data.push(endpoint);
          if(_.last(userLine.data)[1]!==0)
          userLine.data.push(startpoint);
          
          if(_.last(userLine.data)[1]!==0 || entry.un !== 0)
          userLine.data.push(endpoint);
        }
        
        msgLine.data.push([(entry.from * 1000), entry.msg]);
        rtLine.data.push([(entry.from * 1000),entry.rt]);
        if(entry.un>0){
          userLine.data.push([(entry.from * 1000),entry.un]);
          totalUsersSoFar+=entry.un;
          userLine2.data.push([(entry.from * 1000),totalUsersSoFar]);
        }
        lastEntry= entry;
      });
      userLine2.data.push([(lastEntry.from * 1000),totalUsersSoFar]);

    chartOptions.series.push(userLine2);
    chartOptions.series.push(msgLine);
    chartOptions.series.push(rtLine);
    chartOptions.series.push(userLine);
    
  //console.log("Lets show", data);
  chart = new Highcharts.Chart(chartOptions);
}
