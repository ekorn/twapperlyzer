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

ddoc.views.getGeo = {
  map: function(doc) {
    if(doc.archive_info != null) {
      emit(doc._id, doc.geoMarker);
    }
  }
}

ddoc.views.getGeo2 = {
  map: function(doc) {
    for(var i=0; i<doc.geoMarker.length; i++){
      emit(doc.geoMarker[i].lat, doc.geoMarker[i]);
    }
  }
}
//http://twapperlyzer.cs.upb.de:5984/twapperlyzer/_design/twapperlyzer/_view/listArchives?key="%23cscw11"


ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {     
    throw "Only admin can delete documents on this database.";
  } 
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;
