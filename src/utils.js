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
            chrome.notifications.create("Episode++Notification", {type:"basic", iconUrl:"img/b/icon128.png", title:"Episode++", message:chrome.i18n.getMessage("nonIncognitoSeriesInIncognitoWindow")});
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
function getDefaultOptions() {
  var defaultDomains = getDefaultMirrorDomainList();
  var defaultOrder = []; // chang "bs.to" to Default
  for(var i=1; i<=defaultDomains["bs.to"].length; i++) { defaultOrder.push(i.toString()); }
  var defaultOptions = {};
  defaultOptions[storedOptions] = {order:defaultOrder, domains:defaultDomains, incognito:true, plainTextURL:false, showUnknownDomainNotification:true, iconColor:"#000000"};
  return defaultOptions;
}
// @return default mirror order
function getDefaultMirrorDomainList() {
  var defaultMirrors = [
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
  defaultDomains = {"bs.to":defaultMirrors};
  return defaultDomains;
}
// Draws icon with selected color
// http://demo.qunee.com/svg2canvas/
function setIconColor(color) {
  color = typeof color !== "undefined" ? color : document.getElementById("iconColor").value;
  var canvas = document.createElement("canvas");
  canvas.width = 19;
  canvas.height = 19;

  var ctx = canvas.getContext("2d");
  ctx.save();
  ctx.transform(0.07422,0,0,0.07422,0.03977875,0.03876088);
  ctx.save();
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(68.5,14);
  ctx.bezierCurveTo(37.848198,14,13,38.848197,13,69.5);
  ctx.bezierCurveTo(13,80.061488,15.941425,89.93939,21.0625,98.34375);
  ctx.bezierCurveTo(35.553604,126.77567,67.826155,151.43267,91.28125,169.09375);
  ctx.bezierCurveTo(94.800384,125.38361,131.38383,91,176,91);
  ctx.bezierCurveTo(189.996,91,203.20087,94.382553,214.84375,100.375);
  ctx.bezierCurveTo(215.17866,99.758537,215.49424,99.151307,215.8125,98.53125);
  ctx.bezierCurveTo(221.00621,90.085259,224,80.142317,224,69.5);
  ctx.bezierCurveTo(224,38.848197,199.1518,14,168.5,14);
  ctx.bezierCurveTo(146.49383,14,127.47584,26.807096,118.5,45.375);
  ctx.bezierCurveTo(109.52416,26.807096,90.506168,14,68.5,14);
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.transform(0.07422,0,0,0.07422,0.03977875,0.03876088);
  ctx.save();
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(176,110);
  ctx.bezierCurveTo(139.54921,110,110,139.54921,110,176);
  ctx.bezierCurveTo(110,212.45079,139.54921,242,176,242);
  ctx.bezierCurveTo(212.45079,242,242,212.45079,242,176);
  ctx.bezierCurveTo(242,139.54921,212.45079,110,176,110);
  ctx.closePath();
  ctx.moveTo(162,133);
  ctx.lineTo(190,133);
  ctx.lineTo(190,162);
  ctx.lineTo(219,162);
  ctx.lineTo(219,190);
  ctx.lineTo(190,190);
  ctx.lineTo(190,219);
  ctx.lineTo(162,219);
  ctx.lineTo(162,190);
  ctx.lineTo(133,190);
  ctx.lineTo(133,162);
  ctx.lineTo(162,162);
  ctx.lineTo(162,133);
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  chrome.browserAction.setIcon({
    imageData: ctx.getImageData(0, 0, 19, 19)
  });
}
