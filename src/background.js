// MV3 service worker: import shared scripts
try {
  importScripts('utils.js', 'series.js', 'context_menus.js');
} catch (e) {
  console.error(e);
}

let alreadyClicked = false;
let timer;
const funMap = {
  "proxer.me": buildProxerURL, "bs.to": findEpisodeString,
  "burningseries.co": findEpisodeString, "aniflix.tv": buildAniflix,
  "anisenpai.net": buildAnisenpai, "kinox": buildKinoxURL,
  "91.202.61.170": buildKinoxURL, "netflix": buildNetflixURL,
  "youtube": buildYoutubeURL, "willkommen-oesterreich.tv": buildWOEURL, "plexmovies.online": buildPlexmoviesURL
};

// Entry: single/double click listener------------------------------------------
chrome.action.onClicked.addListener(function () {
  if (alreadyClicked) {
    clearTimeout(timer);
    setPopup(); // ----> Process double click <----
    alreadyClicked = false; // Clear all clicks
    return;
  }
  alreadyClicked = true;
  const DOUBLECLICK_TIME = 250; // Timer to detect next click
  timer = setTimeout(function () { // ----> Process single click <----
    restore(setPopup, ifListFoundOpenNewestEpisode);
    clearTimeout(timer); // Clear all timers
    alreadyClicked = false; // Ignore clicks
  }, DOUBLECLICK_TIME);
});

// Check tabs/windows removed --------------------------------------------------
chrome.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
  const ids = await getTabIDs();
  let tabIdRemoved = false;
  const rIds = []; // remaining ids
  for (let i = 0; ids !== null && i < ids.length; i++) {
    if (ids[i].tabID == tabId)
      tabIdRemoved = true;
    else
      rIds.push(ids[i]);
  }
  if (ids !== null && ids[0].windowID == removeInfo.windowId && tabIdRemoved) {
    if (rIds.length < 1)
      await setTabIDs(0);
    else {
      let ids_str = "";
      for (let i = 0; i < rIds.length; i++) {
        ids_str += (i > 1 ? "|" : "") + rIds[i].srcWindowID + "|" + rIds[i].windowID + "|" + rIds[i].tabID + (rIds[i].incognito ? "|i" : "|n") + (i < rIds.length - 1 ? "|" : "");
      }
      await setTabIDs(ids_str, true);
    }
  }
});

chrome.windows.onRemoved.addListener(async function (windowId) {
  const ids = await getTabIDs();
  if (ids === null) return;
  if (ids[0].windowID == windowId) {
    await setTabIDs(0);
  } else if (ids[0].srcWindowID == windowId) {
    // Source (normal) window closed while incognito window is still open — clear srcWindowID
    let ids_str = "";
    for (let i = 0; i < ids.length; i++) {
      ids_str += (i > 0 ? "|" : "") + "0|" + ids[i].windowID + "|" + ids[i].tabID + (ids[i].incognito ? "|i" : "|n");
    }
    await setTabIDs(ids_str, true);
  }
});

// Check tab detached from window ----------------------------------------------
chrome.tabs.onDetached.addListener(async function (tabId, detachInfo) {
  const ids = await getTabIDs();
  let tabIdDetached = false;
  const rIds = []; // remaining ids
  for (let i = 0; ids !== null && i < ids.length; i++) {
    if (ids[i].tabID == tabId) {
      ids[i].windowID = "detached"
      tabIdDetached = true;
    }
    rIds.push(ids[i]);
  }
  if (ids !== null && tabIdDetached) {
    let ids_str = "";
    for (let i = 0; i < rIds.length; i++) {
      ids_str += (i > 1 ? "|" : "") + rIds[i].srcWindowID + "|" + rIds[i].windowID + "|" + rIds[i].tabID + (rIds[i].incognito ? "|i" : "|n") + (i < rIds.length - 1 ? "|" : "");
    }
    await setTabIDs(ids_str, true);
  }
});

