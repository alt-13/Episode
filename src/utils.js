var storedOptions = "episode++Options"; // Options in sync storage
// Creates incognito window/tab of given url
function openURL(url, incognito, seriesList, close) {
  close = typeof close !== "undefined" ? close : false;
  chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess) {
    var ids = getTabID();
    if(ids === null) { // create
      if(incognito)
        createWindow(url, incognito, isAllowedAccess);
      else
        createTab(url);
    } else if((ids.incognito && incognito) || !(ids.incognito || incognito)) { // update
      updateTab(ids.tabID, url);
    } else {
      if(incognito)
        createWindow(url, incognito, isAllowedAccess);
      else if(isAllowedAccess && ids.incognito && !incognito) {
        chrome.windows.getCurrent(function(window) {
          if(window.incognito && !incognito && ids.srcWindowID == 0) {
            chrome.notifications.create("Episode++Notification", {type:"basic", iconUrl:"img/icon128.png", title:"Episode++", message:chrome.i18n.getMessage("nonIncognitoSeriesInIncognitoWindow")});
            var selected = seriesList.getSelected();
            seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)-1, selected.incognito);
          } else if(window.incognito && !incognito && ids.srcWindowID != 0) {
            chrome.windows.update(parseInt(ids.srcWindowID), {focused:true});
            createTab(url, ids.srcWindowID);
          } else {
            createTab(url);
          }
        });
      } else
        createTab(url);
    }
    if(close) {
      unsetPopup();
      window.close();
    }
  });
}
// Sets popup to "popup.html"
function setPopup() {
  chrome.browserAction.setPopup({popup:"popup.html"});
}
// Unsets popup
function unsetPopup() {
  chrome.browserAction.setPopup({popup:""});
}
// Sets popup to given string
function setPopupTo(popup) {
  chrome.browserAction.setPopup({popup:popup});
}
// Fretches ID of tab in use
function getTabID() {
  var ids = localStorage.getItem("episode++TabID");
  var tabInfo = {};
  if(ids != null && ids !== "0") {
    var idsarr = ids.split("|");
    tabInfo.srcWindowID = idsarr[0];
    tabInfo.windowID = idsarr[1];
    tabInfo.tabID = idsarr[2];
    tabInfo.incognito = idsarr.length == 4 ? true : false;
  } else return null;
  return tabInfo;
}
// Sets ID of tab in use
function setTabID(tabID) {
  localStorage.setItem("episode++TabID", tabID);
}
// Creates new tab
function createTab(url, srcWindowID) {
  srcWindowID = typeof srcWindowID !== "undefined" ? parseInt(srcWindowID) : null;
  chrome.tabs.create(srcWindowID === null ? {url:url} : {windowId:srcWindowID, url:url}, function(tab){
    setTabID((srcWindowID===null?tab.windowId:srcWindowID)+"|"+tab.windowId+"|"+tab.id);
  });
}
// Creates new window
function createWindow(url, incognito, isAllowedAccess) {
  chrome.windows.getCurrent(function(srcWindow) {
    chrome.windows.create({url:url, incognito:incognito, state:"maximized"}, function(window) {
      if(isAllowedAccess) {
        setTabID(srcWindow.id+"|"+window.id+"|"+window.tabs[0].id+"|incognito");
      }
    });
    chrome.windows.onRemoved.addListener(function(windowId){
      if(windowId === srcWindow.id && isAllowedAccess) {
        var tabID = getTabID();
        setTabID(0+"|"+tabID.windowID+"|"+tabID.tabID+"|incognito");
      }
    });
  });
}
// Updates tab
function updateTab(tabID, url) {
  chrome.tabs.update(parseInt(tabID),{url:url}, function(){
    if(chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
      createTab(url);
    }
  });
}
// Parses a given URL
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
// Localize by replacing __MSG_***__ meta tags
function localizeHtmlPage()
{
  var objects = document.getElementsByTagName('html');
  for (var j = 0; j < objects.length; j++)
  {
    var obj = objects[j];
    var valStrH = obj.innerHTML.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });
    if(valNewH != valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}
// @return (chunk of) series list with options
function getStorage(storedSeriesMemChunk) {
  var storage = getDefaultOptions();
  storage[storedSeriesMemChunk] = {};
  return storage;
}
// @return default options
function getDefaultOptions(order) {
  order = order !== "undefined" ? order : [];
  var defaultOptions = {};
  defaultOptions[storedOptions] = {order:order, incognito:true, plainTextURL:false, showUnknownHostNotification:true};
  return defaultOptions;
}
// @return default mirror order
function getDefaultMirrorOrder() {
  var mirrors = [
    {Vivo:"Vivo-1"},
    {OpenLoad:"OpenLoad-1"},
    {FlashX:"FlashX-1"},
    {AuroraVid:"AuroraVid-1"},
    {BitVID:"BitVID-1"},
    {CloudTime:"CloudTime-1"},
    {Shared:"Shared-1"},
    {FileNuke:"FileNuke-1"},
    {Streamcloud:"Streamcloud-1"},
    {WholeCloud:"WholeCloud-1"},
    {YouWatch:"YouWatch-1"}
  ];
  return mirrors;
}