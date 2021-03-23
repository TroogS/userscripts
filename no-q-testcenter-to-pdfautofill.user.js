// ==UserScript==
// @name         No-Q PdfAutofill DRK
// @description  Kopieren der Testdaten aus dem No-Q System in den PdfAutofiller. Erstellt für den OV Dreis-Tiefenbach
// @namespace    http://tampermonkey.net/
// @version      0.1
// @updateURL    https://github.com/TroogS/userscripts/blob/master/no-q-testcenter-to-pdfautofill.user.js
// @downloadURL  https://github.com/TroogS/userscripts/blob/master/no-q-testcenter-to-pdfautofill.user.js
// @author       Andre Beging
// @match        https://app.no-q.info/de/locations/*/checkins/reservations*
// @icon         https://www.google.com/s2/favicons?domain=no-q.info
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    var e = document.getElementsByTagName("body")[0];

    var observer = new MutationObserver(function (event) {
        if(event[0].target.className == "modal-open") {
            CreateButton();
        }
    });



    observer.observe(e, {
        attributes: true,
        attributeFilter: ['class'],
        childList: false,
        characterData: false
    });
})();

function CreateButton() {
    var contentDiv = $(".modal-body[id^=participant]");
    $(contentDiv).append("<button class=\"btn btn-outline-primary\" id=\"copydatabutton\">DATEN KOPIEREN</button>");
    document.getElementById("copydatabutton").addEventListener("click", CopyAction, false);
}

function CopyAction (zEvent) {
  var contentDiv = $(".modal-body[id^=participant] div.row div");
  var name = $(contentDiv).find("h3")[0].innerText;
  var age = $(contentDiv).find("div")[0].innerText;
  var street = $(contentDiv).find("div")[3].innerText;
  var city = $(contentDiv).find("div")[4].innerText;

  var dateTimeDiv = $(contentDiv).find("div")[5];
  var date = $(dateTimeDiv).find("div")[0].innerText;
  var time = $(dateTimeDiv).find("div")[1].innerText;
  var dateTime = date + ", " + time;
  var address = street + ", " + city;

  var output = "<?xml version=\"1.0\" encoding=\"utf-16\"?>";
  output += "<ArrayOfFillValueDefinition xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\">";
  output += BuildXmlTagTextBox("Text3", name);
  output += BuildXmlTagTextBox("Text4", address);
  output += BuildXmlTagTextBox("Text5", age);
  output += BuildXmlTagTextBox("Text8", dateTime);
  output += "</ArrayOfFillValueDefinition>";

  output = output.replace("ß", "ss");
  output = output.replace("ä", "ae");
  output = output.replace("ö", "oe");
  output = output.replace("ü", "ue");


  GM_setClipboard(output);
  alert("Autofill-Daten wurden in die Zwischenablage kopiert.\nBitte im PdfAutofiller EINFÜGEN klicken!");
}

function BuildXmlTagTextBox(key, value) {
  var output = "";
  output += "<FillValueDefinition>";
  output += "<Key>" + key + "</Key>";
  output += "<Value xsi:type=\"xsd:string\">" + value + "</Value>";
  output += "<Type>PdfTextBoxFieldWidget</Type>";
  output += "</FillValueDefinition>";
  return output;
}
