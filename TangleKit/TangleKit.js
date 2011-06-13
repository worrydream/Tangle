//
//  TangleKit.js
//  Tangle 0.0.1
//
//  Created by Bret Victor on 6/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function () {


//----------------------------------------------------------
//
//  TKIf
//
//  Shows the element if value is true (non-zero), hides if false.
//  Add the data-invert="1" attribute to hide if false instead.

Tangle.classes.TKIf = {
    
    initialize: function (element, tangle, variable) {
        this.isInverted = !!element.getAttribute("invert");
    },
    
    update: function (element, value) {
        if (this.isInverted) { value = !value; }
        element.style.display = !value ? "none" : "inline";   // todo, block or inline?
    }
};


//----------------------------------------------------------
//
//  TKSwitch
//
//  Shows the element's nth child if value is n.

Tangle.classes.TKSwitch = {

    update: function (element, value) {
        element.getChildren().each( function (child, index) {
            child.style.display = (index != value) ? "none" : "inline";
        });
    }
};


//----------------------------------------------------------
//
//  TKPlusMinus
//
//  Shows the element's first child if value is positive or zero.
//  Shows the element's second child if value is negative.

Tangle.classes.TKPlusMinus = {

    update: function (element, value) {
        Tangle.classes.TKSwitch.update(element, value < 0);
    }
};


//----------------------------------------------------------
//
//  TKToggle
//
//  Click to toggle value between 0 and 1.

Tangle.classes.TKToggle = {

    initialize: function (element, tangle, variable) {
        element.addEvent("click", function (event) {
            var isActive = tangle.getValue(variable);
            tangle.setValue(variable, isActive ? 0 : 1);
        });
    }
};


//----------------------------------------------------------
//
//  TKAdjustableNumber
//
//  Drag a number to adjust.

var isAnyAdjustableNumberDragging = false;  // hack for dragging one value over another one

Tangle.classes.TKAdjustableNumber = {

    initialize: function (element, tangle, variable) {
        this.element = element;
        this.tangle = tangle;
        this.variable = variable;

        this.min = (element.getAttribute("data-min") !== null) ? parseFloat(element.getAttribute("data-min")) : 1;
        this.max = (element.getAttribute("data-max") !== null) ? parseFloat(element.getAttribute("data-max")) : 10;
        this.step = (element.getAttribute("data-step") !== null) ? parseFloat(element.getAttribute("data-step")) : 1;
        
        this.initializeHover();
        this.initializeHelp();
        this.initializeDrag();
    },


    // hover
    
    initializeHover: function () {
        this.isHovering = false;
        this.element.addEvent("mouseenter", (function () { this.isHovering = true;  this.updateRolloverEffects(); }).bind(this));
        this.element.addEvent("mouseleave", (function () { this.isHovering = false; this.updateRolloverEffects(); }).bind(this));
    },
    
    updateRolloverEffects: function () {
        this.updateStyle();
        this.updateCursor();
        this.updateHelp();
    },
    
    isActive: function () {
        return this.isDragging || (this.isHovering && !isAnyAdjustableNumberDragging);
    },

    updateStyle: function () {
        if (this.isDragging) { this.element.addClass("TKAdjustableNumberDown"); }
        else { this.element.removeClass("TKAdjustableNumberDown"); }
        
        if (!this.isDragging && this.isActive()) { this.element.addClass("TKAdjustableNumberHover"); }
        else { this.element.removeClass("TKAdjustableNumberHover"); }
    },

    updateCursor: function () {
        var body = document.getElement("body");
        if (this.isActive()) { body.addClass("TKCursorDragHorizontal"); }
        else { body.removeClass("TKCursorDragHorizontal"); }
    },


    // help

    initializeHelp: function () {
        this.helpElement = (new Element("div", { "class": "TKAdjustableNumberHelp" })).inject(this.element, "top");
        this.helpElement.setStyle("display", "none");
        this.helpElement.set("text", "drag");
    },
    
    updateHelp: function () {
        var size = this.element.getSize();
        var top = -size.y + 7;
        var left = Math.round(0.5 * (size.x - 20));
        var display = (this.isHovering && !isAnyAdjustableNumberDragging) ? "block" : "none";
        this.helpElement.setStyles({ left:left, top:top, display:display });
    },


    // drag
    
    initializeDrag: function () {
        this.isDragging = false;
        new BVTouchable(this.element, this);
    },
    
    touchDidGoDown: function (touches) {
        this.valueAtMouseDown = this.tangle.getValue(this.variable);
        this.isDragging = true;
        isAnyAdjustableNumberDragging = true;
        this.updateRolloverEffects();
        this.updateStyle();
    },
    
    touchDidMove: function (touches) {
        var value = this.valueAtMouseDown + touches.translation.x / 5 * this.step;
        value = ((value / this.step).round() * this.step).limit(this.min, this.max);
        this.tangle.setValue(this.variable, value);
        this.updateHelp();
    },
    
    touchDidGoUp: function (touches) {
        this.helpElement.setStyle("display", "none");
        this.isDragging = false;
        isAnyAdjustableNumberDragging = false;
        this.updateRolloverEffects();
        this.updateStyle();
    }
};




//----------------------------------------------------------
//
//  formats
//

function formatValueWithPrecision (value,precision) {
    if (Math.abs(value) >= 100) { precision--; }
    if (Math.abs(value) >= 10) { precision--; }
    return "" + value.round(Math.max(precision,0));
}

Tangle.formats.p3 = function (value) {
    return formatValueWithPrecision(value,3);
};

Tangle.formats.neg_p3 = function (value) {
    return formatValueWithPrecision(-value,3);
};

Tangle.formats.p2 = function (value) {
    return formatValueWithPrecision(value,2);
};

Tangle.formats.e6 = function (value) {
    return "" + (value * 1e-6).round();
};

Tangle.formats.abs_e6 = function (value) {
    return "" + (Math.abs(value) * 1e-6).round();
};

Tangle.formats.freq = function (value) {
    if (value < 100) { return "" + value.round(1) + " Hz"; }
    if (value < 1000) { return "" + value.round(0) + " Hz"; }
    return "" + (value / 1000).round(2) + " KHz"; 
};

Tangle.formats.dollars = function (value) {
    return "$" + value.round(0);
};

Tangle.formats.free = function (value) {
    return value ? ("$" + value.round(0)) : "free";
};

Tangle.formats.percent = function (value) {
    return "" + (100 * value).round(0) + "%";
};


    
//----------------------------------------------------------

})();

