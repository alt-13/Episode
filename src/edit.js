// Entry: look for series in storage and react accordingly
window.onload = function() {
  localizeHtmlPage();
  restore(ifListNotFoundSetupPlainEditPopup, ifListFoundSetupEditPopup);
}
// Store form content when popup closed
window.addEventListener("unload", saveFormContent);
// No series list found (empty storage): Save -> add series
function ifListNotFoundSetupPlainEditPopup() {
  document.getElementById("save").addEventListener("click", function(){editSeries(null);});
}
// User wants to edit series list entry: Save -> edit series
function ifListFoundSetupEditPopup(seriesList) {
  var selected = seriesList.getSelected();
  fillInFormContent(selected);
  document.getElementById("epp_title").addEventListener("input", function(event) {
    if(!seriesList.checkNameOK(event.target.value))
      document.getElementById("epp_title").style.borderColor = "red";
    else
      document.getElementById("epp_title").style.borderColor = "inherit";
  }, true);
  // editSeries with parameters edits series
  document.getElementById("save").addEventListener("click", function(){editSeries(seriesList);});
  document.getElementById("cancel").addEventListener("click", removeFormContentFromStorage);
}
// Edits/adds series list entry
function editSeries(seriesList) {
  var ok = true;
  if(seriesList === null) { // add series
    seriesList = new SeriesList();
    seriesList.add(document.getElementById("epp_title").value,
                   document.getElementById("epp_url").value,
                   document.getElementById("epp_season").value,
                   document.getElementById("epp_episode").value,
                   document.getElementById("epp_incognito").checked);
  } else { // edit series
    ok = seriesList.edit(document.getElementById("epp_title").value,
                    document.getElementById("epp_url").value,
                    document.getElementById("epp_season").value,
                    document.getElementById("epp_episode").value,
                    document.getElementById("epp_incognito").checked);
  }
  if(ok) {
    removeFormContentFromStorage();
    if(isCorrectAhURL()) {
      window.close();
      setPopupTo("");
    } else {
      window.close();
      setPopupTo("ah.html");
    }
  }
}
// Stores the form content so that you can continue to edit after reload
function saveFormContent() {
  var formContent = {
    name: document.getElementById("epp_title").value,
    url: document.getElementById("epp_url").value,
    season: document.getElementById("epp_season").value,
    episode: document.getElementById("epp_episode").value,
    incognito: document.getElementById("epp_incognito").checked
  };
  localStorage.setItem("episode++FormContent", JSON.stringify(formContent));
  return null;
}
// Restores form content
function fillInFormContent(series) {
  var content = localStorage.getItem("episode++FormContent");
  if(content != null)
    series = JSON.parse(content);
  if(series !== null) {
    document.getElementById("epp_title").value = series.name;
    document.getElementById("epp_url").value = series.url;
    document.getElementById("epp_season").value = series.season;
    document.getElementById("epp_episode").value = series.episode;
    document.getElementById("epp_incognito").checked = series.incognito;
  } else {
    chrome.storage.sync.get(getDefaultOptions(), function(items) {
      document.getElementById("epp_incognito").checked = items[storedOptions].defaultIncognito;
    });
  }
}
// Remove form content from storage
function removeFormContentFromStorage() {
  window.removeEventListener("unload", saveFormContent);
  localStorage.removeItem("episode++FormContent");
}
// Helper function to set popup to given string
function setPopupTo(popup) {
  chrome.browserAction.setPopup({popup:popup});
}
// Check if it is a correct animehaven URL
function isCorrectAhURL() {
  var parser = document.createElement('a');
  parser.href = document.getElementById("epp_url").value;;
  if(parser.hostname === "animehaven.org") {
    var path = parser.pathname.split("/");
    if(path.length < 3) {
      return false;
    } else if(path[1] === "episodes" || (path[1] !== "subbed" && path[1] !== "dubbed")) {
      return false;
    }
  } else return true; // no ah url -> don't care
  return true;
}
