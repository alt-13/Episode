var iconPath = "img/icons/";
// opens the add / edit mode


// Mirror ----------------------------------------------------------------------
function Mirror(name, sString, priority) {
	this.name = name;
	this.sString = sString;
	this.id = priority;
}
// edit mirror
Mirror.prototype.edit = function(name, sString, priority) {
  if(name != null)
    this.name = name;
  if(sString != null)
    this.sString = sString;
  this.priority = priority;
};
// @return trimmed mirror (only non-function properties)
Mirror.prototype.save = function() {
  var mirrorToStore = {};
  for(var property in this) {
    if(typeof this[property] !== "function"){
      mirrorToStore[property] = this[property];
    }
  }
  return mirrorToStore;
};
// MirrorList ------------------------------------------------------------------
function MirrorList(mirrorList) {
	this.mirrorList = mirrorList; // TODO: fillInM... and others to vector
	this.add = function(, save) {

	}
	this.edit = function() {

	}
	this.delete = function() {

	}
	this.save = function() {

	}
	// fills list with mirrors in options page
  this.fillInMirrors = function(openAddEditMirrorDialog) {
  	var list = document.getElementById("mirrors");
  	//remove all others before
    for(var mirror in this) {
    	var m = this[mirror];
      if(typeof m !== "function") {
        var el = document.createElement("li");
        el.setAttribute("data-id", m.priority);
				var icon = document.createElement("img");
				icon.setAttribute("src", iconPath + m.name + ".ico");
				icon.addEventListener("error", function(){this.src=iconPath+"default.ico";});
				el.appendChild(icon);
    		el.appendChild(document.createTextNode(" " + m.name));
    		el.addEventListener("click", function(){openAddEditMirrorDialog(m.name, m.sString, m.priority);});
        list.appendChild(el);
      }
    }
  };
	// MirrorList constructor
  if(mirrorList !== null) {
    for(var mirror in mirrorList) {
    	var m = mirrorList[mirror];
      this.add(m.name, m.sString, false);
    }
  }
}

// Domain ----------------------------------------------------------------------
function Domain(name, mirrorList, selected) {
	this.name = name;
	this.mirrorList = MirrorList(mirrorList);
	this.selected = selected;
}
// DomainList ------------------------------------------------------------------
function DomainList(domainList) {
	this.add = function(name, mirrorList, selected, save) {

	}
	this.addMirror = function() {

	}
	this.edit = function() {

	}
	this.editMirror = function() {

	}
	this.delete = function() {

	}
	this.deleteMirror = function() {

	}
	this.select = function(name) {
		for(var domain in this) {
      if(typeof this[domain] !== "function")
        this[domain].selected = false;
    }
    if(name != null && name in this) {
    	this[name].mirrorList.fillInMirrors();
      this[name].selected = true;
    }
	}
	// @return array of mirrors (incl. sStrings) for domain sorted by priority
	this.getSortedMirrorList(domain) {
		
	}
	this.save = function() {
		var domainListToStore = {};
	  for(var property in this) {
	    if(typeof this[property] !== "function") {
	    	var domainToStore = {};
				domainToStore.selected = this[property].selected;
				domainToStore.mirrorList = this[property].mirrorList.save();
        domainListToStore[property] = domainToStore;
	    }
	  }
	  return domainListToStore;
	}
	// DomainList constructor
  if(domainList !== null) {
    for(var domain in domainList) {
    	var d = domainList[domain];
      this.add(domain, d.mirrorList, d.selected, false);
    }
  }
}