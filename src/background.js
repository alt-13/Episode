var alreadyClicked = false;
var timer;
var funMap = {"proxer.me":buildProxerURL, "bs.to":findeEpisodeString,
              "animehaven.org":buildAnimehavenURL, "kinox":buildKinoxURL,
              "91.202.61.170":buildKinoxURL, "netflix":buildNetflixURL};

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
    restore(setPopup, ifListFoundOpenNewestEpisode);
    clearTimeout(timer); // Clear all timers
    alreadyClicked = false; // Ignore clicks
  }, DOUBLECLICK_TIME);
});

// Check tabs/windows removed --------------------------------------------------
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  var ids = getTabID();
  if(ids !== null && ids.windowID == removeInfo.windowId && ids.tabID == tabId) {
    setTabID(0);
  }
});

chrome.windows.onRemoved.addListener(function(windowId) {
  var ids = getTabID();
  if(ids !== null && ids.windowID == windowId) {
    setTabID(0);
  }
});

// Create context menus (limited to 6) -----------------------------------------
chrome.runtime.onInstalled.addListener(function(){restore(createContextMenu, createContextMenu);});
restore(setPopup, ifListFoundAddContextMenuOnClickedListeners);
addStorageOnChangedListenerForContexMenu();

// Process double click: setPopup (see utils) ----------------------------------

// Process single click --------------------------------------------------------
function ifListFoundOpenNewestEpisode(seriesList) {
  var selected = seriesList.getSelected();
  if(selected === null) {
    setPopup();
  } else if(selected.url === "") {
    setPopupTo("edit.html");
  } else {
    var url = parseURL(selected.url);
    if(url.hostname !== "bs.to" && parseInt(selected.season) === 0) seriesList.edit(selected.name, selected.url, 1, selected.episode, selected.incognito);
    if(parseInt(selected.episode) === 0) seriesList.edit(selected.name, selected.url, selected.season, 1, selected.incognito);
    updateURL(url, selected.save(true), seriesList);
    seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)+1, selected.incognito);
  }
}

function updateURL(url, series, seriesList) {
  var chosenFunction = funMap[url.hostname] ? funMap[url.hostname] : (funMap[url.hostname.split(".")[0]] ? funMap[url.hostname.split(".")[0]] : funMap[url.hostname.split(".")[1]]);
  if(!chosenFunction) {
    chrome.notifications.create("Episode++Notification", {type:"basic", iconUrl:"img/icon128.png", title:"Episode++", message:chrome.i18n.getMessage("notYetSupported",url.hostname)});
    openURL(series.url, series.incognito);
  } else {
    chosenFunction(url, series, seriesList);
  }
}
// The netflix way (no season support) -----------------------------------------
function buildNetflixURL(url, series, seriesList) {
  var path = url.pathname.split("/");
  path.splice(2,1,(parseInt(path[2])+parseInt(series.episode)-1).toString());
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito);
}
// The kinox way ---------------------------------------------------------------
function buildKinoxURL(url, series, seriesList) {
  openURL(url.protocol + "//" + url.host + url.pathname + ",s" + series.season + "e" + series.episode, series.incognito);
}
// The proxer way (no season support) ------------------------------------------
function buildProxerURL(url, series, seriesList) {
  var path = url.pathname.split("/");
  path.splice(3,1,series.episode);
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito);
}
// The animehaven way (experimental) -------------------------------------------
function buildAnimehavenURL(url, series, seriesList) {
  var path = url.pathname.split("/");
  var ep = path[path.length-1].split("-");
  ep.splice((parseInt(series.season)>1 || !isNaN(parseInt(ep[ep.length-2]))) ? ep.length-2 : ep.length-1, 1, series.episode);
  openURL(url.protocol + "//" + url.host + "/" + path.splice(1,1).join("/") + "/" + ep.join("-"), series.incognito);
}
// The bs way ------------------------------------------------------------------
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
  openURL(url.protocol + "//" + url.host + path.join("/"), incognito);
}
