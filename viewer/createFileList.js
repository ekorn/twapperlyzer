var files   = [];
var walk = require('walk'),
  fs = require('fs'),
  options,
  walker;

options = {
    followLinks: false,
};

walker = walk.walk("./", options);

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files
    files.push(root + '/' + stat.name);
    console.log(root + '/' + stat.name);
    next();
});

walker.on('end', function() {
    //console.log(files);
});

