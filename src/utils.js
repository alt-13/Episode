// Content:
// public:  openURL, setPopup, unsetPopup, setPopupTo, getTabID, setTabID,
//          parseURL, localizeHtmlPage, getStorage, getDefaultOptions,
//          getDefaultMirrorDomainList, setIconColor, dragEnter, dragStart,
//          playSound
// private: createTab, createWindow, updateTab, isBefore
var storedOptions = "episode++Options"; // Options in sync storage
var hostNames = ["proxer.me", "bs.to", "animehaven.to", "kinox", "91.202.61.170",
                "netflix.com", "www.youtube.com"];
var openURLCallCount = 0;
// Creates incognito window/tab of given url
// @param url - url to open in window/tab
// @param incognito - open in incognito window/tab
// @param seriesList - list containing all series
// @param options - contains replace tab option
// @param close - close animehaven selection popup (usage: ah.js)
function openURL(url, incognito, seriesList, options, close) {
  close = typeof close !== "undefined" ? close : false;
  chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess) {
    var ids = getTabIDs();
    if(!options.replaceTab || ids === null) { // create
      if(incognito)
        createWindow(url, incognito, isAllowedAccess);
      else
        createTab(url);
    } else if((ids[0].incognito && incognito) || !(ids[0].incognito || incognito)) { // update
      var pipe_count = (seriesList.getSelected().url.match(/\s\|\s/g) || []).length;
      if(pipe_count >= ids.length) {
        addTab(ids[0].windowID, url);
      }
      else {
        if(openURLCallCount >= ids.length)
          openURLCallCount = 0;
        updateTab(ids[openURLCallCount].tabID, url);
        openURLCallCount++;
      }
    } else {
      if(incognito)
        createWindow(url, incognito, isAllowedAccess);
      else if(isAllowedAccess && ids[0].incognito && !incognito) {
        chrome.windows.getCurrent(function(window) {
          if(window.incognito && !incognito && ids[0].srcWindowID == 0) {
            var myNotificationID = null;
            chrome.notifications.create("Episode++Notification", {
              type:"basic",
              iconUrl:"img/icon128.png",
              title:"Episode++",
              message:chrome.i18n.getMessage("nonIncognitoSeriesInIncognitoWindow"),
              buttons:[
                {title:chrome.i18n.getMessage("openInNormalWindow")},
                {title:chrome.i18n.getMessage("openInIncognitoWindow")}
              ]
            }, function(id) { myNotificationID = id; });
            chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
              if(notifId === myNotificationID) {
                if(btnIdx === 0) // normal window
                  createWindow(url, incognito, isAllowedAccess);
                else if(btnIdx === 1) // incognito window
                  updateTab(ids[0].tabID, url);
                chrome.notifications.clear(myNotificationID);
              }
            });
            chrome.notifications.onClosed.addListener(function(){
              var selected = seriesList.getSelected();
              seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)-1, selected.incognito, selected.contextMenu);
            });
          } else if(window.incognito && !incognito && ids[0].srcWindowID != 0) {
            chrome.windows.update(parseInt(ids[0].srcWindowID), {focused:true});
            createTab(url, ids[0].srcWindowID);
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
function getTabIDs() {
  var ids = localStorage.getItem("episode++TabIDs");
  var tabInfos = [];
  if(ids != null && ids !== "0") {
    var idsarr = ids.split("|");
    for(i = 0; i < idsarr.length; i += 4) {
      var tabInfo = {};
      tabInfo.srcWindowID = idsarr[i+0];
      tabInfo.windowID = idsarr[i+1];
      tabInfo.tabID = idsarr[i+2];
      tabInfo.incognito = idsarr[i+3] == "i" ? true : false;
      tabInfos.push(tabInfo);
    }
  } else return null;
  return tabInfos;
}
// Sets ID of tab in use
function setTabIDs(tabIDs, replace) {
  replace = typeof replace !== "undefined" ? replace : false;
  var ids = localStorage.getItem("episode++TabIDs");
  if(ids != null && ids !== "0" && tabIDs !== 0 && !replace) {
    tabIDs = ids+"|"+tabIDs;
  }
  localStorage.setItem("episode++TabIDs", tabIDs);
}
// Creates new tab
function createTab(url, srcWindowID) {
  srcWindowID = typeof srcWindowID !== "undefined" ? parseInt(srcWindowID) : null;
  chrome.tabs.create(srcWindowID === null ? {url:url} : {windowId:srcWindowID, url:url}, function(tab){
    setTabIDs((srcWindowID===null?tab.windowId:srcWindowID)+"|"+tab.windowId+"|"+tab.id+"|n");
  });
}
// Creates new window
function createWindow(url, incognito, isAllowedAccess) {
  chrome.windows.getCurrent(function(srcWindow) {
    chrome.windows.create({url:url, incognito:incognito, state:"maximized"}, function(window) {
      if(isAllowedAccess) {
        setTabIDs(srcWindow.id+"|"+window.id+"|"+window.tabs[0].id+(incognito?"|i":"|n"));
      }
    });
    chrome.windows.onRemoved.addListener(function(windowId){
      if(windowId === srcWindow.id && isAllowedAccess) {
        var tabID = getTabIDs();
        setTabIDs(0+"|"+tabID.windowID+"|"+tabID.tabID+(incognito?"|i":"|n"));
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
// Add tab (for urls concatenated with " | ")
function addTab(windowID, url) {
  windowID = typeof windowID !== "undefined" ? parseInt(windowID) : null;
  chrome.tabs.create(windowID === null ? {url:url} : {windowId:windowID, url:url, active:false}, function(tab){
    setTabIDs((windowID===null?tab.windowId:windowID)+"|"+tab.windowId+"|"+tab.id+(tab.incognito?"|i":"|n"));
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
  // chang "bs.to" to Default
  var defaultOptions = {};
  defaultOptions[storedOptions] = {
    domains:defaultDomains,
    mirrorDetails:false,
    replaceTab:true,
    incognito:true,
    plainTextURL:false,
    youtubeAutoplay:true,
    showUnknownDomainNotification:true,
    directLink:false,
    darkTheme:false,
    iconColor:"#000000"
  };
  return defaultOptions;
}
// @return default mirror order
function getDefaultMirrorDomainList() {
  var defaultMirrors = [
    {AuroraVid:"AuroraVid"},
    {BitShare:"BitShare"},
    {BitVID:"BitVID"},
    {CloudTime:"CloudTime"},
    {Dailymotion:"Dailymotion"},
    {Ecostream:"Ecostream"},
    {FileNuke:"FileNuke"},
    {Firedrive:"Firedrive"},
    {FlashX:"FlashX"},
    {MySpass:"MySpass"},
    {NOSVideo:"NOSVideo"},
    {NowVideo:"NowVideo"},
    {OpenLoad:"OpenLoad"},
    {OpenLoadHD:"OpenLoadHD"},
    {PowerWatch:"PowerWatch"},
    {Primeshare:"Primeshare"},
    {RapidVideo:"RapidVideo"},
    {Sockshare:"Sockshare"},
    {Shared:"Shared"},
    {Streamango:"Streamango"},
    {Streamcloud:"Streamcloud"},
    {TheVideo:"TheVideo"},
    {UploadC:"UploadC"},
    {Vidto:"Vidto"},
    {Vivo:"Vivo"},
    {WholeCloud:"WholeCloud"},
    {YouTube:"YouTube"},
    {YouWatch:"YouWatch"}
  ];
  defaultDomains = {"bs.to":{"mirrorList":defaultMirrors, "selected":true}};
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
// Drag&Drop for mirror list
var source;
function isBefore(a, b) {
  if (a.parentNode == b.parentNode) {
    for (var cur = a; cur; cur = cur.previousSibling) {
      if (cur === b) { 
        return true;
      }
    }
  }
  return false;
} 
function dragEnter(e) {
  if (isBefore(source, e.target)) {
    e.target.parentNode.insertBefore(source, e.target);
  }
  else {
    e.target.parentNode.insertBefore(source, e.target.nextSibling);
  }
}
function dragStart(e) {
  source = e.target;
  e.dataTransfer.effectAllowed = 'move';
}
// Play sound
function playSound() {
  var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
  snd.play();
}