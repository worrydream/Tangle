//
//  FilterExample.js
//  Tangle
//
//  Created by Bret Victor on 3/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function () {


window.addEvent('domready', function () {

    var container = document.getElementById("filterExample");
    var tangle = new Tangle(container, {

        initialize: function () {
            this.fs = 44100;  this.index = 1;
            this.fc1 = 2000;  this.q1 = 0.8;
            this.fc2 = 1200;  this.q2 = 3.5;
        },
        
        update: function () {
            var i = this.index;
            var fc = this['fc' + i];
            var q  = this['q' + i];
            
            // filter coefficients

            this.kf = 2 * Math.sin(Math.PI * fc / this.fs);
            this.kq = 1 / q;

            // transfer function coefficients

            this.b0 = this.kf * this.kf;
            this.a1 = -2 + this.kf * (this.kf + this.kq);
            this.a1neg = -this.a1;
            this.a2 = 1 - (this.kf * this.kq);

            // solve for poles in terms of z^-1
            
            var a1 = this.a1;
            var a2 = this.a2;
        
            var root1Real, root1Imag, root2Real, root2Imag;
            var real = -a1 / (2 * a2);
            var disc = a1*a1 - 4*a2;
        
            if (a2 == 0) {
                root1Real = root2Real = -1 / a1;
                root1Imag = root2Imag = 0;
            }
            else if (disc < 0) {
                root1Real = root2Real = real;
                root1Imag = Math.sqrt(-disc) / (2 * a2);
                root2Imag = -root1Imag;
            }
            else {
                root1Real = real + Math.sqrt(disc) / (2 * a2);
                root2Real = real - Math.sqrt(disc) / (2 * a2);
                root1Imag = root2Imag = 0;
            }
            
            // take recipricol to get z
            
            this.pole1Real =  root1Real / (root1Real * root1Real + root1Imag * root1Imag);
            this.pole1Imag = -root1Imag / (root1Real * root1Real + root1Imag * root1Imag);
            this.pole2Real =  root2Real / (root2Real * root2Real + root2Imag * root2Imag);
            this.pole2Imag = -root2Imag / (root2Real * root2Real + root2Imag * root2Imag);

            // stable
            
            this.pole1Inside = (this.pole1Real * this.pole1Real + this.pole1Imag * this.pole1Imag) < 1;
            this.pole2Inside = (this.pole2Real * this.pole2Real + this.pole2Imag * this.pole2Imag) < 1;
            this.unstable = !this.pole1Inside || !this.pole2Inside;

            // update indexed variables

            this['kf' + i] = this.kf;
            this['kq' + i] = this.kq;
            this['unstable' + i] = this.unstable;
        },
    });
    
    tangle.setValue("index", 2);  // initialize both kf1 and kf2, etc.
});



//----------------------------------------------------------
//
//  Two-pole no-zero lowpass with (mostly) independent Fc and Q
//  controls.  Efficient implementation, but can be unstable at
//  higher frequencies.
// 
//  A simplified digital adaptation of the analog state variable
//  filter, described in Hal Chamberlin's "Musical Applications
//  of Microprocessors."
// 
//                         Kf^2 * z^-1
//    H(z) = --------------------------------------------
//           1 - (2 - Kf*(Kf+Kq))*z^-1 + (1 - Kf*Kq)*z^-2
// 
//    Kq = 1/Q   (Q > 0.5)
// 
//    Kf = 2 * sin(pi*Fc/Fs)  (Approximately.  It becomes exact
//                             as Q approaches infinity.)
// 
//    Kf is approximately 2*pi * Fc/Fs for smallish Fc.
//
//    Topology:                 [bp]               [lp]
//
//    in --->(+)--(kf)--->(+)----.---(kf)--(+)--->[z^-1]---> out
//            ^            ^     v          ^        |
//           (+)<--(-kq)---'--[z^-1]        '--------|
//            ^                                      |
//            '----(-1)------------------------------'

