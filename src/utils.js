// Content:
// public:  openURL, setPopup, unsetPopup, setPopupTo, getTabID, setTabID,
//          parseURL, localizeHtmlPage, getStorage, getDefaultOptions,
//          getDefaultMirrorDomainList, setIconColor, dragEnter, dragStart,
//          playSound
// private: createTab, createWindow, updateTab, isBefore
const storedOptions = "episode++Options"; // Options in sync storage
const hostNames = ["proxer.me", "bs.to", "animehaven.to", "kinox", "91.202.61.170",
  "netflix.com", "www.youtube.com"];
let openURLCallCount = 0;

// Creates incognito window/tab of given url
async function openURL(url, incognito, seriesList, options, close) {
  console.log(url);
  close = close === undefined ? false : close;
  chrome.extension.isAllowedIncognitoAccess(async function (isAllowedAccess) {
    let ids = await getTabIDs();
    if (!options.replaceTab || ids === null) { // create
      if (incognito)
        createWindow(url, incognito, isAllowedAccess);
      else
        createTab(url);
    } else if ((ids[0].incognito && incognito) || !(ids[0].incognito || incognito)) { // update
      const pipe_count = (seriesList.getSelected().url.match(/\s\|\s/g) || []).length;
      if (pipe_count >= ids.length) {
        addTab(ids[0].windowID, url);
      } else {
        if (openURLCallCount >= ids.length)
          openURLCallCount = 0;
        updateTab(ids[openURLCallCount].tabID, url);
        openURLCallCount++;
      }
    } else {
      if (incognito)
        createWindow(url, incognito, isAllowedAccess);
      else if (isAllowedAccess && ids[0].incognito && !incognito) {
        chrome.windows.getCurrent(function (window) {
          if (window.incognito && !incognito && ids[0].srcWindowID == 0) {
            chrome.storage.local.set({"episode++PendingIncognito": {url: url, tabID: ids[0].tabID}});
            chrome.notifications.create("Episode++IncognitoConflict", {
              type: "basic",
              iconUrl: "img/icon128.png",
              title: "Episode++",
              message: chrome.i18n.getMessage("nonIncognitoSeriesInIncognitoWindow"),
              buttons: [
                {title: chrome.i18n.getMessage("openInNormalWindow")},
                {title: chrome.i18n.getMessage("openInIncognitoWindow")}
              ]
            }, () => {
            });
          } else if (window.incognito && !incognito && ids[0].srcWindowID != 0) {
            chrome.windows.update(Number.parseInt(ids[0].srcWindowID), {focused: true});
            createTab(url, ids[0].srcWindowID);
          } else {
            createTab(url);
          }
        });
      } else
        createTab(url);
    }
    if (close) {
      unsetPopup();
      window.close();
    }
  });
}

// Sets popup to "popup.html"
function setPopup() {
  chrome.action.setPopup({popup: "popup.html"});
}

// Unsets popup
function unsetPopup() {
  chrome.action.setPopup({popup: ""});
}

// Sets popup to given string
function setPopupTo(popup) {
  chrome.action.setPopup({popup: popup});
}

// Fetches ID of tab in use
async function getTabIDs() {
  try {
    const result = await chrome.storage.local.get(["episode++TabIDs"]);
    const ids = result["episode++TabIDs"];
    const tabInfos = [];
    if (ids != null && ids !== "0" && typeof ids === "string" && !ids.includes("||")) {
      const idsarr = ids.split("|");
      for (let i = 0; i < idsarr.length; i += 4) {
        const tabInfo = {};
        tabInfo.srcWindowID = idsarr[i + 0];
        tabInfo.windowID = idsarr[i + 1];
        tabInfo.tabID = idsarr[i + 2];
        tabInfo.incognito = idsarr[i + 3] == "i";
        tabInfos.push(tabInfo);
      }
    } else return null;
    return tabInfos;
  } catch (error) {
    console.error("Error getting tab IDs:", error);
    return null;
  }
}

