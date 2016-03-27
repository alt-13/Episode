document.addEventListener("DOMContentLoaded", restoreOptions);
// Saves options to sync storage
function saveOptions(sortable) {
  var options = {};
  options[storedOptions] = {
    defaultOrder:sortable.toArray(),
    defaultIncognito:document.getElementById("defaultIncognito").checked,
    defaultPlainTextURL:document.getElementById("defaultPlainTextURL").checked
  };
  chrome.storage.sync.set(options, function() { // show user save status
    var status = document.getElementById("status");
    status.text = chrome.i18n.getMessage("optionsSaved");
    setTimeout(function(){status.text = "";}, 1500);
  });
}
// Restores preferences stored in sync storage
function restoreOptions() {
  localizeHtmlPage();
  document.getElementById("issueReported").addEventListener("click", enableIssueReport);
  var defaultOrder = [];
  for(var i=1; i<=document.getElementById("mirrors").getElementsByTagName("li").length; i++) { defaultOrder.push(i.toString()); }
  var defaultOptions = getDefaultOptions(defaultOrder);
  chrome.storage.sync.get(defaultOptions, function(items) {
    var order = items[storedOptions].defaultOrder;
    var el = document.getElementById("mirrors");
    var sortable = Sortable.create(el, {store:{get:function(sortable){return order?order:[];},set:function(sortable){}}});
    document.getElementById("save").addEventListener("click", function(){saveOptions(sortable);});
    document.getElementById("defaultIncognito").checked = items[storedOptions].defaultIncognito;
    document.getElementById("defaultPlainTextURL").checked = items[storedOptions].defaultPlainTextURL;
  });
}
function enableIssueReport() {
  document.getElementById("reportIssue").className = "btn";
  document.getElementById("reportIssue").href = "mailto:alt13@gmx.at?subject=[Issue]";
}
// Mirror
function Mirror(name, substitutionString) {
  this.name = name;
  this.ssString = substitutionString;
}
// // MirrorList
// function MirrorList(mirrorList) {
//   // adds mirror
//   this.add = function(hostname, mirrors, save) {
//     for(var host in this) {
//       if(typeof this[host] !== "function") {
//         this[host] = new Mirror();
//       } else if(save) {
//         this[series].selected = false;
//       }
//     }
//     this[sname] = new Series(sname, url, season, episode, incognito, selected);
//     if(save) {
//       this.save();
//     }
//     if(save || this[sname].selected) {
//       chrome.browserAction.setTitle({title:sname+" - S"+this[sname].season+"E"+this[sname].episode});
//     }
//   };
// }
// // HostList
// function HostList(hostList) {
//   this.add = function(name, mirrorList, save) {
//     save = save !== "undefined" ? save : true;
//     this[name] = new MirrorList(mirrorList);
//   }
//   // HostList constructor
//   if(hostList !== null) {
//     for(var host in hostList) {
//       var h = hostList[host];
//       this.add(h.name, h.mirrorList, false);
//     }
//   }
// }