function chamberlinResponse (kf,kq,N,x) {
    if (!N) { N = 512; }
    
    var output = [];
    var lp = 0, bp = 0, input = 1;
    
    for (var i = 0; i < N; i++) {
        bp += kf * (input - lp - kq*bp);
        lp += kf * bp;
        output[i] = lp;
        input = x;
    }

    return output;
}

function chamberlinImpulseResponse (kf,kq,N) {
    return chamberlinResponse(kf,kq,N,0);
}

function chamberlinStepResponse (kf,kq,N) {
    return chamberlinResponse(kf,kq,N,1);
}



//----------------------------------------------------------
//
//  FilterKnob
//

Tangle.classes.FilterKnob = {

    initialize: function (el, options, tangle, xParameter, yParameter) {
        var index = xParameter.substr(xParameter.length - 1);
        var xBounds = { min:20, max:20000 };
        var yBounds = { min:0.01, max:10 };
    
    
        // log-scaled Q
        
        var qLogScaleBase = 24;
        
        function getQForY (y) {
            return (yBounds.max - yBounds.min) * (Math.pow(qLogScaleBase, -y/canvasHeight) - 1/qLogScaleBase) + yBounds.min;
        }
        
        function getYForQ (q) {
            return -canvasHeight * Math.log((q - yBounds.min) / (yBounds.max - yBounds.min) + 1/qLogScaleBase) / Math.log(qLogScaleBase)
        }
        
    
        // view
        
        el.setStyles({position:"absolute", left:0, top:0});
        
        var canvasEl = el.getParent().getElement("canvas");
        var canvasWidth = canvasEl.get("width");
        var canvasHeight = canvasEl.get("height");
        
        var lineStyle = "position:absolute; display:block; border-left:1px dotted #00f; pointer-events:none; width:1px; height:" + canvasHeight + "px;";
        var lineEl = new Element("div", { style:lineStyle });
        el.grab(lineEl, "bottom");
        
        var knobStyle = "position:absolute; display:none; ";
        var knobWidth = 36, knobHeight = 36;
        var knobEl = new Element("img", { style:knobStyle, src:"Images/FilterParamsKnob.png", width:knobWidth, height:knobHeight });
        el.grab(knobEl, "bottom");
    
        var helpEl = new Element("div", { "class": "FilterKnobHelp" });
        helpEl.set("text", "drag");
        el.grab(helpEl, "bottom");
        
        var knobX, knobY;
        
        this.update = function (el, xValue, yValue) {
            var freq = xValue / tangle.getValue("fs");
            knobX = Math.round(Tangle.classes.FilterFreqPlot.getXForNormalizedFrequency(freq, canvasWidth));
            knobY = Math.round(getYForQ(yValue));
            knobEl.setStyles( { left:knobX - knobWidth/2, top:knobY - knobHeight/2 } );
            lineEl.setStyles( { left:knobX });
            helpEl.setStyles( { left:knobX - knobWidth/2 - 22, top:knobY - knobHeight/2 + 8 } );
        };
        
    
        // rollover effects
        
        var isShowing = false;
        var isHovering = false;
    
        canvasEl.addEvent("mouseenter", function () { isShowing = true;   updateRolloverEffects(); });
        canvasEl.addEvent("mouseleave", function () { isShowing = false;  updateRolloverEffects(); });
        knobEl.addEvent("mouseenter", function () { isHovering = true;   updateRolloverEffects(); });
        knobEl.addEvent("mouseleave", function () { isHovering = false;  updateRolloverEffects(); });
        
        function updateRolloverEffects () {
            updateCursor();
            var isShowingKnob = (isShowing || isHovering || isDragging);
            knobEl.setStyle("display", isShowingKnob ? "block" : "none");
            helpEl.setStyle("display", (isShowingKnob && !didDrag) ? "block" : "none");
        }
        
        function updateCursor () {
            var body = document.getElement("body");
            if (isHovering || isDragging) { body.addClass("cursorDrag"); }
            else { body.removeClass("cursorDrag"); }
        }
    
        function updateDynamicLabelsShowing () {
            tangle.element.getElements(".showOnDrag").each( function (hideEl) {
                hideEl.setStyle("display", isDragging ? "block" : "none");
            });
            tangle.element.getElement(".filterSidebar").setStyle("display", isDragging ? "none" : "block");
        }
        
        
        // drag
    
        var isDragging = false;
        var didDrag = false;
        var knobXAtMouseDown, knobYAtMouseDown;
        
        new BVTouchable(knobEl, {
    
            touchDidGoDown: function (touches) {
                knobXAtMouseDown = knobX;
                knobYAtMouseDown = knobY;
                isDragging = true;
                didDrag = true;
                knobEl.set("src", "Images/FilterParamsKnobDrag.png");
                updateRolloverEffects();
                updateDynamicLabelsShowing();
                tangle.setValue("index", index);
            },
            
            touchDidMove: function (touches) {
                var obj = { };
    
                var newX = knobXAtMouseDown + touches.translation.x;
                var fc = Tangle.classes.FilterFreqPlot.getNormalizedFrequencyForX(newX, canvasWidth) * tangle.getValue("fs");
                obj[xParameter] = fc.limit(xBounds.min, xBounds.max);
    
                var newY = knobYAtMouseDown - touches.translation.y;
                var q = getQForY(newY);
                obj[yParameter] = q.limit(yBounds.min, yBounds.max);
    
                tangle.setValues(obj);
            },
            
            touchDidGoUp: function (touches) {
                isDragging = false;
                knobEl.set("src", "Images/FilterParamsKnob.png");
                helpEl.setStyle("display", "none");
                updateRolloverEffects();
                updateDynamicLabelsShowing();
            }
        });
    }
};



