document.addEventListener("DOMContentLoaded", restoreOptions);
// Saves options to sync storage
function saveOptions(order, domainList) {
  var options = {};
  options[storedOptions] = {
    order:order,
    domains:domainList,
    incognito:document.getElementById("incognito").checked,
    plainTextURL:document.getElementById("plainTextURL").checked,
    showUnknownDomainNotification:document.getElementById("showUnknownDomainNotification").checked,
    iconColor:document.getElementById("iconColor").value
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
  var defaultOptions = getDefaultOptions();
  chrome.storage.sync.get(defaultOptions, function(items) {
    var options = items[storedOptions];
    // set options in option page
    addDomainsAndMirrors(options.domains);
    var el = document.getElementById("mirrors");
    var sortable = Sortable.create(el);
    sortable.sort(options.order);
    document.getElementById("incognito").checked = options.incognito;
    document.getElementById("plainTextURL").checked = options.plainTextURL;
    document.getElementById("showUnknownDomainNotification").checked = options.showUnknownDomainNotification;
    document.getElementById("iconColor").value = options.iconColor;
    // add button listeners
    document.getElementById("iconColor").addEventListener("input", function(){setIconColor();});
    document.getElementById("addMirror").addEventListener("click", function(){openAddEditMirrorDialog();});
    document.getElementById("addDomain").addEventListener("click", openAddDomainDialog);
    document.getElementById("save").addEventListener("click", function(){saveOptions(sortable.toArray(), options.domains);});
  });
}
// Dropdown option to report issue is activated
function enableIssueReport() {
  document.getElementById("reportIssue").className = "btn";
  document.getElementById("reportIssue").href = "mailto:alt13@gmx.at?subject=[Issue]";
}
// Adds stored mirrors to the option page
function addDomainsAndMirrors(domains) {
  var domainList = document.getElementById("domains");
  var domain_i = true;
  for(var domain in domains) {
    var domainEl = document.createElement("li");
    domainEl.innerHTML = domain;
    domainEl.setAttribute("id", domain);
    if(domain_i) {
      domainEl.setAttribute("class", "activeDomain");
      addMirrors(domains[domain]);
      domain_i = false;
    }
    domainList.appendChild(domainEl);
  }
  var addDomain = document.createElement("li");
  addDomain.setAttribute("id", "addDomain");
  addDomain.innerHTML = "&#10133;";
  domainList.appendChild(addDomain);
}
// Adds stored mirrors to the option page
function addMirrors(mirrors) {
  var mirrorList = document.getElementById("mirrors");
  for(var mirror_i = 0; mirror_i < mirrors.length; mirror_i++) {
    var mirrorName = Object.keys(mirrors[mirror_i])[0];
    var mirrorEl = document.createElement("li");
    mirrorEl.setAttribute("data-id", mirror_i);
    var icon = document.createElement("img");
    icon.setAttribute("src", "img/icons/" + mirrorName + ".ico");
    icon.addEventListener("error", function(){this.src="img/icons/default.ico";});
    mirrorEl.appendChild(icon);
    mirrorEl.appendChild(document.createTextNode(" " + mirrorName));
    mirrorEl.addEventListener("click", function(){openAddEditMirrorDialog(mirrorName, mirrors[mirrorName], mirror_i);});
    mirrorList.appendChild(mirrorEl);
  }
  var addMirror = document.createElement("li");
  addMirror.setAttribute("id", "addMirror");
  addMirror.setAttribute("data-id", mirror_i+1);
  addMirror.innerHTML = "&#10133;";
  mirrorList.appendChild(addMirror);
}
// Clears mirror list in option page
function clearMirrors() {
  var mirrors = document.getElementById("mirrors");
  while (mirrors.firstChild) {
      mirrors.removeChild(mirrors.firstChild);
  }
}
// Add/edit mirror
function openAddEditMirrorDialog(mirrorName, sSString, dataID) {
  mirrorName = typeof mirrorName != "undefined" ? mirrorName : null;
  if(mirrorName == null) { // Add
    var mirrorListLength = document.getElementById("mirrors").getElementsByTagName("li").length;
    var mirrorEl = document.createElement("li");
    mirrorEl.setAttribute("id", mirrorListLength-1);
    var inputName = document.createElement("input");
    inputName.type = "text";
    inputName.id = "mirrorName";
    inputName.placeholder = chrome.i18n.getMessage("name");
    mirrorEl.appendChild(inputName);
    var inputSSString = document.createElement("input");
    inputSSString.type = "text";
    inputSSString.id = "mirrorSSString";
    inputSSString.placeholder = chrome.i18n.getMessage("substitutionString");
    mirrorEl.appendChild(inputSSString);
    var addMirror = document.getElementById("addMirror");
    addMirror.setAttribute("data-id", mirrorListLength);
    addMirror.parentNode.insertBefore(mirrorEl, addMirror);
  } else { // Edit
    var editMirror = document.getElementById(dataID);
    var mirrorEl = document.createElement("li");
    mirrorEl.setAttribute("data-id", dataID);
    // substitute mirror with edit window.
  }
}
// Add/edit domain
function openAddDomainDialog() {

}
// Adds mirror to the stored data and to the option page
function addToMirrorList(mirrors, name, substitutionString) {
  for(var i = 0; i < mirrors.length; i++) {
    if(Object.keys(mirrors[mirror_i])[0] == name) {
      return false;
    }
  }
  document.getElementById("mirrors").removeChild(document.getElementById(mirrors.length));
  var mirrorEl = document.createElement("li");
  mirrorEl.setAttribute("data-id", mirrors.length);
  mirrorEl.appendChild(document.createTextNode(" " + name));
  mirror = {};
  mirror[name] = substitutionString;
  mirrors.push(mirror);
  var addMirror = document.getElementById("addMirror");
  addMirror.parentNode.insertBefore(mirrorEl, addMirror);
  return mirrors;
}
// Adds domain to the stored data and to the option page
function addToDomainList(domains, name) {
  if(typeof domains[name] !== "undefined") {
    document.getElementsByClassName("activeDomain").className = "";
    document.getElementById(name).className = "activeDomain";
    clearMirrors();
    addMirrors(domains[name]);
    return false;
  }
  domains[name] = [];
  var domainEl = document.createElement("li");
  domainEl.innerHTML = name;
  domainEl.setAttribute("id", name);
  var addDomain = document.getElementById("addDomain");
  addDomain.parentNode.insertBefore(domainEl, addDomain);
  return domains;
}
