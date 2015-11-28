var url;
var alreadyClicked = false;
var timer;
var episode;
var series_url;
var storedEpisodeTitle = "episode++_episode";

chrome.browserAction.onClicked.addListener(function(tab) {
  episode = localStorage.getItem(storedEpisodeTitle);
  if(isNaN(parseInt(episode)) || episode <= 0) {
    init();
  }
  
  if (alreadyClicked) {
    clearTimeout(timer);
    processDoubleClick();
    
    //Clear all Clicks
    alreadyClicked = false;
    return;
  }
  
  //Set Click to  true
  alreadyClicked = true;

  //Add a timer to detect next click to a sample of 250
  var  DOUBLECLICK_TIME = 250;
  timer = setTimeout(function () { // single click
    processSingleClick();
    
    //Clear all timers
    clearTimeout(timer);
    //Ignore clicks
    alreadyClicked = false;
  }, DOUBLECLICK_TIME);
});

function processDoubleClick() {
  var input = prompt("Enter Episode number","1");
  if(input != null) {
    episode = input;
  }
  updateEpisodeTo(decrementEpisodeCounter(episode));
  //chrome.browserAction.setPopup({popup:"popup.html"});
}

function processSingleClick(){
  updateURL();
  chrome.windows.create({"url": url, "incognito": true, "state": 'maximized'});
}

function incrementEpisodeCounter(episode){
  var int_episode = parseInt(episode);
  int_episode++;
  return int_episode.toString();
}

function decrementEpisodeCounter(episode){
  var int_episode = parseInt(episode);
  int_episode--;
  return int_episode.toString();
}

function init() {
  localStorage.setItem(storedEpisodeTitle, "0");
  episode = "0";
}

function updateURL() {
  episode = incrementEpisodeCounter(episode);
  updateEpisodeTo(episode);
  url = "http://proxer.me/watch/559/" + episode + "/engdub";
}

function updateEpisodeTo(episode) {
  localStorage.setItem(storedEpisodeTitle, episode);
}