//----------------------------------------------------------
//
//  FilterFreqPlot
//

Tangle.classes.FilterFreqPlot = {

    initialize: function (el, options, tangle) {
        this.tangle = tangle;
    },

    update: function (el, kf, kq) {
        var canvasWidth = el.get("width");
        var canvasHeight = el.get("height");
        var ctx = el.getContext("2d");
        
        var fs = this.tangle.getValue("fs");
        var unstable = this.tangle.getValue("unstable");
    
        var N = 2048;
        var impulseResponse = chamberlinImpulseResponse(kf,kq,N);
    
        var fft = new RFFT(N, fs);
        fft.forward(impulseResponse);
        var values = fft.spectrum;
    
        var maxValue = 0;
        for (var i = 0; i < N; i++) { maxValue = Math.max(maxValue, values[i]); }
        maxValue = values[0];
    
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
        ctx.fillStyle = unstable ? "#f00" : "#555";
        for (var x = 0; x < canvasWidth; x++) {
            var base = 100;
            
            var i = N * this.getNormalizedFrequencyForX(x, canvasWidth);  // log-scale x
            var fracI = i - Math.floor(i);
            var lowV = values[Math.floor(i)];
            var highV = values[Math.ceil(i)];
    
            var value = lowV + fracI * (highV - lowV);
            var y = (value > 0) ? Math.max(0, canvasHeight/2 + 32*Math.log(value/maxValue)) : 0;  // log-scale y
            ctx.fillRect(x, canvasHeight - y, 1, y);
        }
    },
    
    getFrequencyLogScaleBase: function () { return 100; },
    
    getNormalizedFrequencyForX: function (x, canvasWidth) {
        var base = this.getFrequencyLogScaleBase();
        return 0.5 * (Math.pow(base, x/canvasWidth - 1) - 1/base);
    },

    getXForNormalizedFrequency: function (freq, canvasWidth) {
        var base = this.getFrequencyLogScaleBase();
        return ((Math.log((freq * 2) + 1/base) / Math.log(base)) + 1) * canvasWidth;
    }
};



//----------------------------------------------------------
//
//  FilterTimePlot
//

