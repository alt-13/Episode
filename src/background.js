var alreadyClicked = false;
var timer;
var funMap = {"proxer.me":buildProxerURL, "bs.to":findeEpisodeString,
              "animehaven.to":buildAnimehavenURL, "kinox":buildKinoxURL,
              "91.202.61.170":buildKinoxURL, "netflix":buildNetflixURL,
              "youtube":buildYoutubeURL};

// Entry: single/double click listener------------------------------------------
chrome.browserAction.onClicked.addListener(function() {
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

// On installation: set icon color and create context menus (limited to 6) -----
chrome.runtime.onInstalled.addListener(function(){restore(onInstall, onInstall);});
function onInstall(seriesList, options) {
  createContextMenu(seriesList);
  setIconColor(options.iconColor);
}
restore(setPopup, ifListFoundAddContextMenuOnClickedListeners);
addStorageOnChangedListenerForContexMenu();

// Process double click: setPopup (see utils) ----------------------------------

// Process single click --------------------------------------------------------
function ifListFoundOpenNewestEpisode(seriesList, options) {
  var selected = seriesList.getSelected();
  if(selected === null) {
    setPopup();
  } else if(selected.url === "") {
    setPopupTo("edit.html");
  } else {
    var url = parseURL(selected.url);
    if(url.hostname !== "bs.to" && parseInt(selected.season) === 0) seriesList.edit(selected.name, selected.url, 1, selected.episode, selected.incognito, selected.contextMenu);
    if(url.hostname !== "www.youtube.com" && parseInt(selected.episode) === 0) seriesList.edit(selected.name, selected.url, selected.season, 1, selected.incognito, selected.contextMenu);
    selectService(url, selected.save(true), seriesList, options);
    seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)+1, selected.incognito, selected.contextMenu);
  }
}

function selectService(url, series, seriesList, options) {
  var chosenFunction = funMap[url.hostname] ? funMap[url.hostname] : (funMap[url.hostname.split(".")[0]] ? funMap[url.hostname.split(".")[0]] : funMap[url.hostname.split(".")[1]]);
  if(!chosenFunction) {
    if(options.showUnknownDomainNotification) {
      console.log("yeah wtf: "+url.hostname);
      var myNotificationID = null;
      chrome.notifications.create("Episode++Notification", {
        type:"basic",
        iconUrl:"img/icon128.png",
        title:"Episode++",
        message:chrome.i18n.getMessage("notYetSupported",url.hostname),
        buttons:[{title:chrome.i18n.getMessage("disableNotification")}]
      }, function(id) { myNotificationID = id; });
      chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
        if(notifId === myNotificationID) {
          chrome.runtime.openOptionsPage();
        }
      });
    }
    openURL(series.url, series.incognito, seriesList);
  } else {
    chosenFunction(url, series, seriesList, options);
  }
}
// The netflix way (no season support) -----------------------------------------
function buildNetflixURL(url, series, seriesList, options) {
  var path = url.pathname.split("/");
  path.splice(2,1,(parseInt(path[2])+parseInt(series.episode)-1).toString());
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito, seriesList);
}
// The youtube way -------------------------------------------------------------
function buildYoutubeURL(url, series, seriesList, options) {
  if(url.searchObject.hasOwnProperty("list")) {
    openURL(url.protocol + "//" + url.host + "/embed/videoseries?list=" + url.searchObject.list + "&index=" + series.episode + (options.youtubeAutoplay ? "&autoplay=1" : ""), series.incognito, seriesList);
  } else {
    openURL(url.protocol + "//" + url.host + url.pathname + url.search + (options.youtubeAutoplay ? "&autoplay=1" : ""), series.incognito, seriesList);
  }
}
// The kinox way ---------------------------------------------------------------
function buildKinoxURL(url, series, seriesList, options) {
  openURL(url.protocol + "//" + url.host + url.pathname + ",s" + series.season + "e" + series.episode, series.incognito, seriesList);
}
// The proxer way (no season support) ------------------------------------------
function buildProxerURL(url, series, seriesList, options) {
  var path = url.pathname.split("/");
  path.splice(3,1,series.episode);
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito, seriesList);
}
// The animehaven way (experimental) -------------------------------------------
function buildAnimehavenURL(url, series, seriesList, options) {
  var path = url.pathname.split("/");
  var ep = path[path.length-1].split("-");
  ep.splice((parseInt(series.season)>1 || !isNaN(parseInt(ep[ep.length-2]))) ? ep.length-2 : ep.length-1, 1, series.episode);
  openURL(url.protocol + "//" + url.host + "/" + path.splice(1,1).join("/") + "/" + ep.join("-"), series.incognito, seriesList);
}
// The bs way ------------------------------------------------------------------
function findeEpisodeString(url, series, seriesList, options) {
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
      var links = findLinkToFavouriteMirror(newPath, options, response);
      if(typeof links !== "undefined") {
        var link = links[0].href.split("/");
        var mirror = link.pop();
        buildBsURL(url, series, link.pop(), mirror, seriesList, options);
      } else {
        if(nextSeasonFound(newPath, response)) {
          series.season++;
          series.episode = 1;
          seriesList.edit(series.name, series.url, series.season, 2, series.incognito, series.contextMenu);
          findeEpisodeString(url, series, seriesList, options);
        } else {
          setPopup();
        }
      }
    }
  });
}
// @return link with preferential mirror
function findLinkToFavouriteMirror(newPath, options, response) {
  var mirrors = options.domains["bs.to"].mirrorList;
  var mirror;
  var links;
  for(var m = 0; m < mirrors.length; m++) {
    mirror = mirrors[m][Object.keys(mirrors[m])[0]];
    links = $(response).find("a[href^='"+newPath+"'][href$='/"+mirror+"']");
    if(links.length) {
      return links;
    }
  }
}
// @return true there is another season, false otherwise
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
// @return string for finding the correct href
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
// opens bs url or the link to the mirror directly
function buildBsURL(url, series, episode, mirror, seriesList, options) {
  var path = url.pathname.split("/");
  var newPath = path[0]+"/"+path[1]+"/"+path[2]+"/"+series.season+"/"+episode+"/"+mirror;
  var newURL = url.protocol + "//" + url.host + newPath;
  if(options.directLink) {
    $.ajax({
      url      : newURL,
      dataType : 'html',
      success  : function(data) {
        var response = $('<html />').html(data);
        var directLink = $(response).find("a").filter(":contains('Link zum Originalvideo')")[0].href;
        openURL(directLink, series.incognito, seriesList);
      }
    });
  } else {
    openURL(newURL, series.incognito, seriesList);
  }
}
