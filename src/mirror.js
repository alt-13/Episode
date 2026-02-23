let iconPath = "img/icons/";

// MirrorList ------------------------------------------------------------------
function MirrorList(mirrorList) {
  let mirrors_ = mirrorList === undefined ? [] : mirrorList;
  // @return true added successfully else (tried to add existing) false
  this.add = function (oldMirror, name, sString) {
    if (this.checkMirrorExists(name, oldMirror)) {
      return false;
    } else {
      let newMirror = {};
      newMirror[name] = sString;
      mirrors_.push(newMirror);
      return true;
    }
  };
  // @return true edited successfully else (tried to edit to existing) false
  this.edit = function (oldMirror, newMirror, sString) {
    if (this.checkMirrorExists(newMirror, oldMirror)) {
      return false;
    } else {
      let editMirror = {};
      editMirror[newMirror] = sString;
      for (let mirror_i = 0; mirror_i < mirrors_.length; mirror_i++) {
        if (Object.keys(mirrors_[mirror_i])[0] == oldMirror) {
          mirrors_[mirror_i] = editMirror;
        }
      }
      return true;
    }
  };
  // @return true when mirror already exists else false otherwise
  this.checkMirrorExists = function (mirror, oldMirror) {
    if (mirror === undefined || mirror === "")
      return true; // bad mirror name
    oldMirror = oldMirror === undefined ? null : oldMirror;
    let instances = 0;
    for (const element of mirrors_) {
      if (Object.keys(element)[0] == mirror) {
        instances++;
      }
    }
    if (oldMirror === "addMirror") { // Add
      return instances > 0;
    } else { // Edit and input listener
      return !(oldMirror === mirror || instances == 0);
    }
  };
  // @return reordered mirror list
  this.save = function (mirrorOrder) {
    let newMirrorList = [];
    if (mirrorOrder !== undefined) {
      for (let i = 0; i < mirrorOrder.length; i++) {
        newMirrorList[i] = mirrors_[mirrorOrder[i]];
      }
      mirrors_ = newMirrorList;
    }
    return mirrors_;
  };
}

// Domain ----------------------------------------------------------------------
function Domain(name, mirrorList, selected) {
  this.name = name;
  this.mirrorList = new MirrorList(mirrorList);
  this.selected = selected;
}

// DomainList ------------------------------------------------------------------
function DomainList(domainList) {
  // @return number of domains (typeof domain != "function") of @param domainList
  let length = function (domainList) {
    let numberOfDomains = 0;
    for (let domain in domainList) {
      if (typeof domainList[domain] !== "function") {
        numberOfDomains++;
      }
    }
    return numberOfDomains;
  };
  // adds domain to list
  // @param selected (optional), default true
  // @param save (optional), default true
  //                         false: less storage access in constructor
  this.add = function (name, mirrorList, selected, save) {
    if (!this.checkDomainNameOK(name))
      return false;
    selected = selected === undefined ? true : selected;
    save = save === undefined ? true : save;
    let dname = name;
    for (let domain in this) {
      if (typeof this[domain] === "function") {
        if (domain == name) {
          dname = name + " ";
        }
      } else if (save) { // deselects all others (except new one)
        this[domain].selected = false;
      }
    }
    this[dname] = new Domain(dname, mirrorList, selected);
    if (save) {
      this.save();
    }
    return true;
  };
  // edits domain name
  this.edit = function (name) {
    if (!this[name] || typeof this[name] === "function") { // name not in list
      let s = this.getSelected(); // add new series deselects all
      let mirrorList = [];
      if (s !== null) { // rename
        mirrorList = s.mirrorList.save();
        delete this[s.name];
      }
      this.add(name, mirrorList);
      return true;
    } else if (!this[name].selected) { // name not selected (wants to rename to
      return false;                   // existing name -> bad idea)
    }
    return true;
  };
  // deletes domain with given name
  // @return name of the new selected domain if list not empty, null otherwise
  this.delete = function (name) {
    if (typeof this[name] !== "function" && this[name] !== undefined) {
      delete this[name];
    }
    if (length(this) !== 0) { // not empty
      let newSelected;
      for (let domain in this) {
        if (typeof this[domain] !== "function") {
          newSelected = domain;
        }
      }
      this.select(newSelected);
      return newSelected;
    }
    return null;
  };
  // selects domain
  this.select = function (name) {
    for (let domain in this) {
      if (typeof this[domain] !== "function")
        this[domain].selected = false;
    }
    let activeDomain = document.getElementsByClassName("activeDomain");
    if (activeDomain.length !== 0) {
      activeDomain[0].className = "";
    }
    if (name != null && name in this) {
      this[name].selected = true;
      document.getElementById(name).className = "activeDomain";
    }
  };
  // @return selected domain (from domain list)
  this.getSelected = function () {
    let selected = null;
    for (let domain in this) {
      let d = this[domain];
      if (typeof d !== "function") {
        if (d.selected) selected = d;
      }
    }
    return selected;
  };
  // checks if domain name is not in use yet
  this.checkDomainNameOK = function (name) {
    if (name === undefined || name === "")
      return false; // bad domain name
    else if (!this[name])
      return true;
    else if (this[name].selected) {
      return true;
    } else {
      return false;
    }
  };
  // MirrorList function calls -------------------------------------------------
  // @return true added successfully else (tried to add existing) false
  this.addMirror = function (oldName, name, substitutionString) {
    return this.getSelected().mirrorList.add(oldName, name, substitutionString);
  };
  // @return true edited successfully else (tried to edit to existing) false
  this.editMirror = function (oldName, name, substitutionString) {
    return this.getSelected().mirrorList.edit(oldName, name, substitutionString);
  };
  // deleteMirror is handled with save(mirrorOrder)
  // @return true when exists else false
  this.checkMirrorExists = function (mirror, oldMirror) {
    return this.getSelected().mirrorList.checkMirrorExists(mirror, oldMirror);
  };
  //----------------------------------------------------------------------------
  // @return trimmed (no functions) domain list for sync storage
  this.save = function (mirrorOrder) {
    let domainListToStore = {};
    for (let domain in this) {
      if (typeof this[domain] !== "function") {
        let domainToStore = {};
        domainToStore.selected = this[domain].selected;
        domainToStore.mirrorList = this[domain].mirrorList.save(mirrorOrder);
        domainListToStore[domain] = domainToStore;
      }
    }
    return domainListToStore;
  };
  // DomainList constructor
  if (domainList !== null) {
    for (let domain in domainList) {
      let d = domainList[domain];
      this.add(domain, d.mirrorList, d.selected, false);
    }
  }
}