// Check tab attached to window ------------------------------------------------
chrome.tabs.onAttached.addListener(async function (tabId, attachInfo) {
  const ids = await getTabIDs();
  let tabIdAttached = false;
  const rIds = []; // remaining ids
  for (let i = 0; ids !== null && i < ids.length; i++) {
    if (ids[i].tabID == tabId && ids[i].windowID == "detached") {
      ids[i].windowID = attachInfo.newWindowId;
      tabIdAttached = true;
    }
    rIds.push(ids[i]);
  }
  if (ids !== null && tabIdAttached) {
    let ids_str = "";
    for (let i = 0; i < rIds.length; i++) {
      ids_str += (i > 1 ? "|" : "") + rIds[i].srcWindowID + "|" + rIds[i].windowID + "|" + rIds[i].tabID + (rIds[i].incognito ? "|i" : "|n") + (i < rIds.length - 1 ? "|" : "");
    }
    await setTabIDs(ids_str, true);
  }
});

// On installation: set icon color and create context menus (limited to 6) -----
chrome.runtime.onInstalled.addListener(function () {
  restore(onInstall, onInstall);
});

function onInstall(seriesList, options) {
  createContextMenu(seriesList);
  setIconColor(options.iconColor);
}

restore(setPopup, ifListFoundAddContextMenuOnClickedListeners);
addStorageOnChangedListenerForContexMenu();
chrome.notifications.onButtonClicked.addListener(async function (notifId, btnIdx) {
  if (notifId === "Episode++Notification") {
    chrome.runtime.openOptionsPage();
  } else if (notifId === "Episode++IncognitoConflict") {
    const result = await chrome.storage.local.get("episode++PendingIncognito");
    const pending = result["episode++PendingIncognito"];
    if (!pending) return;
    await chrome.storage.local.remove("episode++PendingIncognito");
    if (btnIdx === 0) {
      chrome.extension.isAllowedIncognitoAccess(function (isAllowedAccess) {
        createWindow(pending.url, false, isAllowedAccess);
      });
    } else if (btnIdx === 1) {
      updateTab(pending.tabID, pending.url);
    }
    chrome.notifications.clear(notifId);
  }
});
chrome.notifications.onClosed.addListener(async function (notifId) {
  if (notifId === "Episode++IncognitoConflict") {
    await chrome.storage.local.remove("episode++PendingIncognito");
    restore(function () {
    }, function (seriesList) {
      const selected = seriesList.getSelected();
      if (selected) seriesList.edit(selected.name, selected.url, selected.season, Number.parseInt(selected.episode) - 1, selected.incognito, selected.contextMenu);
    });
  }
});

// Process double click: setPopup (see utils) ----------------------------------

// Process single click --------------------------------------------------------
function ifListFoundOpenNewestEpisode(seriesList, options) {
  const selected = seriesList.getSelected();
  let urls = [];
  if (selected === null) {
    setPopup();
  } else if (selected.url === "") {
    setPopupTo("edit.html");
  } else {
    urls = selected.url.split(" | ");
    for (let urlI of urls) {
      const url = parseURL(urlI);
      // if not bs.to or burningseries.co
      if (url.hostname !== hostNames[1] && url.hostname !== hostNames[2] && Number.parseInt(selected.season) === 0) seriesList.edit(selected.name, selected.url, 1, selected.episode, selected.incognito, selected.contextMenu);
      // if not youtube
      if (url.hostname !== hostNames[8] && Number.parseInt(selected.episode) === 0) seriesList.edit(selected.name, selected.url, selected.season, 1, selected.incognito, selected.contextMenu);
      selectService(url, selected.save(true), seriesList, options);
    }
    seriesList.edit(selected.name, selected.url, selected.season, Number.parseInt(selected.episode) + 1, selected.incognito, selected.contextMenu);
  }
}

function selectService(url, series, seriesList, options) {
  const chosenFunction = funMap[url.hostname] ?? (funMap[url.hostname.split(".")[0]] ?? funMap[url.hostname.split(".")[1]]);
  if (chosenFunction) {
    chosenFunction(url, series, seriesList, options);
  } else {
    if (options.showUnknownDomainNotification) {
      chrome.notifications.create("Episode++Notification", {
        type: "basic",
        iconUrl: "img/icon128.png",
        title: "Episode++",
        message: chrome.i18n.getMessage("notYetSupported", url.hostname),
        buttons: [{title: chrome.i18n.getMessage("disableNotification")}]
      }, () => {
      });
    }
    console.log(chrome.i18n.getMessage("notYetSupported", url.hostname));
    openURL(series.url, series.incognito, seriesList, options);
  }
}

