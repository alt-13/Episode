var storedSeries = "episode++Series"; // SeriesList in sync storage
// Series ----------------------------------------------------------------------
function Series(name, url, season, episode, incognito, selected) {
  this.name = name;
  this.url = url;
  this.season = season;
  this.episode = episode;
  this.incognito = incognito;
  this.selected = selected;
}
// logs series content to console
Series.prototype.log = function() {
  var properties = "";
  for(var property in this) {
    if(typeof this[property] !== typeof function(){})
      properties += property + ": " + this[property] + "\n";
  }
  console.log(properties);
};
// edits series
Series.prototype.edit = function(name, url, season, episode, incognito) {
  if(name != null)
    this.name = name;
  if(url != null)
    this.url = url;
  if(season != 0)
    this.season = season;
  if(episode != 0)
    this.episode = episode;
  this.incognito = incognito;
};
// @return trimmed series (only non-function properties)
// @param true: can be abused as clone function
Series.prototype.save = function(clone) {
  clone = typeof clone !== "undefined" ? clone : false;
  var seriesToStore = {};
  for(var property in this) {
    if(typeof this[property] !== typeof function(){}){
      if(property == "url")
        seriesToStore[property] = clone ? this[property] : encodeURL(this[property]);
      else
        seriesToStore[property] = this[property];
    }
  }
  return seriesToStore;
};

// SeriesList ------------------------------------------------------------------
function SeriesList(obj) {
  // @return number of properties (!= typeof function(){}) of @param obj
  var length = function(obj) {
    var numberOfSeries = 0;
    for(var series in obj) {
      if(typeof obj[series] !== typeof function(){}) {
        numberOfSeries++;
      }
    }
    return numberOfSeries;
  }
  // saves trimmed (no functions) list to sync storage
  this.save = function() {
    var seriesListToStore = {};
    for(var series in this) {
      if(typeof this[series] !== typeof function(){}) {
        seriesListToStore[series] = this[series].save();
      }
    }
    var save = {};
    save[storedSeries] = seriesListToStore;
    chrome.storage.sync.set(save);
  };
  // adds series to list (and saves changes to sync storage)
  // @param selected (optional), default true
  // @param save (optional), default true
  //                         false: less storage access in constructor
  this.add = function(name, url, season, episode, incognito, selected, save) {
    selected = typeof selected !== "undefined" ? selected : true;
    save = typeof save !== "undefined" ? save : true;
    var sname = name;
    for(var series in this) {
      if(typeof this[series] === typeof function(){}) {
        if(series == name) {
          sname = name + " ";
        }
      } else if(save) {
        this[series].selected = false;
      }
    }
    this[sname] = new Series(sname, url, season, episode, incognito, selected);
    if(save)
      this.save();
  };
  // deletes series: refreshes popup.html/redirects to edit.html if list empty
  this.delete = function(name, ifListEmpty, reload) {
    if(typeof this[name] !== typeof function(){})
      delete this[name];
    if(length(this) === 0) {
      ifListEmpty();
      chrome.storage.sync.remove(storedSeries);
    } else {
      reload();
      this.save();
    }
  };
  // selects series and saves changes
  this.select = function(name) {
    for(var series in this) {
      if(typeof this[series] !== typeof function(){})
        this[series].selected = false;
    }
    if(name != null && name in this)
      this[name].selected = true;
    this.save();
  };
  // @return selected series (from series list)
  this.getSelected = function() {
    var selected = null;
    for(var series in this) {
      var s = this[series];
      if(typeof s !== typeof function(){}) {
        if(s.selected) selected = s;
      }
    }
    return selected;
  };
  // @return true on success, false otherwise (e.g.: existing rename name)
  this.edit = function(name, url, season, episode, incognito) {
    if(!this[name]) { // name not in list
      var s = this.getSelected();
      if(s !== null) // rename
        delete this[s.name];        
      this.add(name, url, season, episode, incognito);
      return true;
    } else if(!this[name].selected) { // name not selected (wants to rename to
      return false;                   // existing name -> bad idea)
    } else {
      this[name].edit(name, url, season, episode, incognito);
      this.save();
      return true;
    }
  };
  // logs series list content to console
  this.log = function() {
    console.log("===== SeriesList =====");
    for(var series in this) {
      if(typeof this[series] !== typeof function(){}) {
        console.log("----- " + series + " -----");
        this[series].log();
      }
    }
  };
  // SeriesList constructor
  if(obj != null) {
    for(var property in obj) {
      var s = obj[property];
      this.add(s.name, decodeURL(s.url), s.season, s.episode, s.incognito, s.selected, false);
    }
  }
}

// Restore SeriesList from chrome sync storage ---------------------------------
function restore(ifListNotFound, ifListFound) {
  chrome.storage.sync.get(storedSeries, function(items) {
    try {
      if(chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
      } else {
        if(items[storedSeries] == null) {
          console.info("No series found!");
          ifListNotFound();
        } else {
          ifListFound(items[storedSeries]);
        }
      }
    } catch(e) {
      if(e.message == "items is not defined") {
        console.warn("No series found!");
        ifListNotFound();
      } else {
        console.error((new Date()).toJSON(), "exception.stack:", e.stack);
      }
    }
  });
}

// Decodes and unescapes all text
function decodeURL(s){
  var s1 = unescape(s.substr(0, s.length-1));
  var t = "";
  for(i = 0; i < s1.length; i++) t += String.fromCharCode(s1.charCodeAt(i) - (parseInt(s.substr(s.length-1, 1))+i)%10);
  return unescape(t);
}
// Encodes, in unicode format, all text then escapes the output
function encodeURL(s){
  var encN=1;
  s = escape(s);
  var ta = new Array();
  for(i = 0; i < s.length; i++) ta[i] = escape(String.fromCharCode(s.charCodeAt(i) + (encN+i)%10));
  return "" + ta.join("") + encN;
}
