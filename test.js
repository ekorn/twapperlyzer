var cradle = require('cradle');

cradle.setup({ host: 'localhost',
               port: 5984,
               options: { cache:true, raw: false }});

var connection = new(cradle.Connection);

/*
var connection = new(cradle.Connection)('127.0.0.1', 5984, {
    secure: true, 
    auth: { username: 'ekorn', password: 'gorby' }
}); 

var connection = new(cradle.Connection)('127.0.0.1', 5984, {
    auth: { username: 'ekorn', password: 'gorby' }
});
*/

console.log("WTH",connection.info());
var unshortener = require('unshortener');

 // you can pass in a url object or string
 unshortener.expand('http://bit.ly/pJGszM',
                    function (url) {
                         // url is a url object
                         console.log(url);
                    });

/*
// expand an URL
 // you can pass in a url object or string
 unshortener.expand('http://bit.ly/pJGszM',
                    {bitly: {username: 'twapperlyzer',
                             apikey: 'twapperlyzer'}},
                    function (url) {
                         // url is a url object
                         console.log(url);
                    });
*/                        
function _createdb(dbname) {
    var db = connection.database(dbname);
    db.exists(function(err, exists) {
        if (!exists) {
            db.create()
        }
    });
    return db;
}
