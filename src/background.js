var alreadyClicked = false;
var timer;
var storedTabID = "episode++TabID";
var funMap = {"proxer.me":buildProxerURL, "bs.to":findeEpisodeString,
              "animehaven.org":buildAnimehavenURL, "kinox":buildKinoxURL,
              "91.202.61.170":buildKinoxURL};

// Entry: single/double click listener------------------------------------------
chrome.browserAction.onClicked.addListener(function(tab) {
  if (alreadyClicked) {
    clearTimeout(timer);
    setPopup(); // ----> Process double click <----
    alreadyClicked = false; // Clear all clicks
    return;
  }
  alreadyClicked = true;
  var  DOUBLECLICK_TIME = 250; // Timer to detect next click
  timer = setTimeout(function () { // ----> Process single click <----
    processSingleClick();
    clearTimeout(timer); // Clear all timers
    alreadyClicked = false; // Ignore clicks
  }, DOUBLECLICK_TIME);
});

// Check tabs/windows removed --------------------------------------------------
chrome.tabs.onRemoved.addListener(
  function(tabID) {
    var ids = localStorage.getItem(storedTabID);
    if(ids != null && ids.split("|")[1] == tabID) {
      localStorage.setItem(storedTabID, 0);
    }
  });

chrome.windows.onRemoved.addListener(
  function(windowID) {
    var ids = localStorage.getItem(storedTabID);
    if(ids != null && ids.split("|")[0] == windowID) {
      localStorage.setItem(storedTabID, 0);
    }
  }
);

// Create context menus (limited to 6) -----------------------------------------
chrome.runtime.onInstalled.addListener(function(){restore(createContextMenu, createContextMenu);});
restore(setPopup, ifListFoundAddContextMenuOnClickedListeners);
addStorageOnChangedListenerForContexMenu();

// Process double click: setPopup (see Helper functions) -----------------------

// Process single click --------------------------------------------------------
function processSingleClick(){
  restore(setPopup, ifListFound);
}

function ifListFound(items) {
  var seriesList = new SeriesList(items);
  var selected = seriesList.getSelected();
  if(selected === null) {
    setPopup();
  } else if(selected.url == null) {
    setPopup();
  } else {
    if(parseInt(selected.season) === 0) seriesList.edit(selected.name, selected.url, 1, selected.episode, selected.incognito);
    if(parseInt(selected.episode) === 0) seriesList.edit(selected.name, selected.url, selected.season, 1, selected.incognito);
    updateURL(selected.save(true), seriesList);
    seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)+1, selected.incognito);
  }
}

function updateURL(series, seriesList) {
  var url = parseURL(series.url);
  var chosenFunction = funMap[url.hostname] ? funMap[url.hostname] : funMap[url.hostname.split(".")[0]];
  if(!chosenFunction) {
    alert(url.hostname + " not yet supported!");
    setPopup();
  } else {
    chosenFunction(url, series, seriesList);
  }
}
// The kinox way
function buildKinoxURL(url, series, seriesList) {
  open(url.protocol + "//" + url.host + url.pathname + ",s" + series.season + "e" + series.episode, series.incognito);
}
// The proxer way (no season support)
function buildProxerURL(url, series, seriesList) {
  var path = url.pathname.split("/");
  path.splice(3,1,series.episode);
  open(url.protocol + "//" + url.host + path.join("/"), series.incognito);
}
// The animehaven way
function buildAnimehavenURL(url, series, seriesList) {
  var path = url.pathname.split("/");
  if(path[1] == "episodes") {
    path.splice(1,1);
    open(url.protocol + "//" + url.host + path.join("/") + "-episode-" + series.episode, series.incognito);
  } else {
    var ep = path[path.length-1].split("-");
    ep.splice((parseInt(series.season)==2) ? ep.length-2 : ep.length-1, 1, series.episode);
    open(url.protocol + "//" + url.host + "/" + path.splice(1,1).join("/") + "/" + ep.join("-"), series.incognito);
  }
}
// The bs way
function findeEpisodeString(url, series, seriesList) {
  var path = url.pathname.split("/");
  if(path[3] != series.season) {
    path.splice(3,path.length-3,series.season);
    series.url = url.protocol + "//" + url.host + path.join("/");
    url = parseURL(series.url);
  }
  $.ajax({
    url      : series.url,
    dataType : 'html',
    success  : function(data) {
      var newPath = getBeginningSelector(url, series.season, series.episode);
      var response = $('<html />').html(data);
      var links = $(response).find("a[href^='"+newPath+"'][href$='/Streamcloud-1']");
      if(links.length) {
        var link = links[0].href.split("/");
        link.pop();
        buildBsURL(url, series.season, link.pop(), series.incognito);
      } else {
        if(nextSeasonFound(newPath, response)) {
          series.season++;
          series.episode = 1;
          seriesList.edit(series.name, series.url, series.season, 2, series.incognito);
          findeEpisodeString(url, series, seriesList);
        } else {
          setPopup();
        }
      }
    }
  });
}

