// ==UserScript==
// @name         Foodsharing CleanUp
// @namespace    http://tampermonkey.net/
// @version      0.1
// @updateURL    https://github.com/TroogS/userscripts/raw/master/foodsharing_cleanup.user.js
// @downloadURL  https://github.com/TroogS/userscripts/raw/master/foodsharing_cleanup.user.js
// @description  Clean up the foodsharing websites germany, austria and switzerland
// @author       A. Beging
// @match        https://foodsharing.de*
// @match        https://foodsharing.de/*
// @match        https://foodsharing.at*
// @match        https://foodsharing.at/*
// @match        https://foodsharingschweiz.ch*
// @match        https://foodsharingschweiz.ch/*
// @match        https://foodsharing.network*
// @match        https://foodsharing.network/*
// @grant        none
// ==/UserScript==

function GM_addStyle (cssStr) {
    var newNode = document.createElement ('style');
    newNode.textContent = cssStr;
    document.head.append(newNode);
}

GM_addStyle ( `

a.navbar-brand.brand span:first-child,
span.regionName,
.broadcast-message,
.bread {
  display: none !important;
}

#content_top a,
#content_top h3,
#content_top img {
  display: none;
}

#topbar-navright li:nth-child(1),
#topbar-navright li:nth-child(2),
#topbar-navright li:nth-child(3) {
  display: none;
}

a.navbar-brand.brand span:nth-child(2),
a.navbar-brand.brand span:nth-child(2) span{
  display: inline-block !important;
}

` );

(function() {
  'use strict';

    if(window.location.search.startsWith("?page=fsbetrieb")) CleanUpBetrieb();

})();

function CleanUpBetrieb() {

    GM_addStyle ( `



    ` );

    document.querySelectorAll(".inside").forEach(element => {
        console.log(element);
        var header = window.$(element).find(".head");
        if(header.length > 0 && header[0].innerHTML == "Optionen") {
            window.$(element).find("h3")[0].remove();
            window.$(element).find("div")[0].remove();
            console.log(element);
        }
    });
}

function FindPanel(title) {
    document.querySelectorAll(".inside .field").forEach(element => {
        console.log(element);

        var header = window.$(element).find(".head")[0].innerHTML;
        if(header == title) {
            return element;

        }
    });

    return null;
}
