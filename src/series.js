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
    if(typeof this[property] !== "function")
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
  if(season >= 0)
    this.season = season;
  if(episode >= 0)
    this.episode = episode;
  this.incognito = incognito;
};
// @return trimmed series (only non-function properties)
// @param true: can be abused as clone function
Series.prototype.save = function(clone) {
  clone = typeof clone !== "undefined" ? clone : false;
  var seriesToStore = {};
  for(var property in this) {
    if(typeof this[property] !== "function") {
      if(property == "url")
        seriesToStore[property] = clone ? this[property] : encodeURL(this[property]);
      else
        seriesToStore[property] = this[property];
    }
  }
  return seriesToStore;
};

// SeriesList ------------------------------------------------------------------
function SeriesList(seriesList, plainTextURL) {
  var fragments_ = 1;
  var plainTextURL_ = plainTextURL !== "undefined" ? plainTextURL : false;
  // @return number of series (typeof series != "function") of @param seriesList
  var length = function(seriesList) {
    var numberOfSeries = 0;
    for(var series in seriesList) {
      if(typeof seriesList[series] !== "function") {
        numberOfSeries++;
      }
    }
    return numberOfSeries;
  };
  // saves trimmed (no functions) list to sync storage
  this.save = function() {
    var seriesListToStore = {};
    var frags = 1;
    var storedSeriesPart = storedSeries;
    for(var series in this) {
      if(typeof this[series] !== "function") {
        var sListBytes = JSON.stringify(seriesListToStore).length;
        var sBytes = JSON.stringify(this[series]).length;
        if(sListBytes + sBytes > 8000) { //Exact: 8192 (calcs are not 100%)
          storedSeriesPart = frags === 1 ? storedSeries : storedSeries+frags.toString();
          seriesListToStore.__fragments__ = ++frags;
          var save = {};
          save[storedSeriesPart] = seriesListToStore;
          chrome.storage.sync.set(save, function(){
            if(chrome.runtime.lastError) {
              console.error("SeriesList chunk was too big or too many chunks have been produced.\n"+chrome.runtime.lastError.message);
            }
          });
          seriesListToStore = {};
        }
        seriesListToStore[series] = plainTextURL_ ? this[series].save(true) : this[series].save();
      }
    }
    // delete chunk if not needed anymore
    while(frags < fragments_) {
      chrome.storage.sync.remove(storedSeries+fragments_.toString(), function(){if(chrome.runtime.lastError)console.error(chrome.runtime.lastError.message);});
      fragments_--;
    }
    storedSeriesPart = frags === 1 ? storedSeries : storedSeries+frags.toString();
    seriesListToStore.__fragments__ = frags;
    var save = {};
    save[storedSeriesPart] = seriesListToStore;
    var bytes = JSON.stringify(save).length;
    chrome.storage.sync.set(save, function(){
      if(chrome.runtime.lastError) {
        console.error("SeriesList chunk was too big.");
      }
    });
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
      if(typeof this[series] === "function") {
        if(series == name) {
          sname = name + " ";
        }
      } else if(save) { // deselects all others (except new one)
        this[series].selected = false;
      }
    }
    this[sname] = new Series(sname, url, season, episode, incognito, selected);
    if(save) {
      this.save();
    }
    if(save || this[sname].selected) {
      chrome.browserAction.setTitle({title:sname+" - S"+this[sname].season+"E"+this[sname].episode});
    }
  };
  // deletes series: refreshes popup.html/redirects to edit.html if list empty
  this.delete = function(name, ifListEmpty, reload) {
    if(typeof this[name] !== "function") {
      delete this[name];
      chrome.browserAction.setTitle({title:"\""+name+"\" has been deleted."});
    }
    if(length(this) === 0) {
      ifListEmpty();
      chrome.storage.sync.remove(storedSeries);
      chrome.browserAction.setTitle({title:"Episode++\n\nDoubleclick to aktivate popup!"});
    } else {
      reload();
      this.save();
    }
  };
  // selects series and saves changes
  this.select = function(name) {
    for(var series in this) {
      if(typeof this[series] !== "function")
        this[series].selected = false;
    }
    if(name != null && name in this) {
      chrome.browserAction.setTitle({title:name+" - S"+this[name].season+"E"+this[name].episode});
      this[name].selected = true;
    }
    this.save();
  };
  // @return selected series (from series list)
  this.getSelected = function() {
    var selected = null;
    for(var series in this) {
      var s = this[series];
      if(typeof s !== "function") {
        if(s.selected) selected = s;
      }
    }
    return selected;
  };
  // @return true on success, false otherwise (e.g.: existing rename name)
  this.edit = function(name, url, season, episode, incognito) {
    if(!this[name] || typeof this[name] === "function") { // name not in list
      var s = this.getSelected(); // add new series deselects all
      if(s !== null) // rename
        delete this[s.name];        
      this.add(name, url, season, episode, incognito);
      return true;
    } else if(!this[name].selected) { // name not selected (wants to rename to
      return false;                   // existing name -> bad idea)
    } else {
      this[name].edit(name, url, season, episode, incognito);
      this.save();
      chrome.browserAction.setTitle({title:name+" - S"+season+"E"+episode});
      return true;
    }
  };
  // merges entries into current series list (seriesList + seriesList)
  this.merge = function(seriesList) {
    if(seriesList !== null) {
      for(var series in seriesList) {
        if(series !== "__fragments__") {
          var s = seriesList[series];
          var surl = (s.url.substring(0, 4) === "http") ? s.url : decodeURL(s.url);
          this.add(s.name, surl, s.season, s.episode, s.incognito, s.selected, false);
        } else {
          fragments_ = seriesList[series];
        }
      }
    }
  };
  // checks if name is available while editing
  this.checkNameOK = function(name) {
    if(typeof name === "undefined" || name === "")
      return false;
    else if(!this[name])
      return true;
    else if(!this[name].selected)
      return false;
    else
      return true;
  };
  // fills select options into popup dropdown
  this.fillInSelectOptions = function(select) {
    for(var series in this) {
      if(typeof this[series] !== "function") {
        var el = document.createElement("option");
        if(this[series].selected)
          el.selected = true;
        el.innerHTML = this[series].name;
        el.value = this[series].name;
        select.appendChild(el);
      }
    }
  };
  // logs series list content to console
  this.log = function() {
    console.log("===== SeriesList =====");
    for(var series in this) {
      if(typeof this[series] !== "function") {
        console.log("----- " + series + " -----");
        this[series].log();
      }
    }
  };
  // SeriesList constructor
  if(seriesList !== null) {
    for(var series in seriesList) {
      if(series !== "__fragments__") {
        var s = seriesList[series];
        var surl = (s.url.substring(0, 4) === "http") ? s.url : decodeURL(s.url);
        this.add(s.name, surl, s.season, s.episode, s.incognito, s.selected, false);
      } else {
        fragments_ = seriesList[series];
      }
    }
  }
}

