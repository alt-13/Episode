var contextMenuIDBeginning = "episode++ContextMenu";
// Entry: called from restore in background (onInstalled)
function createContextMenu(seriesList) {
  chrome.contextMenus.create({
    id: contextMenuIDBeginning + "Decrement",
    title:"Episode – –",
    contexts: ["browser_action"]
  });
  if(seriesList !== "undefined") {
    for(var series in seriesList) {
      var s = seriesList[series];
      if(typeof s !== "function") {
        addContextMenu(s);
      }
    }
  }
}
// Adds context menus for series in list
function addContextMenu(series) {
  chrome.contextMenus.create({
    type:"radio",
    id: contextMenuIDBeginning + series.name,
    title:series.name,
    checked:series.selected,
    contexts: ["browser_action"]
  });
}
// Adds onClicked listeners to all available context menus
function ifListFoundAddContextMenuOnClickedListeners(seriesList) {
  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if(info.menuItemId === contextMenuIDBeginning + "Decrement") {
      restore(setPopup, ifListFoundDecrement);
    }
  });
  for(var series in seriesList) {
    var s = seriesList[series];
    if(typeof s !== "function") {
      addContextMenuOnClickedListener(s);
    }
  }
}
// Adds context menus' onClicked listeners for series in list
function addContextMenuOnClickedListener(series) {
  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if(info.menuItemId === contextMenuIDBeginning + series.name) {
      restore(setPopup, function(seriesList){ifListFoundSelectSeries(seriesList, series.name);});
    }
  });
}
// Episode — —: decrementing the selected series' episode (created first)
function ifListFoundDecrement(seriesList) {
  var selected = seriesList.getSelected();
  if(selected === null) {
    setPopup();
  } else if(selected.episode > 0) {
    seriesList.edit(selected.name, selected.url, selected.season, parseInt(selected.episode)-1, selected.incognito);
  }
}
// Series is selected in context menu -> changes selected property in storage
function ifListFoundSelectSeries(seriesList, name) {
  seriesList.select(name);
  unsetPopup();
}
// Storage onChanged listener adds/removes affected select context menus
function addStorageOnChangedListenerForContexMenu() {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
    if(namespace === "sync" && changes !== null) {
      if(storedSeries in changes){
        var oldKeys;
        if(changes[storedSeries].hasOwnProperty("oldValue")) {
          oldKeys = Object.keys(changes[storedSeries].oldValue);
        } else { // First added series after installation (also adds -- CM)
          oldKeys = [];
          chrome.contextMenus.onClicked.addListener(function(info, tab) {
            if(info.menuItemId === contextMenuIDBeginning + "Decrement") {
              restore(setPopup, ifListFoundDecrement);
            }
          });
        }
        var seriesList = changes[storedSeries].newValue;
        var newKeys = Object.keys(seriesList);
        var less = oldKeys.diff(newKeys);
        var more = newKeys.diff(oldKeys);
        if(less.length || more.length) {
          if(less.length) {
            chrome.contextMenus.remove(contextMenuIDBeginning + less[0]);
          }
          if(more.length) {
            addContextMenu(seriesList[more[0]]);
            addContextMenuOnClickedListener(seriesList[more[0]]);
          }
        } else {
          for(var series in seriesList) {
            var s = seriesList[series];
            if(series !== "__fragments__")
              chrome.contextMenus.update(contextMenuIDBeginning + s.name, {checked:s.selected});
          }
        }
      }
    }
  });
}
// Difference[] of arr1.diff(arr2) where arr1.length > arr2.length
Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};