var fs = require('fs')
var sys = require('sys')
var _ = require('underscore')._;
_.mixin(require('underscore.string'));
var cradle = require('cradle');
var conn = new(cradle.Connection)();
var db = conn.database('forenames'); 
// Create the db if it doesn't exist.
db.exists(function (error, exists) {
        if (!exists) db.create();
});

function parseCsvFile(fileName, callback){
  var stream = fs.createReadStream(fileName);
  var header = null;
  var buffer = "";
  fs.readFile(fileName, function (err, data) {
    if (err) throw err;
    
    var lines = _.lines(data.toString());
    if(_.isNull(header)){
      header = _.words(lines.shift(), delimiter="\t");
    }
    _.each(lines, function(line){
      if(line != ""){
        callback(buildRecord(line));
      }
    });
  });
   
  function buildRecord(line){
    var record = {}
    var parts =_.words(line, delimiter="\t");
    _.each(parts, function(part, index){
      if(header[index] != ''){
        record[header[index].toLowerCase()] = part.replace(/"/g, '');
      }
    });
    record.origin = _.words(record.origin, delimiter=",");

    return record
  }
}
function getNamesToGender(fileName, callback){
  var names = new Object;
  var stream = fs.createReadStream(fileName);
  var header = null;


  fs.readFile(fileName, function (err, data) {
    if (err) throw err;
    
    var lines = _.lines(data.toString());
    if(_.isNull(header)){
      header = _.words(lines.shift(), delimiter="\t");
    }
    _.each(lines, function(line){
      if(line != ""){
        var parts =_.words(line, delimiter="\t");
        names[parts[0]] = parts[1];
      }
    });
    callback(names);
  });
}
/*
parseCsvFile('forenames2.txt', function(name){
  db.save(name, function (err, res) {
    if (!res)
      console.log("Failed to save document: ", err);
    else
      console.log("Document saved.",res);
  });
});



parseCsvFile('forenames2.txt', function(name){

});
*/
getNamesToGender('forenames3.txt', function(names){
  if(!_.isUndefined(names.aliz)){
    console.log("names",names.aliz);
  }
});

