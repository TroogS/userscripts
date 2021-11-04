// ==UserScript==
// @name         Foodsharing Planner
// @namespace    http://tampermonkey.net/
// @version      0.2
// @updateURL    https://github.com/TroogS/userscripts/blob/master/foodsharing_planner.user.js
// @downloadURL  https://github.com/TroogS/userscripts/blob/master/foodsharing_planner.user.js
// @description  Generate a calendar like view as addition to the foodsharing website germany, austria and switzerland
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

var token;
var gPickupData;
var gLoaded = false;
var gFirstDayDate;

(function() {
  'use strict';

  CreateButton();

  var mainPanel = CreateElement("div", "fspl d-none");
  document.querySelectorAll("body")[0].append(mainPanel);
})();

GM_addStyle ( `

a.navbar-brand.brand span:first-child,
span.regionName {
  display: none !important;
}

a.navbar-brand.brand span:nth-child(2),
a.navbar-brand.brand span:nth-child(2) span{
  display: inline-block !important;
}

.fspl {
  position: fixed;
  background: #f1e7c9;
  border: 5px solid #533a20;
  border-radius: 10px;
  z-index: 5000;
  height: calc(100vh - 100px);
  width: calc(100vw - 100px);
  left: 50px;
  top: 50px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  overflow-y: auto;
}

.day {
  flex: 1;
  border: 1px solid #533a20;
  height: max-content;
  min-height: 100%;
}

.day .day-title {
  font-weight: bold;
  border-bottom: 1px solid black;
  padding: 5px;
}

.day .pickup {
  border: 1px solid #533a20;
  border-left-width: 5px;
  margin: 5px;
  border-radius: 5px;
  padding: 5px;
}

.day .pickup.pickup-green {
  border-left-color: #64ae24;
}

.day .pickup.pickup-yellow {
  border-left-color: #ffc107
}

.day .pickup.pickup-red {
  border-left-color: #dc3545;
}

.day .pickup .img-container {
  display: flex;
}

.day .pickup .img-container > div {
  padding-right: 5px;
}

.day .pickup .img-container > div img {
  width: 35px;
  height: 35px;
  border-radius: 5px;
}

.day .pickup .img-container .empty-slot {
  width: 34px;
  display: flex;
  height: 34px;
  justify-content: center;
  align-items: center;
  border: 1px solid #533a20;
  text-decoration: none;
  margin-right: 5px;
  border-radius: 5px;
}

.day .pickup .img-container .empty-slot:hover i {
  color: #533a20;
}

` );

async function BuildPlannerAsync() {
    gFirstDayDate = GetFirstDay();
    var mainPanel = document.querySelectorAll(".fspl")[0];

    var mon = CreateColumn(0, "Montag", '<a href="#"><i class="fas fa-arrow-left"/></a> ', null);
    var tue = CreateColumn(1, "Dienstag");
    var wed = CreateColumn(2, "Mittwoch");
    var thu = CreateColumn(3, "Donnerstag");
    var fri = CreateColumn(4, "Freitag");
    var sat = CreateColumn(5, "Samstag");
    var sun = CreateColumn(6, "Sonntag", null, ' <a href="#"><i class="fas fa-arrow-right"/></a>');

    mainPanel.append(mon);
    mainPanel.append(tue);
    mainPanel.append(wed);
    mainPanel.append(thu);
    mainPanel.append(fri);
    mainPanel.append(sat);
    mainPanel.append(sun);

    if(!gLoaded) gPickupData = await LoadPickupsAsync();

    var lastDayDate = GetLastDay(gFirstDayDate);

    gPickupData.sort(function(a, b){return a.pickup.date > b.pickup.date});
    gPickupData.forEach(pickup => {

        if(pickup.pickup.date > gFirstDayDate && pickup.pickup.date < lastDayDate) {
            var pickupDiv = CreatePickupDiv(pickup);

            switch (pickup.pickup.date.getDay()) {
                case 1:
                    mon.append(pickupDiv);
                    break;
                case 2:
                    tue.append(pickupDiv);
                    break;
                case 3:
                    wed.append(pickupDiv);
                    break;
                case 4:
                    thu.append(pickupDiv);
                    break;
                case 5:
                    fri.append(pickupDiv);
                    break;
                case 6:
                    sat.append(pickupDiv);
                    break;
                case 7:
                    sun.append(pickupDiv);
                    break;
            }
        }
    });
}

function GetFirstDay() {
    var curr = new Date();
    var first = curr.getDate() - curr.getDay() + 1;
    var firstDay = new Date(curr.setDate(first));
    firstDay.setHours(0,0,0,0);

    return firstDay;
}

function GetLastDay(firstDayDate) {
    var curr = new Date(firstDayDate);
    var last = curr.getDate() - curr.getDay() + 7;
    var lastDay = new Date(curr.setDate(last));
    lastDay.setHours(23,59,59,999);

    return lastDay;
}

