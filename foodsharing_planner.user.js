// ==UserScript==
// @name         Foodsharing Planner
// @namespace    http://tampermonkey.net/
// @version      0.5
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

var userId;
var token;
var gPickupData;
var gLoaded = false;
var gFirstDayDate;

(async function() {
  'use strict';

  // Load Token
  token = ReadToken();
  if(!token) return;

  // Load user
  var meResult = await LoadMe();
  if(!meResult) return;

  CreateButton();
  gFirstDayDate = GetFirstDay();
  var weekPanel = CreateElement("div", "week");
  var mainPanel = CreateElement("div", "fspl d-none", weekPanel);
  CreateNavigationButtons(mainPanel);

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
  display: flex;
  flex-direction: column;
  top: 50px;
}

.fspl .week {
  height: 100%;
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
  border-left-color: #64ae2457;
}

.day .pickup.pickup-red {
  border-left-color: #dc3545;
}

.day .pickup .img-container {
  display: grid;
  grid-template-columns: min-content min-content;
  gap: 5px;
}

.day .pickup .img-container div.not-confirmed {
  opacity: .33;
}

.day .pickup .img-container div.not-confirmed img {
  border-inline: 1px solid red;
}

.day .pickup .img-container > div,
.day .pickup .img-container .empty-slot{
  width: 35px;
  height: 35px;
}

.day .pickup .img-container > div img {
  border-radius: 5px;
  border: 1px solid transparent;
}

.day .pickup .img-container .empty-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #533a20;
  text-decoration: none;
  border-radius: 5px;
}

.day .pickup .img-container .empty-slot:hover i {
  color: #533a20;
}

