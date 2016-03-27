// Entry: look for series in storage and react accordingly
window.onload = function() {
  localizeHtmlPage();
  restore(ifListNotFoundWarn, ifListFoundSetupAhPopup);
}
// No series list found (empty storage)
function ifListNotFoundWarn() {console.warn("Should have never happened!");}
// User has to choose between Subbed or Dubbed if possible
function ifListFoundSetupAhPopup(seriesList) {
  var selected = seriesList.getSelected();
  if(selected.url === "") {
    setPopupTo("edit.html");
  } else {
    if(parseInt(selected.season) === 0) seriesList.edit(selected.name, selected.url, 1, selected.episode, selected.incognito);
    if(parseInt(selected.episode) === 0) seriesList.edit(selected.name, selected.url, selected.season, 1, selected.incognito);
    var sUrl = parseURL(selected.url);
    var path = sUrl.pathname.split("/");
    $.ajax({
      url: selected.url,
      dataType: 'html',
      success: function(data) {
        var response = $('<html />').html(data);
        if(path.length > 2) {
          var links = $(response).find("a:contains('Episode ')");
          if(links.length !== 0) {
            var url = parseURL(links.length > 1 ? links[1] : links[0]);
            var newPath = url.pathname.split("/");
            var ep = newPath[newPath.length-1].split("-");
            ep.splice((parseInt(selected.season)>1 || !isNaN(parseInt(ep[ep.length-2]))) ? ep.length-2 : ep.length-1, 1, selected.episode);
            openURL(url.protocol + "//" + url.host + "/" + newPath.splice(1,1).join("/") + "/" + ep.join("-"), selected.incognito, seriesList, true);
            seriesList.edit(selected.name, links[1], selected.season, selected.episode, selected.incognito);
          }
        } else {
          var subbed = $(response).find("a:contains('English Sub')");
          var dubbed = $(response).find("a:contains('English Dub')");
          if(subbed.length !== 0 && dubbed.length === 0) {
            setNewAhURL(seriesList, "subbed");
          } else if(subbed.length === 0 && dubbed.length !== 0) {
            setNewAhURL(seriesList, "dubbed");
          } else {
            document.getElementById("subbed").addEventListener("click", function(){restore(ifListNotFoundWarn, function(seriesList){setNewAhURL(seriesList, "subbed");});});
            document.getElementById("dubbed").addEventListener("click", function(){restore(ifListNotFoundWarn, function(seriesList){setNewAhURL(seriesList, "dubbed");});});
          }
        }
      }
    });
  }
}
// Modifies the URL to chosen version (dubbed/subbed)
function setNewAhURL(seriesList, version) {
  var s = seriesList.getSelected();
  var url = parseURL(s.url);
  var path = url.pathname.split("/");
  var newUrl = url.protocol + "//" + url.host + ((version === "subbed") ? "/subbed/" : "/dubbed/") + path[1] + "-episode-" + (s.episode != 0 ? s.episode : 1);
  openURL(newUrl,s.incognito, seriesList, true);
  seriesList.edit(s.name, newUrl, s.season, parseInt(s.episode)+1, s.incognito);
}