function nextSeasonFound(newPath, response) {
  var path = newPath.split("/");
  path.splice(2,2,(parseInt(path[2])+1).toString());
  newPath = path.join("/");
  var found = $(response).find("a[href='"+newPath+"']");
  if(found.length)
    return true;
  else
    return false;
}

function getBeginningSelector(url, season, episode) {
  var pathname = url.pathname;
  var path = pathname.split("/");
  if(path.length > 4) {
    path.splice(4,2,episode+"-");
  } else {
    if(path[path.length-1] == "") path.splice(path.length-1,1);
    path.splice(3,1,season+"/"+episode+"-");
  }
  var newPath = path.slice(1,path.length).join("/");
  return newPath;
}
// Callback function for request processing
function buildBsURL(url, season, episode, incognito) {
  var path = url.pathname.split("/");
  if(path.length < 6) {
    path.splice(3,2,season+"/"+episode+"/Streamcloud-1");
  } else {
    path.splice(4,1,episode);
  }
  open(url.protocol + "//" + url.host + path.join("/"), incognito);
}

// Creates incognito window/tab of given url -----------------------------------
function open(url, incognito) {
  incognito = typeof incognito !== "undefined" ? incognito : true;
  chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess) {
    var ids = localStorage.getItem(storedTabID);
    var windowID = 0;
    var tabID = 0;
    var incognitoWindow = false;
    var create = false;
    if(ids != null) {
      var idsarr = ids.split("|");
      windowID = idsarr[0];
      tabID = idsarr[1];
      incognitoWindow = idsarr.length == 3 ? true : false;
    }
    if(incognito) {
      if(isAllowedAccess){
        if(windowID != 0 && tabID != 0 && incognitoWindow) {
          chrome.tabs.update(parseInt(tabID),{url:url});
        } else create = true;
      } else create = true;
      if(create) {
        chrome.windows.create({url:url, incognito:incognito, state:"maximized"}, function(window) {
          if(isAllowedAccess) {
            localStorage.setItem(storedTabID, window.id+"|"+window.tabs[0].id+"|incognito");
          }
        });
      }
    } else {
      if(windowID != 0 && tabID != 0 && !incognitoWindow) {
        chrome.tabs.update(parseInt(tabID),{url:url});
      } else {
        chrome.tabs.create({url:url}, function(tab){
          localStorage.setItem(storedTabID, tab.windowId+"|"+tab.id);
        });
      }
    }
  });
}

// Helper functions ------------------------------------------------------------
function setPopup() {
  chrome.browserAction.setPopup({popup:"popup.html"});
}

function unsetPopup() {
  chrome.browserAction.setPopup({popup:""});
}

function parseURL(url) {
  var parser = document.createElement('a'),
      searchObject = {},
      queries, split, i;
  parser.href = url; // Let the browser do the work
  // Convert query string to object
  queries = parser.search.replace(/^\?/, '').split('&');
  for( i = 0; i < queries.length; i++ ) {
    split = queries[i].split('=');
    searchObject[split[0]] = split[1];
  }
  return {
    protocol: parser.protocol,
    host: parser.host,
    hostname: parser.hostname,
    port: parser.port,
    pathname: parser.pathname,
    search: parser.search,
    searchObject: searchObject,
    hash: parser.hash
  };
}
