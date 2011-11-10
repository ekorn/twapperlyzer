var cradle = require('cradle');
var conf = require('config');
var _ = require('underscore')._;
var helper = require('./twapper_modules/helper.js');

var conn;
var db;
helper.getDBConnectionFromConfig(conf.couchdb, function(error, database, connection){
  if(error == null){
    conn = connection;
    db  = database;
    var couchAppConfig = conf.couchAppConfig;
    couchAppConfig.thisdb = { "dbport": conf.couchdb.port,
                              "dbHost": conf.couchdb.host,
                              "dbname": conf.couchdb.dbname
                            };
    db.save(couchAppConfig, function (err,res){
      if(err) { 
        console.log("Database error:",err);
        process.exit(code=1);
      }
      else {
        console.log(res, " config created.");
        process.exit(code=0);
      }
      
    });
    
  }else{
    console.log("Database error:",error);
  }
});




