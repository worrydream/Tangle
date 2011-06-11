//
//  Tangle.js
//  Tangle 0.0.1
//
//  Created by Bret Victor on 5/2/10.
//  (c) 2011 Bret Victor.  MIT open-source license.
//
//  ------ UI components ------
//
//  Tangle.formats.myFormat = function (value) { ... }
//  Tangle.classes.myClass = { ... }
//
//  ------ model ------
//
//  var tangle = new Tangle(rootElement, model);
//  tangle.setModel(model);
//
//  ------ variables ------
//
//  var value = tangle.getValue(variableName);
//  tangle.setValue(variableName, value);
//  tangle.setValues({ variableName:value, variableName:value });
//
//

Tangle = function (rootElement, modelClass) {

    var tangle = this;
    tangle.element = rootElement;
    tangle.setModel = setModel;
    tangle.getValue = getValue;
    tangle.setValue = setValue;
    tangle.setValues = setValues;

    var model;
    var settersByVariableName = {};


    //----------------------------------------------------------
    //
    // construct

    initializeElements();
    setModel(modelClass);
    return tangle;


    //----------------------------------------------------------
    //
    // elements

    function initializeElements() {
        var elements = rootElement.getElementsByTagName("*");
        var interestingElements = [];
        
        // build a list of elements with class or data-var attributes
        
		for (var i = 0, length = elements.length; i < length; i++) {
            var element = elements[i];
            if (element.getAttribute("class") || element.getAttribute("data-var")) {
            	interestingElements.push(element);
            }
        }

        // initialize interesting elements in this list.  (Can't traverse "elements"
        // directly, because "elements" is "live", and views that change the node tree
        // will change "elements" mid-traversal.)
        
        for (var i = 0, length = interestingElements.length; i < length; i++) {
            var element = interestingElements[i];
            
            var varNames = null;
            var varAttribute = element.getAttribute("data-var");
            if (varAttribute) { varNames = varAttribute.split(" "); }

            var views = null;
            var classAttribute = element.getAttribute("class");
            if (classAttribute) {
                var classNames = classAttribute.split(" ");
                views = getViewsForElement(element, classNames, varNames);
            }
            
            if (!varNames) { continue; }
            
            var didAddSetter = false;
            if (views) {
                for (var j = 0; j < views.length; j++) {
                    if (!views[j].update) { continue; }
                    addViewSettersForElement(element, varNames, views[j]);
                    didAddSetter = true;
                }
            }
            
            if (!didAddSetter) {
                var formatAttribute = element.getAttribute("data-format");
                var formatter = getFormatter(formatAttribute || "default");
                addDefaultSettersForElement(element, varNames, formatter);
            }
        }
    }
            
    function getViewsForElement(element, classNames, varNames) {
        var views = null;
        
        for (var i = 0, length = classNames.length; i < length; i++) {
            var clas = Tangle.classes[classNames[i]];
            if (!clas) { continue; }
            
            var args = [ element, tangle ];
            if (varNames) { args = args.concat(varNames); }
            
            var View = function () { };
            View.prototype = clas;
            
            var view = new View();  // todo mootools class
            if (view.initialize) { view.initialize.apply(view,args); }
            
            if (!views) { views = []; }
            views.push(view);
        }
        
        return views;
    }
    

    //----------------------------------------------------------
    //
    // formatters

    function getFormatter(formatAttribute) {
        var formatter = Tangle.formats[formatAttribute] || getSprintfFormatter(formatAttribute);
        if (!formatter) { 
            log("Tangle: unknown format: " + formatAttribute);
            formatter = function () { return "" };
        }
        return formatter;
    }
    
    function getSprintfFormatter(formatAttribute) {
    	if (!sprintf || !formatAttribute.test(/\%/)) { return null; }
    	var formatter = function (value) { return sprintf(formatAttribute, value); };
    	return formatter;
    }

    
    //----------------------------------------------------------
    //
    // setters

    function addViewSettersForElement(element, varNames, view) {
        var setter;
        if (varNames.length === 1) {
            setter = function (value) { view.update(element, value); };
        }
        else {
            setter = function () {
                var args = [ element ];
                for (var i = 0, length = varNames.length; i < length; i++) { args.push(getValue(varNames[i])); }
                view.update.apply(view,args);
            };
        }

        for (var i = 0; i < varNames.length; i++) {
            addSetterForVariable(varNames[i], setter);  //  todo, how to avoid being called 3 times
        }
    }

    function addDefaultSettersForElement(element, varNames, formatter) {
        var span = null;
        var setter = function (value) {
            if (!span) { 
                span = document.createElement("span");
                element.insertBefore(span, element.firstChild);
            }
            span.innerHTML = formatter(value);
        };
        addSetterForVariable(varNames[0], setter);
    }
    
    function addSetterForVariable(varName, setter) {
        if (!settersByVariableName[varName]) { settersByVariableName[varName] = []; }
        settersByVariableName[varName].push(setter);
    }

    function applySettersForVariable(varName, value) {
        var setters = settersByVariableName[varName];
        if (!setters) { return; }
        for (var i = 0, length = setters.length; i < length; i++) {
            setters[i](value);
        }
    }
    

    //----------------------------------------------------------
    //
    // variables

    function getValue(varName) {
        var value = model[varName];
        if (value === undefined) { log("Tangle: unknown variable: " + varName);  return 0; }
        return value;
    }

    function setValue(varName, value) {
        var obj = {}
        obj[varName] = value;
        setValues(obj);
    }

    function setValues(obj) {
        var didChangeValue = false;

        for (var varName in obj) {
            var value = obj[varName];
            var oldValue = model[varName];
            if (oldValue === undefined) { log("Tangle: setting unknown variable: " + varName);  return; }
            if (oldValue === value) { continue; }  // don't update if new value is the same

            model[varName] = value;
            applySettersForVariable(varName, value);
            didChangeValue = true;
        }
        
        if (didChangeValue) { updateModel(); }
    }
    
                    
    //----------------------------------------------------------
    //
    // model

    function setModel(modelClass) {
        var ModelClass = function () { };  // todo mootools class
        ModelClass.prototype = modelClass;
        
        model = new ModelClass();
        updateModel(true);  // initialize and update
    }
    
    function updateModel(shouldInitialize) {
        var ShadowModel = function () {};
        ShadowModel.prototype = model;
        var shadowModel = new ShadowModel;
        
        if (shouldInitialize) { shadowModel.initialize(); }
        shadowModel.update();
        
        var changedVarNames = [];
        for (var varName in shadowModel) {
            if (model[varName] !== shadowModel[varName]) {
                model[varName] = shadowModel[varName];
                changedVarNames.push(varName);
            }
        }
        
        for (var i = 0, length = changedVarNames.length; i < length; i++) {
            var varName = changedVarNames[i];
            applySettersForVariable(varName, model[varName]);
        }
    }


    //----------------------------------------------------------
    //
    // debug

    function log (msg) {
        if (window.console) window.console.log(msg);
    }

};  // end of Tangle


//----------------------------------------------------------
//
// components

Tangle.classes = {};
Tangle.formats = {};

Tangle.formats["default"] = function (value) { return "" + value; }

