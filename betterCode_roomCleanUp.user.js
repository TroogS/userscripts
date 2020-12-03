// ==UserScript==
// @name         betterCode() Conference Room CleanUp
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @updateURL    https://github.com/TroogS/userscripts/blob/master/betterCode_roomCleanUp.user.js
// @downloadURL  https://github.com/TroogS/userscripts/blob/master/betterCode_roomCleanUp.user.js
// @description  Clean up betterCode() Conference Rooms
// @author       A. Beging
// @match        https://bettercode-net.venueless.events/rooms*
// @match        https://bettercode-net.venueless.events/rooms/*
// @grant GM_setValue
// @grant GM_getValue
// ==/UserScript==

function GM_addStyle (cssStr) {
    var newNode = document.createElement ('style');
    newNode.textContent = cssStr;
    document.head.append(newNode);
}

// Stackoverflow page manipulation
GM_addStyle ( `

.c-rooms-sidebar {
  width: 0;
}

.c-livestream.size-normal {
  width: auto !important;
}


` );

(function() {
  'use strict';
})();
