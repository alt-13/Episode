// Entry: look for series in storage and react accordingly
window.onload = function () {
  localizeHtmlPage();
  restore(ifListNotFoundGoToEdit, ifListFoundSetupPopup);
}

// No series list found (empty storage): User should enter series information
function ifListNotFoundGoToEdit() {
  document.location.href = "edit.html";
}

// Fill series list entries into dropdown select and react to buttons
function ifListFoundSetupPopup(seriesList, options) {
  setPopupTo("popup.html");
  if (options.darkTheme) {
    document.getElementById("popup").className = "dark";
  }
  let select = document.getElementById("select_series");
  seriesList.fillInSelectOptions(select);
  updateActionButtons();
  select.addEventListener("change", updateActionButtons);
  document.getElementById("editSeries").addEventListener("click", function () {
    selectSeries(seriesList, false);
  });
  document.getElementById("deleteSeries").addEventListener("click", insertSeriesName);
  document.getElementById("deleteCancel").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("confirmationDialog").style.display = "none";
    document.getElementById("selection").style.display = "";
  });
  document.getElementById("definitelyDelete").addEventListener("click", function () {
    deleteSeries(seriesList);
  });
  document.getElementById("selectSeries").addEventListener("click", function () {
    selectSeries(seriesList, true);
  });
}

// Disables edit/delete buttons when "add new series" is selected
function updateActionButtons() {
  let isAddNew = getSelected() == chrome.i18n.getMessage("addNewSeries");
  document.getElementById("editSeries").classList.toggle("disabled", isAddNew);
  document.getElementById("deleteSeries").classList.toggle("disabled", isAddNew);
}

// Select series/deselect all series and navigate to edit.html if required
function selectSeries(seriesList, select) {
  let selected = getSelected();
  if (selected == chrome.i18n.getMessage("addNewSeries")) {
    seriesList.select();
    if (select)
      document.getElementById("selectSeries").href = "edit.html";
    setPopupTo("edit.html");
  } else {
    seriesList.select(selected);
    if (select) {
      setPopupTo("");
      window.close();
    } else
      setPopupTo("edit.html");
  }
}

// Inserts series' name which will be deleted
function insertSeriesName() {
  let selected = getSelected();
  if (selected == chrome.i18n.getMessage("addNewSeries")) return;
  document.getElementById("selection").style.display = "none";
  document.getElementById("confirmationDialog").style.display = "block";
  document.getElementById("confirmationMessage").textContent = chrome.i18n.getMessage("confirmationMessage", selected);
}

// Deletes series and redirects to edit.html if series list is empty after del
function deleteSeries(seriesList) {
  seriesList.delete(getSelected(), function () {
      document.getElementById("definitelyDelete").href = "edit.html";
    }
    , function () {
      document.getElementById("definitelyDelete").href = "popup.html";
    }
  );
}

// @return selected series (in dropdown)
function getSelected() {
  let select = document.getElementById("select_series");
  let selected = select.options[select.selectedIndex].text;
  return selected;
}

// Helper function to set popup to given string
function setPopupTo(popup) {
  chrome.action.setPopup({popup: popup});
}