// The netflix way (no season support) -----------------------------------------
function buildNetflixURL(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  path.splice(2, 1, (Number.parseInt(path[2]) + Number.parseInt(series.episode) - 1).toString());
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito, seriesList, options);
}

// The youtube way -------------------------------------------------------------
function buildYoutubeURL(url, series, seriesList, options) {
  if (url.searchObject.hasOwnProperty("list")) {
    openURL(url.protocol + "//" + url.host + "/embed/videoseries?list=" + url.searchObject.list + "&index=" + series.episode + (options.youtubeAutoplay ? "&autoplay=1" : ""), series.incognito, seriesList, options);
  } else {
    openURL(url.protocol + "//" + url.host + url.pathname + url.search + (options.youtubeAutoplay ? "&autoplay=1" : ""), series.incognito, seriesList, options);
  }
}

// The Willkommen Oesterreich way ----------------------------------------------
function buildWOEURL(url, series, seriesList, options) {
  const search = url.search.split("=");
  openURL(url.protocol + "//" + url.host + url.pathname + search[0] + "=" + series.episode, series.incognito, seriesList, options);
}

// The plexmovies way
function buildPlexmoviesURL(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  path.splice(- 1, 1, series.episode);
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito, seriesList, options);
}

// The kinox way ---------------------------------------------------------------
function buildKinoxURL(url, series, seriesList, options) {
  openURL(url.protocol + "//" + url.host + url.pathname + ",s" + series.season + "e" + series.episode, series.incognito, seriesList, options);
}

// The proxer way (no season support) ------------------------------------------
function buildProxerURL(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  path.splice(3, 1, series.episode);
  openURL(url.protocol + "//" + url.host + path.join("/"), series.incognito, seriesList, options);
}

// The animehaven way (experimental) -------------------------------------------
function buildAnimehavenURL(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  const se = path[path.length - 1].split("-");
  const sIndex = se.indexOf("season");
  const eIndex = se.indexOf("episode");
  if (sIndex !== -1) se[Number.parseInt(sIndex) + 1] = series.season;
  if (eIndex !== -1) se[Number.parseInt(eIndex) + 1] = series.episode;
  openURL(url.protocol + "//" + url.host + "/" + path.splice(1, 1).join("/") + "/" + se.join("-"), series.incognito, seriesList, options);
}

// The bs way ------------------------------------------------------------------
function findEpisodeString(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  if (path.length > 3 || path[3] != series.season) {
    path.splice(3, path.length - 3, series.season);
    series.url = url.protocol + "//" + url.host + path.join("/");
    url = parseURL(series.url);
  }
  fetch(series.url).then(function(res){return res.text();}).then(function(html){
      const newPath = getBeginningSelector(url, series.season, series.episode);
      const href = findLinkToFavouriteMirrorHref(newPath, options, html);
      if(href) {
          const parts = href.split("/");
          if (parts.length >= 6) {
            const mirror = parts.pop();
            const language = parts.pop();
            const episode = parts.pop();
            buildBsURL(url, series, episode, language, mirror, seriesList, options);
          } else {
            openURL(url.protocol + "//" + url.host + "/" + href, series.incognito, seriesList, options);
          }
      } else if (nextEpisodeFound(url, series, seriesList, options, html)) {
          series.episode++;
          seriesList.edit(series.name, series.url, series.season, series.episode, series.incognito, series.contextMenu);
      } else if (nextSeasonFound(newPath, html)) {
          series.season++;
          series.episode = 1;
          seriesList.edit(series.name, series.url, series.season, 2, series.incognito, series.contextMenu);
          findEpisodeString(url, series, seriesList, options);
      } else {
          setPopup();
      }
    }).catch(function(err){ console.error(err); setPopup(); });
}

