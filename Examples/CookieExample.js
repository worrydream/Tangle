//
//  CookieExample.js
//  Tangle
//
//  Created by Bret Victor on 6/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//

window.addEvent('domready', function () {

    new Tangle(document.getElementById("cookieExample"), {
        initialize: function () { this.cookies = 4; },
        update: function () { this.calories = this.cookies * 50; },
    });


});