` );

async function LoadMe() {
    var apiUserData = await ApiGetCallAsync("user/current");
    userId = apiUserData.id;
    return apiUserData;
}

async function BuildPlannerAsync() {
    var weekPanel = document.querySelectorAll(".fspl .week")[0];
    weekPanel.innerHTML = "";

    var mon = CreateColumn(0, "Montag");
    var tue = CreateColumn(1, "Dienstag");
    var wed = CreateColumn(2, "Mittwoch");
    var thu = CreateColumn(3, "Donnerstag");
    var fri = CreateColumn(4, "Freitag");
    var sat = CreateColumn(5, "Samstag");
    var sun = CreateColumn(6, "Sonntag");

    weekPanel.append(mon);
    weekPanel.append(tue);
    weekPanel.append(wed);
    weekPanel.append(thu);
    weekPanel.append(fri);
    weekPanel.append(sat);
    weekPanel.append(sun);

    if(!gLoaded) gPickupData = await LoadPickupsAsync();

    var lastDayDate = GetLastDay(gFirstDayDate);

    gPickupData.sort(function(a, b){return a.pickup.dateObj > b.pickup.dateObj});
    gPickupData.forEach(pickup => {

        if(pickup.pickup.dateObj > gFirstDayDate && pickup.pickup.dateObj < lastDayDate) {
            var pickupDiv = CreatePickupDiv(pickup);

            switch (pickup.pickup.dateObj.getDay()) {
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

function CreateNavigationButtons(mainPanel) {
    var navigationPanel = CreateElement("div", "fspl-nav text-center");

    var prevButton = CreateElement("button", "button m-1");
    prevButton.innerHTML = '<i class="fas fa-arrow-left" />';
    prevButton.addEventListener('click',function () {
        gFirstDayDate.setDate(gFirstDayDate.getDate() - 7);
        BuildPlannerAsync();
    });
    navigationPanel.append(prevButton);

    var nextButton = CreateElement("button", "button m-1");
    nextButton.innerHTML = '<i class="fas fa-arrow-right" />';
    nextButton.addEventListener('click',function () {
        gFirstDayDate.setDate(gFirstDayDate.getDate() + 7);
        BuildPlannerAsync();
    });
    navigationPanel.append(nextButton);

    mainPanel.prepend(navigationPanel);
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

  var hours = (data.pickup.dateObj.getHours() < 10 ? '0' : '') + data.pickup.dateObj.getHours();
  var minutes = (data.pickup.dateObj.getMinutes() < 10 ? '0' : '') + data.pickup.dateObj.getMinutes();
  var timeString = hours + ":" + minutes;
  var timeSpan = CreateElement("div", "", timeString);
  element.append(timeSpan);


  var imgContainer = CreateElement("div", "img-container");

    // Occupies slots
    if(data.pickup.occupiedSlots.length > 0) {

        data.pickup.occupiedSlots.forEach(slot => {
            var imgUrl = 'https://' + window.location.hostname + '/images/mini_q_' + slot.profile.avatar;
            if(slot.profile.avatar.startsWith('/api/')) imgUrl = slot.profile.avatar + '?w=35&h=35';

            var imgClass = "";
            if(!slot.isConfirmed) imgClass = "not-confirmed";
            var imgDiv = CreateElement("div", imgClass);
            imgDiv.innerHTML = '<a href="https://' + window.location.hostname + '/profile/' + slot.profile.id + '" target="_blank"><img title="' + slot.profile.name + '" src="' + imgUrl + '" /></a>';
            imgContainer.append(imgDiv);
        });
    }

    // Free slots
    for (let i = 0; i < data.pickup.freeSlots; i++) {
        var freeSlotA = CreateElement("a", "empty-slot");
        freeSlotA.setAttribute("href", "#");
        freeSlotA.addEventListener('click', function () {
            BookPickup(data);
        });

        freeSlotA.innerHTML = '<i class="fas fa-question" />';

        imgContainer.append(freeSlotA);
    }

    element.append(imgContainer);


  return element;
}

async function BookPickup(data) {

    var dateText = GetDateText(data.pickup.dateObj);
    var timeText = GetTimeText(data.pickup.dateObj);

    var confResult = confirm("Bitte bestätigen!\nAbholung " + dateText + " - " + timeText + " bei " + data.store.name + " buchen?");

    if(confResult) {
        var endpoint = "stores/" + data.store.id + "/pickups/" + data.pickup.dateObj.toISOString() + "/" + userId;
        var result = await ApiPostCallAsync(endpoint);

        // Invalidate and reload
        gLoaded = false;
        BuildPlannerAsync();
    }


}

async function LoadPickupsAsync() {

    let pickupData = new Array();
    var apiStoreData = await ApiGetCallAsync("user/current/stores");

    await asyncForEach(apiStoreData, async (store) => {
        var apiPickups = await ApiGetCallAsync('stores/' + store.id + '/pickups');
        if(apiPickups.pickups.length > 0) {

            apiPickups.pickups.forEach(pickup => {

                pickup.dateObj = new Date(pickup.date);
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

function CreateColumn(num, title) {
    var titleDiv = CreateElement("div", "day-title text-center", title);
    titleDiv.innerHTML = title;

    var displayDate = new Date(gFirstDayDate);
    displayDate.setDate(gFirstDayDate.getDate() + num);

    titleDiv.innerHTML = titleDiv.innerHTML + "<br />" + GetDateText(displayDate);

    var day = CreateElement("div", "day day-" + num, titleDiv);

    return day;
}

function GetTimeText(date) {
  return WithLeadingZeros(date.getHours(), 2) + ":" + WithLeadingZeros(date.getMinutes(), 2);
}

function GetDateText(date) {
  return WithLeadingZeros(date.getDate(), 2) + "." + WithLeadingZeros(date.getMonth(), 2) + "." + WithLeadingZeros(date.getFullYear(), 4)
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

// Api get call function
async function ApiGetCallAsync(endpoint) {

    try {
        const res = await window.$.ajax({
            url: 'https://' + window.location.hostname + '/api/' + endpoint,
            type: 'GET',
            headers: {
                "accept": "*/*",
                "X-CSRF-Token": token,
            },
        });

        return res;
    }
    catch (e) {
        return false;
    }
}

// Api patch call function
async function ApiPatchCallAsync(endpoint, data) {
    const res = await window.$.ajax({
        url: 'https://' + window.location.hostname + '/api/' + endpoint,
        type: 'PATCH',
        contentType: "application/json; charset=utf-8",
        headers: {
            "accept": "*/*",
            "X-CSRF-Token": token,
        },
        data : JSON.stringify(data),
        //data: {name:'yogesh',salary: 35000,email: 'yogesh@makitweb.com'},
        success: function(response){

        }
    });

    return res;
}

// Api post call function
async function ApiPostCallAsync(endpoint, data) {
    const res = await window.$.ajax({
        url: 'https://' + window.location.hostname + '/api/' + endpoint,
        type: 'POST',
        contentType: "application/json; charset=utf-8",
        headers: {
            "accept": "*/*",
            "X-CSRF-Token": token,
        },
        data : JSON.stringify(data),
        success: function(response){

        }
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
