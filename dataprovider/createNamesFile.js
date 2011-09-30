var fs = require('fs');
var _ = require('underscore')._;
_.mixin(require('underscore.string'));

function getNamesToGender2(fileName, callback){

  var male = [];
  var female = [];
  
  var maleQu = [];
  var femaleQu = [];
  
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
        var parts =_.words(line);
        if(parts[0] === "M"){
          if(parts[2].indexOf("<") === -1 && parts[2].indexOf("+") === -1)
            male.push(parts[2].toLowerCase());
        }
        else if(parts[0] === "F"){
          if(parts[2].indexOf("<") === -1 && parts[2].indexOf("+") === -1)
            female.push(parts[2].toLowerCase());
        }
        else if(parts[0] === "?M"){
          if(parts[1].indexOf("<") === -1 && parts[1].indexOf("+") === -1)
            maleQu.push(parts[1].toLowerCase());
        }
        else if(parts[0] === "?F"){
          if(parts[2].indexOf("<") === -1 && parts[1].indexOf("+") === -1)
            femaleQu.push(parts[1].toLowerCase());
        }
      }
    });
    
    console.log("male",male.length, "female",female.length);
    
    var save = 0;
    _.each(maleQu, function(name){
      if(!_.include(female,name)){//it's not a more common female name
        if(!_.include(male,name)){//
          male.push(name);
        }
      }else{
        save++;
      }
    })
    console.log("male",male.length, "could be female",save);
    
    save = 0;
    _.each(femaleQu, function(name){
      if(!_.include(male,name)){//it's not a more common female name
        if(!_.include(female,name)){//
          female.push(name);
        }
      }else{
        save++;
      }
    })
    console.log("male",male.length, "could be male",save);
    callback(male, female);
  });
}

function getNamesToGender(fileName, callback){
  var male = [];
  var female = [];
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
        if(parts[1] === "m")
          male.push(parts[0].split(" ")[0]);
        if(parts[1] === "f")
          female.push(parts[0].split(" ")[0]);
      }
    });
    callback(male, female);
  });
}


function readNames(fileName, callback){
  var res = [];

  fs.readFile(fileName, function (err, data) {
      if (err) throw err;
      
      callback(_.lines(data.toString()));
  });
}

var start = new Date();
var firstFile;
var allnames;


getNamesToGender('./staticData/forenames2.txt', function(maleF1, femaleF1){
  firstFile = new Date();
  console.log("First File took",(new Date (firstFile.getTime() - start.getTime())).getTime(), "ms");
  
  getNamesToGender2('./staticData/nam_dict2.txt', function(maleF2, femaleF2){
    secondFile = new Date();
    console.log("Second File took",(new Date (secondFile.getTime() - firstFile.getTime())).getTime(), "ms.");
    _.each(maleF1,function(maleName){
      if(!_.includes(maleF2, maleName)){
        maleF2.push(maleName);
      }
    });
    
    _.each(femaleF1,function(femaleName){
      if(!_.includes(femaleF2, femaleName)){
        femaleF2.push(femaleName);
      }
    });
    
    console.log("male",maleF2.length, "female",femaleF2.length);
    maleF2.sort();
    femaleF2.sort();

    var stream = fs.createWriteStream("male.txt");
      stream.once('open', function(fd) {
        _.each(maleF2, function(name){
          stream.write(name+"\n");
        });
        console.log("Done");
    });
    var stream2 = fs.createWriteStream("female.txt");
      stream2.once('open', function(fd) {
        _.each(femaleF2, function(name){
          stream2.write(name+"\n");
        });
        console.log("Done");
    });

  });

});