// Restore SeriesList from chrome sync storage ---------------------------------
// @param ifListNotFound, ifListFound: necessary
// @param frags, fragInProcess, seriesList: optional, list containing >1 frags
function restore(ifListNotFound, ifListFound, frags, fragInProcess, seriesList) {
  frags = typeof frags !== "undefined" ? frags : 1;
  fragInProcess = typeof fragInProcess !== "undefined" ? fragInProcess : 1;
  if(fragInProcess > 511) { // because options also stored in one mem fragment
    console.error("MAX_ITEMS for sync storage reached!");
    ifListNotFound();
  }
  var storedSeriesPart = frags === 1 ? storedSeries : storedSeries+fragInProcess.toString();
  chrome.storage.sync.get(getStorage(storedSeriesPart), function(items) {
    try {
      if(chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
      } else {
        if(items[storedSeriesPart] == null) {
          console.info("No series found!");
          ifListNotFound();
        } else {
          if(fragInProcess === 1) {
            seriesList = new SeriesList(items[storedSeriesPart], items[storedOptions].plainTextURL);
            frags = parseInt(items[storedSeriesPart].__fragments__);
          } else {
            seriesList.merge(items[storedSeriesPart]);
            frags = parseInt(items[storedSeriesPart].__fragments__);
          }
          if(frags - fragInProcess > 0) {
            restore(ifListNotFound, ifListFound, frags, fragInProcess+1, seriesList);
          } else {
            ifListFound(seriesList, items[storedOptions]);
          }
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
