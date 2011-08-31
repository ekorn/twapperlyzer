var cradle = require('cradle');
var conf = require('config');
var _ = require('underscore')._;

var conn;
var db;
getDBConnectionFromConfig(conf.couchdb, function(error, database, connection){
  if(error == null){
    conn = connection;
    db  = database;
    
    db.all(function(err, res){
      
      _.each(res, function(entry){
        if(entry.id.indexOf("-") != -1){
          db.remove(entry.id, entry.value.rev)
        }
        console.log("conn.all()",entry);
      });
    })
    
  }else{
    console.log("Database error:",error);
  }
});

function getDBConnectionFromConfig(dbConf, callback){
  var connection = new(cradle.Connection)(dbConf.host,dbConf.port, dbConf.options);

  connection.info(function (err, json) {
    if (err == null){
      console.log("Couchdb ("+json.version+") at "+dbConf.host+" connected.");
      var forenDb = connection.database(dbConf.dbname); 
      // Create the db if it doesn't exist.
      forenDb.exists(function (error, exists) {
              if (!exists) {
                forenDb.create( 
                  function(error, res){
                    if(error == null){
                      callback(null, forenDb, connection);
                    }else{
                      callback(error, null,null);
                    }
                  });
              }else callback(null, forenDb, connection);
      });
    }
    else{
      err.host = dbConf.host;
      callback(err, null);
      //console.log("info() failed to connect to couchdb : ", err);
    }
  });


}

function exist(param){
 return !(typeof param === 'undefined');
}