function CreatePickupDiv(data) {
  var elementClass = "pickup";
  if(data.pickup.occupiedSlots.length == data.pickup.totalSlots) elementClass += " pickup-green";
  if(data.pickup.occupiedSlots.length < data.pickup.totalSlots && data.pickup.occupiedSlots.length > 0) elementClass += " pickup-yellow";
  if(data.pickup.occupiedSlots.length == 0) elementClass += " pickup-red";

  var element = CreateElement("div", elementClass);

  var headerSpan = CreateElement("div", "font-weight-bold", data.store.name);
  element.append(headerSpan);

  var hours = (data.pickup.date.getHours() < 10 ? '0' : '') + data.pickup.date.getHours();
  var minutes = (data.pickup.date.getMinutes() < 10 ? '0' : '') + data.pickup.date.getMinutes();
  var timeString = hours + ":" + minutes;
  var timeSpan = CreateElement("div", "", timeString);
  element.append(timeSpan);


  var imgContainer = CreateElement("div", "img-container");

    // Occupies slots
    if(data.pickup.occupiedSlots.length > 0) {

        data.pickup.occupiedSlots.forEach(slot => {
            var imgUrl = 'images/mini_q_' + slot.profile.avatar;
            if(slot.profile.avatar.startsWith('/api/')) imgUrl = slot.profile.avatar + '?w=35&h=35';

            var imgDiv = CreateElement("div");
            imgDiv.innerHTML = '<a href="https://' + window.location.hostname + '/profile/' + slot.profile.id + '" target="_blank"><img title="' + slot.profile.name + '" src="' + imgUrl + '" /></a>';
            imgContainer.append(imgDiv);
        });
    }

    // Free slots
    for (let i = 0; i < data.pickup.freeSlots; i++) {
        var freeSlotA = CreateElement("a", "empty-slot");
        freeSlotA.setAttribute("href", "https://" + window.location.hostname + "/?page=fsbetrieb&id=" + data.store.id);
        freeSlotA.setAttribute("target", "_blank");

        freeSlotA.innerHTML = '<i class="fas fa-question" />';

        imgContainer.append(freeSlotA);
    }

    element.append(imgContainer);


  return element;
}

async function LoadPickupsAsync() {

    let pickupData = new Array();
    var apiStoreData = await ApiGetCallAsync("user/current/stores");

    await asyncForEach(apiStoreData, async (store) => {
        var apiPickups = await ApiGetCallAsync('stores/' + store.id + '/pickups');
        if(apiPickups.pickups.length > 0) {

            apiPickups.pickups.forEach(pickup => {

                pickup.date = new Date(pickup.date);
                pickup.freeSlots = pickup.totalSlots - pickup.occupiedSlots.length;

                var obj = {
                    store: {
                        id: store.id,
                        name: store.name
                    },
                    pickup: pickup
                };

                pickupData.push(obj);
            });
        }
    });

    gLoaded = true;
    return pickupData;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function CreateColumn(num, title, htmlPre, htmlSuf) {
    var titleDiv = CreateElement("div", "day-title text-center", title);
    titleDiv.innerHTML = title;

    if(htmlPre) {
        titleDiv.innerHTML = htmlPre + titleDiv.innerHTML;
    }
    if(htmlSuf) {
        titleDiv.innerHTML = titleDiv.innerHTML + htmlSuf;
    }

    var displayDate = new Date(gFirstDayDate);
    displayDate.setDate(gFirstDayDate.getDate() + num);
    console.log(displayDate);

    titleDiv.innerHTML = titleDiv.innerHTML + "<br />" + GetDatetext(displayDate);

    var day = CreateElement("div", "day day-" + num, titleDiv);

    return day;
}

function GetDatetext(date) {
  return WithLeadingZeros(date.getDate(), 2) + "." + WithLeadingZeros(date.getMonth(), 2) + "." + WithLeadingZeros(date.getYear() + 1900, 4)
}

function WithLeadingZeros(number, length) {

    var stringNumber = number.toString();

    while(stringNumber.length < length) {
        stringNumber = "0" + stringNumber;
    }

    return stringNumber;
}

// Toggle planner visibility. Load data on show
function TogglePlanner() {
  var mainPanel = document.querySelectorAll(".fspl")[0];

  if(mainPanel.classList.contains('d-none')) {
    mainPanel.classList.remove("d-none");
    mainPanel.innerHTML = "";
    BuildPlannerAsync();
  } else {
    mainPanel.classList.add("d-none");
  }
}

// Create calendar button for navigation bar
function CreateButton() {
    var i = CreateElement("i", "fas fa-calendar-alt");
    var a = CreateElement("a", "nav-link", i);
    a.href = "#";
    a.addEventListener('click',function () {TogglePlanner();});

    var li = CreateElement("li", "nav-item", a);
    var div = CreateElement("div", null, li);

    document.querySelectorAll(".navbar-nav.nav-row")[0].append(div);
}

// Create element helper function
function CreateElement(tagName, classList, content) {
  var element = document.createElement(tagName);

  if(classList) element.classList = classList;
  if(content) element.append(content);

  return element;
}

// Api call function
async function ApiGetCallAsync(endpoint) {
  const res = await window.$.ajax({
    url: 'https://' + window.location.hostname + '/api/' + endpoint,
    type: 'GET',
  });

  return res;
}

// Read token from cookie
function ReadToken() {
    var nameEQ = "CSRF_TOKEN=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
