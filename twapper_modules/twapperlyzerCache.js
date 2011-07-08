eval(require('fs').readFileSync('./plugins/jshashtable-2.1.js', 'utf8')); 
//var EventEmitter = require( "events" ).EventEmitter;

function TwapperlyzerCache(expireTime){
  this.expireTime = expireTime;
  this.instanceCaches = new Hashtable();
  
  this.isInCache = function (ytkURL, id){
    if(this.instanceCaches.containsKey(ytkURL)){
      var instanceCache = this.instanceCaches.get(ytkURL)
      return instanceCache.isInCache(id);
    }else{
      return false;
    }
  }
  
  this.addToCache = function (ytkURL, archive){
    if(this.instanceCaches.containsKey(ytkURL)){
      var instanceCache = this.instanceCaches.get(ytkURL);
    }else{
      var instanceCache = new InstanceCache(this.expireTime);
      this.instanceCaches.put(ytkURL,instanceCache);
    }
    instanceCache.addToCache(archive);
    console.log("Adding ",ytkURL,":",archive.archive_info.id," to cache.");
    this.checkForExpieredCacheEntrys();
  };
  
  this.updateCache = function (ytkURL,id, mgs){
    if(this.instanceCaches.containsKey(ytkURL)){
      var instanceCache = this.instanceCaches.get(ytkURL)
      instanceCache.updateCache(id, mgs);
      console.log("Updating ",ytkURL,":",id," in cache.");
      this.checkForExpieredCacheEntrys();
    }else{
      return false;
    }
  };
  
  this.getFromCache = function (ytkURL,id){
    if(this.instanceCaches.containsKey(ytkURL)){
      var instanceCache = this.instanceCaches.get(ytkURL)
      console.log("Getting ",ytkURL,":",id," from cache.");
      return instanceCache.getFromCache(id);
    }else{
      return false;
    }
  };
  
  this.checkForExpieredCacheEntrys = function (){
    this.instanceCaches.each(function(key, value){value.checkForExpieredCacheEntrys();});
  };
}

//FIXME Mehr Gedanken machen über gleichzeitigen Zugriff
function InstanceCache(expireTime){

  // Call the super constructor.
  //EventEmitter.call( this );

  this.expireTime = expireTime;
  this.archiveCache= new Array();
  this.expireDates = new Array();
  this.cacheLock = new Array();

  //Functions 
  this.isInCache = function (id){
    return (this.archiveCache[id] != null);
  };
  this.addToCache = function (archive){
    this.archiveCache[archive.archive_info.id] = archive;
    this.expireDates[archive.archive_info.id] = new Date();
  };
  this.updateCache = function (id, mgs){
    //this.archiveCache[id].tweets=this.archiveCache[id].tweets.concat(msg);
    this.archiveCache[id].tweets = mgs;
    this.archiveCache[id].archive_info.count = mgs.length;
    this.expireDates[id] = new Date();
  };
  this.getFromCache = function (id){
    return this.archiveCache[id];
  };
  this.checkForExpieredCacheEntrys = function (){
    var currentTime = new Date();
    for(var i =0; i<this.archiveCache.length; i++){
      if(this.expireDates[i] != null){
        if((currentTime - this.expireDates[i])>this.expireTime){
          var mhd=Math.floor((currentTime - this.expireDates[i]-this.expireTime)/1000);
          console.log("Deleting Entry ",i,"it is ",mhd," sec. over time.");
          this.archiveCache[i] = null
          this.expireDates[i] = null
        }
      }
    }
  };
}

// export the constructor
exports.TwapperlyzerCache = TwapperlyzerCache;
