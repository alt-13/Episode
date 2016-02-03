// Entry: look for series in storage and react accordingly
window.onload = function() {
  restore(ifListNotFound, ifListFound);
}
// No series list found (empty storage)
function ifListNotFound() {console.warn("Should have never happened!");}
// User has to choose between Subbed or Dubbed if possible
function ifListFound(items) {
  var seriesList = new SeriesList(items);
  var selected = seriesList.getSelected();
  var sUrl = parseURL(selected.url);
  var path = sUrl.pathname.split("/");
  $.ajax({
    url: selected.url,
    dataType: 'html',
    success: function(data) {
      var response = $('<html />').html(data);
      if(path[1] === "episodes" || (path[1] !== "subbed" && path[1] !== "dubbed")) {
        var links = $(response).find("a:contains('Episode ')");
        if(links.length !== 0) {
          var url = parseURL(links.length > 1 ? links[1] : links[0]);
          var newPath = url.pathname.split("/");
          var ep = newPath[newPath.length-1].split("-");
          ep.splice((parseInt(selected.season)>1 || !isNaN(parseInt(ep[ep.length-2]))) ? ep.length-2 : ep.length-1, 1, selected.episode);
          open(url.protocol + "//" + url.host + "/" + newPath.splice(1,1).join("/") + "/" + ep.join("-"), selected.incognito,true);
          seriesList.edit(selected.name, links[1], selected.season, selected.episode, selected.incognito);
        }
      } else {
        var subbed = $(response).find("a:contains('English Sub')");
        var dubbed = $(response).find("a:contains('English Dub')");
        if(subbed.length !== 0 && dubbed.length === 0) {
          setNewAhURL(items, "subbed");
        } else if(subbed.length === 0 && dubbed.length !== 0) {
          setNewAhURL(items, "dubbed");
        } else {
          document.getElementById("subbed").addEventListener("click", function(){restore(ifListNotFound, function(items){setNewAhURL(items, "subbed", false);});}, false);
          document.getElementById("dubbed").addEventListener("click", function(){restore(ifListNotFound, function(items){setNewAhURL(items, "dubbed", false);});}, false);
        }
      }
    }
  });
}
// Modifies the URL to chosen version (dubbed/subbed)
function setNewAhURL(items, version) {
  var seriesList = new SeriesList(items);
  var s = seriesList.getSelected();
  var url = parseURL(s.url);
  var path = url.pathname.split("/");
  var newUrl = url.protocol + "//" + url.host + ((version === "subbed") ? "/subbed/" : "/dubbed/") + path[1] + "-episode-" + (s.episode != 0 ? s.episode : 1);
  open(newUrl,s.incognito,true);
  seriesList.edit(s.name, newUrl, s.season, parseInt(s.episode)+1, s.incognito);
}