// @return href string with preferential mirror, episode href without mirror as fallback, or null
function findLinkToFavouriteMirrorHref(newPath, options, html) {
  const mirrors = options.domains["bs.to"].mirrorList;
  const escapedPath = newPath.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  for (let mirrorI of mirrors) {
    const mirror = mirrorI[Object.keys(mirrorI)[0]];
    const regex = new RegExp("href=\"([^\"]*" + escapedPath + "[^\"]*/" + mirror.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + ")\"", "i");
    const match = html.match(regex);
    if (match?.[1]) {
      return match[1];
    }
  }
  // Fallback: find episode link without mirror (ends with a 2–3 letter language code)
  const fallback = html.match(new RegExp('href="([^"]*' + escapedPath + '[^"]+/[a-z]{2,3})"'));
  return fallback?.[1] ?? null;
}

// @return true there is another episode in this season, false otherwise
function nextEpisodeFound(url, series, seriesList, options, html) {
  series.episode++;
  const newPath = getBeginningSelector(url, series.season, series.episode);
  const href = findLinkToFavouriteMirrorHref(newPath, options, html);
  if (href) {
    const parts = href.split("/");
    if (parts.length >= 6) {
      const mirror = parts.pop();
      const language = parts.pop();
      const episode = parts.pop();
      buildBsURL(url, series, episode, language, mirror, seriesList, options);
    } else {
      openURL(url.protocol + "//" + url.host + "/" + href, series.incognito, seriesList, options);
    }
    return true;
  } else {
    return false;
  }
}

// @return true there is another season, false otherwise
function nextSeasonFound(newPath, html) {
  const path = newPath.split("/");
  path.splice(2, 2, (Number.parseInt(path[2]) + 1).toString());
  newPath = path.join("/");
  const needle = "href=\"" + newPath.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + "\"";
  return new RegExp(needle, "i").test(html);
}

// @return string for finding the correct href
function getBeginningSelector(url, season, episode) {
  const pathname = url.pathname;
  const path = pathname.split("/");
  if (path.length > 4) {
    path.splice(4, path.length - 4, episode + "-");
  } else {
    if (path[path.length - 1] == "") path.splice(- 1, 1);
    path.splice(3, 1, season + "/" + episode + "-");
  }
  const newPath = path.slice(1, path.length).join("/");
  return newPath;
}

// opens bs url or the link to the mirror directly
function buildBsURL(url, series, episode, language, mirror, seriesList, options) {
  const path = url.pathname.split("/");
  const newPath = path[0] + "/" + path[1] + "/" + path[2] + "/" + series.season + "/" + episode + "/" + language + "/" + mirror;
  const newURL = url.protocol + "//" + url.host + newPath;
  if (options.directLink && mirror !== "OpenLoad" && mirror !== "OpenLoadHD") {
    fetch(newURL).then(function (res) {
      return res.text();
    }).then(function (html) {
      const match = new RegExp(/href="(https:\/\/bs\.to\/out\/[^"]+)"/i).exec(html);
      if (match?.[1]) {
        openURL(match[1], series.incognito, seriesList, options);
      } else {
        openURL(newURL, series.incognito, seriesList, options);
      }
    }).catch(function () {
      openURL(newURL, series.incognito, seriesList, options);
    });
  } else {
    openURL(newURL, series.incognito, seriesList, options);
  }
}

// The Aniflix way -------------------------------------------------------------
function buildAniflix(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  path[path.length - 1] = series.episode;
  path[path.length - 3] = series.season;
  console.log(url.protocol + "//" + url.host + "/" + path.join("/"));
  openURL(url.protocol + "//" + url.host + "/" + path.join("/"), series.incognito, seriesList, options);
}

// The Anisenpai way -----------------------------------------------------------
function buildAnisenpai(url, series, seriesList, options) {
  const path = url.pathname.split("/");
  const se = path[path.length - 2].split("-");
  const sIndex = se.indexOf("staffel");
  const eIndex = se.indexOf("folge");
  if (sIndex !== -1) se[Number.parseInt(sIndex) + 1] = series.season;
  if (eIndex !== -1) se[Number.parseInt(eIndex) + 1] = series.episode;
  openURL(url.protocol + "//" + url.host + "/" + se.join("-"), series.incognito, seriesList, options);
}
