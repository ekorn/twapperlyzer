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
    
    db.all(function(err, res){
      
      _.each(res, function(entry){
        if(entry.id !== "config" && entry.id.indexOf("_design") == -1){
          db.remove(entry.id, entry.value.rev)
          console.log("removed: ",entry);
        }
        
      });
    })
    
  }else{
    console.log("Database error:",error);
  }
});




