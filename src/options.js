document.addEventListener("DOMContentLoaded", restoreOptions);
// Saves options to sync storage
function saveOptions(domainList) {
    const options = {};
  options[storedOptions] = {
    domains:getDomainList(domainList),
    mirrorDetails:document.getElementById("mirrorDetails").open,
    replaceTab:document.getElementById("replaceTab").checked,
    incognito:document.getElementById("incognito").checked,
    plainTextURL:document.getElementById("plainTextURL").checked,
    showUnknownDomainNotification:document.getElementById("showUnknownDomainNotification").checked,
    youtubeAutoplay:document.getElementById("youtubeAutoplay").checked,
    directLink:document.getElementById("directLink").checked,
    darkTheme:document.getElementById("darkTheme").checked,
    iconColor:document.getElementById("iconColor").value
  };
  chrome.storage.sync.set(options, function() { // show user save status
      const status = document.getElementById("status");
    status.text = chrome.i18n.getMessage("optionsSaved");
    setTimeout(function(){status.text = "";}, 1500);
  });
}
// Restores preferences stored in sync storage
function restoreOptions() {
  localizeHtmlPage();
  document.getElementById("issueReported").addEventListener("click", enableIssueReport);
    const defaultOptions = getDefaultOptions();
  chrome.storage.sync.get(defaultOptions, function(items) {
      const options = items[storedOptions];
    // set options in option page
      const domainList = new DomainList(options.domains, true);
    fillInDomainsAndMirrors(domainList);
    document.getElementById("mirrorDetails").open = options.mirrorDetails;
    document.getElementById("replaceTab").checked = options.replaceTab;
    document.getElementById("incognito").checked = options.incognito;
    document.getElementById("plainTextURL").checked = options.plainTextURL;
    document.getElementById("showUnknownDomainNotification").checked = options.showUnknownDomainNotification;
    document.getElementById("youtubeAutoplay").checked = options.youtubeAutoplay;
    document.getElementById("directLink").checked = options.directLink;
    document.getElementById("darkTheme").checked = options.darkTheme;
    document.getElementById("iconColor").value = options.iconColor;
    // add button listeners
    document.getElementById("iconColor").addEventListener("input", function(){setIconColor();});
    document.getElementById("save").addEventListener("click", function(){saveOptions(domainList);});
    if(options.darkTheme) {
      document.getElementById("options").className = "dark";
    }
  });
}
// Dropdown option to report issue is activated
function enableIssueReport(domainList) {
  document.getElementById("reportIssue").className = "btn";
  document.getElementById("reportIssue").href = "mailto:episode_issue@fantasymail.de?subject=[Issue]";
}
//------------------------------------------------------------------------------
// Domain and Mirror list handling ---------------------------------------------
function fillInDomainsAndMirrors(domainList) {
    const domainListElement = document.getElementById("domains");
    const domains = domainList.save();
    for (const domain in domains) {
        const domainEl = createDomainElement(domainList, domain);
    domainListElement.appendChild(domainEl);
  }
  domainListElement.appendChild(createAddElement(domainList));
}
// Adds stored mirrors of selected domain to the option page
function fillInMirrors(domainList, mirrors) {
  clearMirrorList();
    const list = document.getElementById("mirrors");
    let mirror_i = 0
  if(mirrors != null) {
      for (mirror_i; mirror_i < mirrors.length; mirror_i++) {
          const mirrorName = Object.keys(mirrors[mirror_i])[0];
          const mirrorSString = (mirrors[mirror_i])[mirrorName];
          const mirrorEl = createMirrorElement(domainList, mirrorName, mirrorSString, mirror_i);
      list.appendChild(mirrorEl);
    }
  }
  list.appendChild(createAddElement(domainList, mirror_i));
}
// @return one mirror element with given parameters
function createMirrorElement(domainList, mirrorName, mirrorSString, dataID) {
    const mirrorEl = document.createElement("li");
  mirrorEl.dataset.id = dataID;
  mirrorEl.setAttribute("id", mirrorName);
  mirrorEl.setAttribute("draggable", true);
    const icon = document.createElement("a");
  icon.setAttribute("class", "v-centered icon " + mirrorName);
  icon.addEventListener("error", function(){this.class="v-centered icon MyVideo";});
  mirrorEl.appendChild(icon);
  mirrorEl.appendChild(document.createTextNode(" " + mirrorName));
  (function(domainList, dataID, mirrorName, mirrorSString) {
    mirrorEl.addEventListener("click", function(){openAddEditMirrorDialog(domainList, dataID, mirrorName, mirrorSString);});
  })(domainList, dataID, mirrorName, mirrorSString);
  mirrorEl.addEventListener("dragstart", function(e){dragStart(e);});
  mirrorEl.addEventListener("dragenter", function(e){dragEnter(e);});
  return mirrorEl;
}
// @return add-domain/mirror element
function createAddElement(domainList, dataID) {
  dataID = dataID === undefined ? null : dataID;
    const addEl = document.createElement("li");
  addEl.style.textAlign = "center";
  addEl.innerHTML = "&#10133;"
  if(dataID === null) { //add domain element
    addEl.setAttribute("id", "addDomain");
    addEl.addEventListener("click", function(){openAddEditDomainDialog(domainList, "addDomain");});
  } else { //add mirror element
    addEl.dataset.id = dataID;
      addEl.setAttribute("id", "addMirror");
    addEl.addEventListener("click", function(){openAddEditMirrorDialog(domainList, dataID, "addMirror");});
  }
  return addEl;
}
// Clears mirror list in option page
function clearMirrorList () {
    const mirrors = document.getElementById("mirrors");
  while (mirrors.firstChild) {
    mirrors.firstChild.remove();
  }
}
// @return domain element
function createDomainElement(domainList, domain) {
    const domainEl = document.createElement("li");
  domainEl.innerHTML = domain;
  domainEl.setAttribute("id", domain);
    const domains = domainList.save();
  if(domains[domain].selected) {
    domainEl.setAttribute("class", "activeDomain");
    fillInMirrors(domainList, domains[domain].mirrorList);
  }
  domainEl.addEventListener("click", function(){openAddEditDomainDialog(domainList, domain);});
  return domainEl;
}
// Add/edit domain ui
function openAddEditDomainDialog(domainList, domainName) {
    const add = domainName === "addDomain";
  if(domainList.getSelected().name === domainName || add) {
      const domainEl = document.createElement("li");
    domainEl.setAttribute("id", domainName);
      const inputName = createInput(domainList, "domainName-" + domainName, domainName, add, false, false);
    domainEl.appendChild(inputName);
      const deleteDomainEl = createDeleteButton(domainList, deleteDomain, domainName, false);
    domainEl.appendChild(deleteDomainEl);
      const submitDomain = createSubmitButton(domainList, addEditDomain, domainName, false);
    domainEl.appendChild(submitDomain);
    if(add) { // Add
        const addDomainEl = document.getElementById("addDomain");
      addDomainEl.parentNode.replaceChild(domainEl, addDomainEl);
      selectDomain(domainList); // deselect all
    } else { // Edit
        const editDomainEl = document.getElementById(domainName);
      editDomainEl.parentNode.replaceChild(domainEl, editDomainEl);
    }
    document.getElementById("domainName-"+domainName).focus();
  } else { // select other domain
    selectDomain(domainList, domainName);
  }
}
// Selects clicked domain
function selectDomain(domainList, domainName) {
  domainList.select(domainName);
  clearMirrorList();
  if(domainName != null) { // select other domain
    fillInMirrors(domainList, domainList.getSelected().mirrorList.save());
  }
}
// Creates button for input ui
function createButton(domainList, text, title, clickFun, name, right) {
  right = right === undefined ? true : right;
    const button = document.createElement("a");
  button.innerHTML = text;
  if(right)
    button.className = "btn right";
  else
    button.className = "btn";
  button.title = title;
  button.addEventListener("click", function(){clickFun(domainList, name);});
  return button;
}
// Creates delete button
function createDeleteButton(domainList, deleteFun, name, right) {
  return createButton(domainList, "&#x2718;", chrome.i18n.getMessage("delete"), deleteFun, name, right);
}
// Creates submit button
function createSubmitButton(domainList, submitFun, name, right) {
  return createButton(domainList, "&#x2714;", chrome.i18n.getMessage("save"), submitFun, name, right);
}
// Replaces mirror/addMirror element with input ui
function createInput(domainList, id, name, add, mirror, substitution) {
  add = add === undefined ? false : add;
  mirror = mirror === undefined ? false : mirror;
  substitution = substitution === undefined ? false : substitution;
    const inputElement = document.createElement("input");
  inputElement.type = "text";
  inputElement.id = id; // "mirrorName-"+name / "domainName-"+name
  if(!substitution) {
    inputElement.name = name; // mirrorName/domainName
    if(mirror) {
      inputElement.addEventListener("input", function(event){
        if(domainList.checkMirrorExists(event.target.value, event.target.name)) {
          document.getElementById("mirrorName-"+event.target.name).style.borderColor = "red";
        } else {
          document.getElementById("mirrorName-"+event.target.name).style.borderColor = "inherit";
        }
      }, true);
    } else {
      inputElement.addEventListener("input", function(event){
        if(domainList.checkDomainNameOK(event.target.value)) {
          document.getElementById("domainName-"+event.target.name).style.borderColor = "inherit";
        } else {
          document.getElementById("domainName-"+event.target.name).style.borderColor = "red";
        }
      }, true);
    }
  }
  if(add) {
    if(substitution) {
      inputElement.placeholder = chrome.i18n.getMessage("substitutionString");
    } else {
      inputElement.placeholder = chrome.i18n.getMessage("name");
    }
  } else {
    inputElement.value = name;
  }
  return inputElement;
}
// Add/edit mirror ui
function openAddEditMirrorDialog(domainList, dataID, mirrorName, mirrorSString) {
    const add = mirrorSString === undefined;
    const mirrorEl = document.createElement("li");
  mirrorEl.dataset.id = dataID;
  mirrorEl.setAttribute("id", mirrorName);
    const deleteMirrorEl = createDeleteButton(domainList, deleteMirror, mirrorName);
  mirrorEl.appendChild(deleteMirrorEl);
    let divEl = document.createElement("div");
  divEl.style.overflow = "hidden";
    const inputName = createInput(domainList, "mirrorName-" + mirrorName, mirrorName, add, true, false);
  divEl.appendChild(inputName);
  mirrorEl.appendChild(divEl);
    const submitMirror = createSubmitButton(domainList, addEditMirror, mirrorName);
  mirrorEl.appendChild(submitMirror);
    divEl = document.createElement("div");
  divEl.style.overflow = "hidden";
    const inputSString = createInput(domainList, "mirrorSString-" + mirrorName, mirrorSString, add, true, true);
  divEl.appendChild(inputSString);
  mirrorEl.appendChild(divEl);
  if(add) { // Add
      const addMirrorEl = document.getElementById("addMirror");
    addMirrorEl.parentNode.replaceChild(mirrorEl, addMirrorEl);
  } else { // Edit
      const editMirrorEl = document.getElementById(mirrorName);
    editMirrorEl.parentNode.replaceChild(mirrorEl, editMirrorEl);
  }
  document.getElementById("mirrorName-"+mirrorName).focus();
}
// Handles domain-submit button click
function addEditDomain(domainList, oldDomainName) {
    const domainName = document.getElementById("domainName-" + oldDomainName).value;
    const oldDomain = document.getElementById(oldDomainName);
  if(oldDomainName === "addDomain") { // add new
    if(domainList.add(domainName, [])) {
        const domainEl = createDomainElement(domainList, domainName);
      oldDomain.parentNode.replaceChild(domainEl, oldDomain);
      document.getElementById("domains").appendChild(createAddElement(domainList));
    }
  } else if (domainList.edit(domainName)) {
      const domainEl = createDomainElement(domainList, domainName);
      oldDomain.parentNode.replaceChild(domainEl, oldDomain);
  }
}
// Handles mirror-submit button click
function addEditMirror(domainList, oldMirrorName) {
    const mirrorName = document.getElementById("mirrorName-" + oldMirrorName).value;
    const mirrorSString = document.getElementById("mirrorSString-" + oldMirrorName).value;
    const oldMirror = document.getElementById(oldMirrorName);
    const dataID = oldMirror.dataset.id;
  if(oldMirrorName === "addMirror") { // add new
    if(domainList.addMirror(oldMirrorName, mirrorName, mirrorSString)) {
        const mirrorEl = createMirrorElement(domainList, mirrorName, mirrorSString, dataID);
      oldMirror.parentNode.replaceChild(mirrorEl, oldMirror);
      document.getElementById("mirrors").appendChild(createAddElement(domainList, Number.parseInt(dataID)+1));
    }
  } else if (domainList.editMirror(oldMirrorName, mirrorName, mirrorSString)) { // edit
      const mirrorEl = createMirrorElement(domainList, mirrorName, mirrorSString, dataID);
      oldMirror.parentNode.replaceChild(mirrorEl, oldMirror);
  }
}
// Handles domain-delete button click
function deleteDomain(domainList, domainName) {
    const domain = document.getElementById(domainName);
    const selectDomain = domainList.delete(domainName);
  if(domainName === "addDomain") {
    domain.parentNode.replaceChild(createAddElement(domainList), domain);
  } else {
    domain.remove();
  }
  clearMirrorList();
  if(selectDomain != null) { // select other domain
    fillInMirrors(domainList, domainList.getSelected().mirrorList.save());
  }
  getDomainList(domainList);
}
// Handles mirror-delete button click
function deleteMirror(domainList, mirrorName) {
    const mirror = document.getElementById(mirrorName);
    const dataID = mirror.dataset.id;
  if(mirrorName === "addMirror") {
    mirror.parentNode.replaceChild(createAddElement(domainList, dataID), mirror);
  } else {
    mirror.remove();
  }
  getDomainList(domainList);
}
// @return domain list with reordered mirrorlist
function getDomainList(domainList) {
    const mirrors = document.getElementById("mirrors").getElementsByTagName("li");
    const mirrorOrder = [];
    for (let mirrorI of mirrors) {
        if (mirrorI.id !== "addMirror") {
            mirrorOrder.push(Number.parseInt(mirrorI.dataset.id));
    }
  }
  return domainList.save(mirrorOrder);
}
