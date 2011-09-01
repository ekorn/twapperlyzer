 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/twapperlyzer'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    , {from:"/api", to:'../../'}
    , {from:"/dbname/*", to:'../../*'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {};

ddoc.views.listArchives = {
  map: function(doc) {
    if(doc.archive_info !== null) {
      emit(doc.archive_info.keyword, {"id": doc._id,"keyword" : doc.archive_info.keyword, "description": doc.archive_info.description,"count": doc.archive_info.count});
    }
  }
}

ddoc.views.getDateByHouers = {
  map: function(doc) {
  	if(doc.msgByDate != null){
		for(var i = 0; i<doc.msgByDate.length; i++){
			emit(doc.msgByDate[i].text, doc.msgByDate[i]);
	    }
   }
  }
}


//http://localhost:5984/twapperlyzer2/_design/twapperlyzer/_view/getDateByTime?key=%221313071200%22&startkey_docid=29863de6315290d576d34e93d122c944-47&endkey_docid=29863de6315290d576d34e93d122c944-47
ddoc.views.getAggrigatedData= {
		map: function(doc) {
			if(doc.msgByDate !== null) {
				var content= {};
				content.hashtags = [];
				content.mentions = [];
				content.geoMarker = [];
				
				for(var i=0; i<doc.msgByDate.length; i++) {
					content.hashtags.push(doc.msgByDate[i].ht);
					content.mentions.push(doc.msgByDate[i].me);
					content.geoMarker.push(doc.msgByDate[i].geo);
				}
				function isIn(data, key) {
					for(var i=0; i<data.length; i++) {
						if(data[i].text.toLowerCase() === key.toLowerCase())
							return i;
					}
					return -1;
				}
				function isIn(data, lat,lon) {
					for(var i=0; i<data.length; i++) {
						if(data[i].text.toLowerCase() === key.toLowerCase())
							return i;
					}
					return -1;
				}
				function aggrigate(values) {
					var res = [];
					values.forEach( function (arrays) {
						arrays.forEach( function (value) {
							var pos = isIn(res, value.text);
							if(pos !== -1) {
								res[pos].weight += value.weight
							} else {
								res.push(value);
							}
						})
					})
					return res;

				}
				
				function aggrigateGeo(values) {
					var res = [];
					values.forEach( function (arrays) {
						arrays.forEach( function (point) {
							var pos = isIn(res, value.text);
							if(pos !== -1) {
								res[pos].weight += value.weight
							} else {
								res.push(value);
							}
						})
					})
					return res;

				}				
				content.hashtags = aggrigate(content.hashtags);
				content.mentions = aggrigate(content.mentions);
				emit(doc._id, content);
			}
		}
	}

	/*
	 *
	 *       if(typeof tmp.time == 'undefined'){
	 tmp.time = doc.msgByDate[i].text;
	 }

	 */

	ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
		if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
			throw "Only admin can delete documents on this database.";
		}
	}
	couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

	module.exports = ddoc;