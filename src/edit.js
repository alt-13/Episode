// Entry: look for series in storage and react accordingly
window.onload = function() {
  restore(ifListNotFound, ifListFound);
}
// No series list found (empty storage): Save -> add series
function ifListNotFound() {
  document.getElementById("save").addEventListener("click", function(){editSeries(null);}, false);
}
// User wants to edit series list entry: Save -> edit series
function ifListFound(items) {
  var seriesList = new SeriesList(items);
  var selected = seriesList.getSelected();
  if(selected != null) {
    document.getElementById("epp_title").value = selected.name;
    document.getElementById("epp_url").value = selected.url;
    document.getElementById("epp_season").value = selected.season;
    document.getElementById("epp_episode").value = selected.episode;
    document.getElementById("epp_incognito").checked = selected.incognito;
  }
  // editSeries with parameters edits series
  document.getElementById("save").addEventListener("click", function(){editSeries(seriesList);}, false);
}
// Edits/adds series list entry
function editSeries(seriesList) {
  if(seriesList === null) { // add series
    seriesList = new SeriesList();
    seriesList.add(document.getElementById("epp_title").value,
                   document.getElementById("epp_url").value,
                   document.getElementById("epp_season").value,
                   document.getElementById("epp_episode").value,
                   document.getElementById("epp_incognito").checked);
  } else { // edit series
    seriesList.edit(document.getElementById("epp_title").value,
                    document.getElementById("epp_url").value,
                    document.getElementById("epp_season").value,
                    document.getElementById("epp_episode").value,
                    document.getElementById("epp_incognito").checked);
  }
  window.close();
  setPopupTo("");
}
// Helper function to set popup to given string
function setPopupTo(popup) {
  chrome.browserAction.setPopup({popup:popup});
}