// Sets ID of tab in use
async function setTabIDs(tabIDs, replace) {
  try {
    replace = replace === undefined ? false : replace;
    const result = await chrome.storage.local.get(["episode++TabIDs"]);
    const ids = result["episode++TabIDs"];
    if (ids != null && ids != "0" && tabIDs !== 0 && !replace) {
      tabIDs = ids + "|" + tabIDs;
    }
    await chrome.storage.local.set({"episode++TabIDs": tabIDs});
  } catch (error) {
    console.error("Error setting tab IDs:", error);
  }
}

// Creates new tab
async function createTab(url, srcWindowID) {
  srcWindowID = srcWindowID === undefined ? null : Number.parseInt(srcWindowID);
  chrome.tabs.create(srcWindowID === null ? {url: url} : {windowId: srcWindowID, url: url}, async function (tab) {
    await setTabIDs((srcWindowID === null ? tab.windowId : srcWindowID) + "|" + tab.windowId + "|" + tab.id + "|n");
  });
}

// Creates new window
async function createWindow(url, incognito, isAllowedAccess) {
  chrome.windows.getCurrent(async function (srcWindow) {
    chrome.windows.create({url: url, incognito: incognito, state: "maximized"}, async function (window) {
      if (isAllowedAccess) {
        await setTabIDs(srcWindow.id + "|" + window.id + "|" + window.tabs[0].id + (incognito ? "|i" : "|n"));
      }
    });

  });
}

// Updates tab
function updateTab(tabID, url) {
  chrome.tabs.update(Number.parseInt(tabID), {url: url}, function () {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
      setTabIDs(0); // stale ID — reset tracking so createTab stores a clean entry
      createTab(url);
    }
  });
}

// Add tab (for urls concatenated with " | ")
async function addTab(windowID, url) {
  windowID = windowID === undefined ? null : Number.parseInt(windowID);
  chrome.tabs.create(windowID === null ? {url: url} : {
    windowId: windowID,
    url: url,
    active: false
  }, async function (tab) {
    await setTabIDs((windowID === null ? tab.windowId : windowID) + "|" + tab.windowId + "|" + tab.id + (tab.incognito ? "|i" : "|n"));
  });
}

// Parses a given URL
function parseURL(url) {
  const u = new URL(url);
  const searchObject = {};
  if (u.search && u.search.length > 1) {
    u.search.substring(1).split('&').forEach(function (q) {
      if (!q) {
        return;
      }
      const p = q.split('=');
      searchObject[p[0]] = p[1];
    });
  }
  return {
    protocol: u.protocol,
    host: u.host,
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    search: u.search,
    searchObject: searchObject,
    hash: u.hash
  };
}

