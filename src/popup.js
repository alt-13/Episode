// Entry: look for series in storage and react accordingly
window.onload = function() {
  restore(ifListNotFound, ifListFound);
}
// No series list found (empty storage): User should enter series information
function ifListNotFound() {
  document.location.href = "edit.html";
}
// Fill series list entries into dropdown select and react to buttons
function ifListFound(items) {
  setPopupTo("popup.html");
  removeFormContentFromStorage();
  var seriesList = new SeriesList(items);
  var select = document.getElementById("select_series");
  for(var key in items) {
    var property = items[key];
    if(typeof property !== typeof function(){}) {
      var el = document.createElement("option");
      if(property.selected)
        el.selected = true;
      el.innerHTML = key;
      el.value = key;
      select.appendChild(el);
    }
  }
  document.getElementById("editSeries").addEventListener("click", function() {selectSeries(seriesList,false);}, false);
  document.getElementById("deleteSeries").addEventListener("click", insertSeriesName, false);
  document.getElementById("definitelyDelete").addEventListener("click", function(){deleteSeries(seriesList);}, false);
  document.getElementById("selectSeries").addEventListener("click", function(){selectSeries(seriesList,true);}, false);
}
// Select series/deselect all series and navigate to edit.html if required
function selectSeries(seriesList, select) {
  var selected = getSelected();
  if(selected == "add new series") {
    seriesList.select();
    if(select)
      document.getElementById("selectSeries").href = "edit.html";
    setPopupTo("edit.html");
  } else {
    seriesList.select(selected);
    if(select) {
      setPopupTo("");
      window.close();
    } else
      setPopupTo("edit.html");
  }
}
// Inserts series' name which will be deleted
function insertSeriesName() {
  var selected = getSelected();
  if(selected == "add new series") {
    document.getElementById("confirmationDialog").className = "hidden";
  } else {
    document.getElementById("confirmationDialog").className = "overlay";
    document.getElementById("selectedSeries").text = "\"" + selected + "\"";
  }
}
// Deletes series and redirects to edit.html if series list is empty after del
function deleteSeries(seriesList) {
  seriesList.delete(getSelected(),function(){document.getElementById("definitelyDelete").href = "edit.html";}
                                 ,function(){document.getElementById("definitelyDelete").href = "popup.html";}
                   );
}
// @return selected series (in dropdown)
function getSelected() {
  var select = document.getElementById("select_series");
  var selected = select.options[select.selectedIndex].text;
  return selected;
}
// Remove form content from storage (needed for edit)
function removeFormContentFromStorage() {
  localStorage.removeItem("episode++FormContent");
}
// Helper function to set popup to given string
function setPopupTo(popup) {
  chrome.browserAction.setPopup({popup:popup});
}
