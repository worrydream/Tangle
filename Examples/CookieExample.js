//
//  CookieExample.js
//  Tangle
//
//  Created by Bret Victor on 6/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//

window.addEvent('domready', function () {

    var model = {
        initialize: function () {
            this.cookies = 3;
            this.caloriesPerCookie = 50;
            this.caloriesPerDay = 2100;
        },
        update: function () {
            this.calories = this.cookies * this.caloriesPerCookie;
            this.dailyPercent = 100 * this.calories / this.caloriesPerDay;
        }
    };
    
    [ "cookieExample", "cookieExample2", "cookieExample3" ].each( function (id) {
        var element = document.getElementById(id);
        if (element) { new Tangle(element,model); }
    });

});