// Localize by replacing __MSG_***__ meta tags
function localizeHtmlPage() {
  const objects = document.getElementsByTagName('html');
  for (const obj of objects) {
    const valStrH = obj.innerHTML.toString();
    const valNewH = valStrH.replaceAll(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });
    if (valNewH != valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}

// @return (chunk of) series list with options
function getStorage(storedSeriesMemChunk) {
  const storage = getDefaultOptions();
  storage[storedSeriesMemChunk] = {};
  return storage;
}

// @return default options
function getDefaultOptions() {
  const defaultDomains = getDefaultMirrorDomainList();
  // change "bs.to" to Default
  const defaultOptions = {};
  defaultOptions[storedOptions] = {
    domains: defaultDomains,
    mirrorDetails: false,
    replaceTab: true,
    incognito: true,
    plainTextURL: false,
    youtubeAutoplay: true,
    showUnknownDomainNotification: true,
    directLink: false,
    darkTheme: false,
    iconColor: "#000000"
  };
  return defaultOptions;
}

// @return default mirror order
function getDefaultMirrorDomainList() {
  const defaultMirrors = [
    {VOE: "VOE"},
    {Doodstream: "Doodstream"},
    {Vidoza: "Vidoza"},
    {Vidmoly: "Vidmoly"},
    {Filemoon: "Filemoon"},
    {Streamtape: "Streamtape"},
    {MIXdrop: "MIXdrop"},
    {Vivo: "Vivo"},
    {UPStream: "UPStream"},
    {VidLox: "VidLox"},
    {StreamZZ: "StreamZZ"},
    {Hexupload: "Hexupload"},
    {Vupload: "Vupload"},
    {SendFox: "SendFox"},
    {PlayTube: "PlayTube"}
  ];
  const defaultDomains = {"bs.to": {"mirrorList": defaultMirrors, "selected": true}};
  return defaultDomains;
}

// Draws icon with selected color
function setIconColor(color) {
  if (color === undefined) {
    console.warn("setIconColor called without color parameter");
    return;
  }
  // Use OffscreenCanvas for Service Workers (Manifest V3)
  const canvas = new OffscreenCanvas(19, 19);

  canvas.width = 19;
  canvas.height = 19;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.transform(0.07422, 0, 0, 0.07422, 0.03977875, 0.03876088);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(68.5, 14);
  ctx.bezierCurveTo(37.848198, 14, 13, 38.848197, 13, 69.5);
  ctx.bezierCurveTo(13, 80.061488, 15.941425, 89.93939, 21.0625, 98.34375);
  ctx.bezierCurveTo(35.553604, 126.77567, 67.826155, 151.43267, 91.28125, 169.09375);
  ctx.bezierCurveTo(94.800384, 125.38361, 131.38383, 91, 176, 91);
  ctx.bezierCurveTo(189.996, 91, 203.20087, 94.382553, 214.84375, 100.375);
  ctx.bezierCurveTo(215.17866, 99.758537, 215.49424, 99.151307, 215.8125, 98.53125);
  ctx.bezierCurveTo(221.00621, 90.085259, 224, 80.142317, 224, 69.5);
  ctx.bezierCurveTo(224, 38.848197, 199.1518, 14, 168.5, 14);
  ctx.bezierCurveTo(146.49383, 14, 127.47584, 26.807096, 118.5, 45.375);
  ctx.bezierCurveTo(109.52416, 26.807096, 90.506168, 14, 68.5, 14);
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.transform(0.07422, 0, 0, 0.07422, 0.03977875, 0.03876088);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(176, 110);
  ctx.bezierCurveTo(139.54921, 110, 110, 139.54921, 110, 176);
  ctx.bezierCurveTo(110, 212.45079, 139.54921, 242, 176, 242);
  ctx.bezierCurveTo(212.45079, 242, 242, 212.45079, 242, 176);
  ctx.bezierCurveTo(242, 139.54921, 212.45079, 110, 176, 110);
  ctx.closePath();
  ctx.moveTo(162, 133);
  ctx.lineTo(190, 133);
  ctx.lineTo(190, 162);
  ctx.lineTo(219, 162);
  ctx.lineTo(219, 190);
  ctx.lineTo(190, 190);
  ctx.lineTo(190, 219);
  ctx.lineTo(162, 219);
  ctx.lineTo(162, 190);
  ctx.lineTo(133, 190);
  ctx.lineTo(133, 162);
  ctx.lineTo(162, 162);
  ctx.lineTo(162, 133);
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  chrome.action.setIcon({
    imageData: ctx.getImageData(0, 0, 19, 19)
  });
}

// Drag&Drop for mirror list
let source;

function isBefore(a, b) {
  if (a.parentNode == b.parentNode) {
    for (let cur = a; cur; cur = cur.previousSibling) {
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
  } else {
    e.target.parentNode.insertBefore(source, e.target.nextSibling);
  }
}

function dragStart(e) {
  source = e.target;
  e.dataTransfer.effectAllowed = 'move';
}

// Play sound
function playSound() {
  let snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
  snd.play();
}
