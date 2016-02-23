// Entry: look for series in storage and react accordingly
window.onload = function() {
  localizeHtmlPage();
  restore(ifListNotFoundGoToEdit, ifListFoundSetupPopup);
}
// No series list found (empty storage): User should enter series information
function ifListNotFoundGoToEdit() {
  document.location.href = "edit.html";
}
// Fill series list entries into dropdown select and react to buttons
function ifListFoundSetupPopup(seriesList) {
  setPopupTo("popup.html");
  var select = document.getElementById("select_series");
  seriesList.fillInSelectOptions(select);
  document.getElementById("editSeries").addEventListener("click", function() {selectSeries(seriesList,false);});
  document.getElementById("deleteSeries").addEventListener("click", insertSeriesName);
  document.getElementById("definitelyDelete").addEventListener("click", function(){deleteSeries(seriesList);});
  document.getElementById("selectSeries").addEventListener("click", function(){selectSeries(seriesList,true);});
}
// Select series/deselect all series and navigate to edit.html if required
function selectSeries(seriesList, select) {
  var selected = getSelected();
  if(selected == chrome.i18n.getMessage("addNewSeries")) {
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
  if(selected == chrome.i18n.getMessage("addNewSeries")) {
    document.getElementById("confirmationDialog").className = "hidden";
  } else {
    document.getElementById("confirmationDialog").className = "overlay";
    document.getElementById("confirmationMessage").text = chrome.i18n.getMessage("confirmationMessage",selected);
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
// Helper function to set popup to given string
function setPopupTo(popup) {
  chrome.browserAction.setPopup({popup:popup});
}
