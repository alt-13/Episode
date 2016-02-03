// Creates incognito window/tab of given url
function open(url, incognito, close) {
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
      else
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
    tabInfo.windowID = idsarr[0];
    tabInfo.tabID = idsarr[1];
    tabInfo.incognito = idsarr.length == 3 ? true : false;
  } else return null;
  return tabInfo;
}
// Sets ID of tab in use
function setTabID(tabID) {
  localStorage.setItem("episode++TabID", tabID);
}
// Creates new tab
function createTab(url) {
  chrome.tabs.create({url:url}, function(tab){
    setTabID(tab.windowId+"|"+tab.id);
  });
}
// Creates new window
function createWindow(url, incognito, isAllowedAccess) {
  chrome.windows.create({url:url, incognito:incognito, state:"maximized"}, function(window) {
    if(isAllowedAccess) {
      setTabID(window.id+"|"+window.tabs[0].id+"|incognito");
    }
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