Tangle.classes.FilterTimePlot = {
    
    initialize: function (el, options, tangle) {
        this.tangle = tangle;
    },

    update: function (el, kf, kq) {
        var canvasWidth = el.get("width");
        var canvasHeight = el.get("height");
        var ctx = el.getContext("2d");
        
        var fs = this.tangle.getValue("fs");
        var unstable = this.tangle.getValue("unstable");
        var widthBeforeStep = this.getWidthBeforeStep();
    
        var N = 256;
        var values = chamberlinStepResponse(kf,kq,N);
    
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
        ctx.strokeStyle = unstable ? "#f00" : "#00f";
        ctx.lineWidth = 2;
        ctx.beginPath();
    
        ctx.moveTo(0, canvasHeight-1);
        ctx.lineTo(widthBeforeStep, canvasHeight-1);
    
        for (var x = widthBeforeStep; x < canvasWidth; x++) {
            var i = x - widthBeforeStep;
            var fracI = i - Math.floor(i);
            var lowV = values[Math.floor(i)];
            var highV = values[Math.ceil(i)];
            var value = lowV + fracI * (highV - lowV);
            var y = value * canvasHeight/2;
            ctx.lineTo(x, canvasHeight - y);
        }
        
        ctx.stroke();
    },
    
    getWidthBeforeStep: function () { return 16; }
};


//----------------------------------------------------------
//
//  FilterStepPlot
//

Tangle.classes.FilterStepPlot = {

    initialize: function (el) {
        var canvasWidth = el.get("width");
        var canvasHeight = el.get("height");
        var ctx = el.getContext("2d");
        var widthBeforeStep = Tangle.classes.FilterTimePlot.getWidthBeforeStep();
    
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
        ctx.strokeStyle = "#00f";
        ctx.lineWidth = 2;
        ctx.beginPath();
    
        ctx.moveTo(0,canvasHeight-1);
        ctx.lineTo(widthBeforeStep,canvasHeight-1);
        ctx.lineTo(widthBeforeStep,canvasHeight/2);
        ctx.lineTo(canvasWidth,canvasHeight/2);
        ctx.stroke();
    }
};


//----------------------------------------------------------
//
//  FilterPolePlot
//

Tangle.classes.FilterPolePlot = {

    initialize: function (el, options, tangle) {
        this.tangle = tangle;
    },

    update: function (el, pole1Real, pole1Imag, pole2Real, pole2Imag) {
        var pole1Inside = this.tangle.getValue("pole1Inside");
        var pole2Inside = this.tangle.getValue("pole2Inside");

        var canvasWidth = el.get("width");
        var canvasHeight = el.get("height");
        var ctx = el.getContext("2d");
        var unitRadius = canvasWidth * 1/4;
    
        // draw arena
    
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.fillStyle = "#f4f4f4";
        ctx.beginPath();
        ctx.arc(canvasWidth/2, canvasHeight/2, unitRadius, 0, Math.PI * 2, false);
        ctx.fill();
    
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvasWidth/2 - unitRadius, canvasHeight/2);
        ctx.lineTo(canvasWidth/2 + unitRadius, canvasHeight/2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvasWidth/2, canvasHeight/2 - unitRadius);
        ctx.lineTo(canvasWidth/2, canvasHeight/2 + unitRadius);
        ctx.stroke();
    
        // draw poles
        
        ctx.strokeStyle = pole1Inside ? "#00f" : "#f00";
        drawCrossAtPoint(canvasWidth/2 + unitRadius * pole1Real,
                         canvasHeight/2 + unitRadius * pole1Imag);
    
        ctx.strokeStyle = pole2Inside ? "#00f" : "#f00";
        drawCrossAtPoint(canvasWidth/2 + unitRadius * pole2Real, 
                         canvasHeight/2 + unitRadius * pole2Imag);
        
        function drawCrossAtPoint(x,y) {
            var crossRadius = 3;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - crossRadius, y - crossRadius);
            ctx.lineTo(x + crossRadius, y + crossRadius);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - crossRadius, y + crossRadius);
            ctx.lineTo(x + crossRadius, y - crossRadius);
            ctx.stroke();
        }
    }
    
};


})();

