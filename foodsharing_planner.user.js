// ==UserScript==
// @name         Foodsharing Planner
// @namespace    http://tampermonkey.net/
// @version      0.9
// @updateURL    https://github.com/TroogS/userscripts/raw/master/foodsharing_planner.user.js
// @downloadURL  https://github.com/TroogS/userscripts/raw/master/foodsharing_planner.user.js
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

class Api {

    static PickupData;
    static Token;
    static User;

    static async BookPickup(data) {

        var dateText = Convenience.GetDateText(data.pickup.dateObj);
        var timeText = Convenience.GetTimeText(data.pickup.dateObj);

        var confResult = confirm("Bitte bestätigen!\nAbholung " + dateText + " - " + timeText + " bei " + data.store.name + " buchen?");

        if(confResult) {
            var endpoint = "stores/" + data.store.id + "/pickups/" + data.pickup.dateObj.toISOString() + "/" + this.User.id;
            var result = await this.PostAsync(endpoint);

            // Invalidate and reload
            DataStore.Loaded = false;
            BuildPlannerAsync();
        }
    }

    // Api get call function
    static async GetAsync(endpoint) {

        try {
            const res = await window.$.ajax({
                url: 'https://' + window.location.hostname + '/api/' + endpoint,
                type: 'GET',
                headers: {
                    "accept": "*/*",
                    "X-CSRF-Token": this.Token,
                },
            });

            return res;
        }
        catch (e) {
            return false;
        }
    }

    // Api patch call function
    static async PatchAsync(endpoint, data) {
        const res = await window.$.ajax({
            url: 'https://' + window.location.hostname + '/api/' + endpoint,
            type: 'PATCH',
            contentType: "application/json; charset=utf-8",
            headers: {
                "accept": "*/*",
                "X-CSRF-Token": this.Token,
            },
            data : JSON.stringify(data),
            //data: {name:'yogesh',salary: 35000,email: 'yogesh@makitweb.com'},
            success: function(response){

            }
        });

        return res;
    }

    // Api post call function
    static async PostAsync(endpoint, data) {
        try {
            const res = await window.$.ajax({
                url: 'https://' + window.location.hostname + '/api/' + endpoint,
                type: 'POST',
                contentType: "application/json; charset=utf-8",
                headers: {
                    "accept": "*/*",
                    "X-CSRF-Token": this.Token,
                },
                data : JSON.stringify(data)
            });

            return res;
        }
        catch (e) {
          return false;
        }
    }

    static async LoadMe() {
        this.User = await this.GetAsync("user/current");
    }

    // Load and prepare pickup data from api
    static async LoadPickupsAsync() {

        let pickupData = new Array();
        var apiStoreData = await this.GetAsync("user/current/stores");

        await Convenience.AsyncForEach(apiStoreData, async (store) => {
            var apiPickups = await this.GetAsync('stores/' + store.id + '/pickups');
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

        DataStore.Loaded = true;

        return pickupData;
    }

    // Read token from cookie
    static ReadToken() {
        var nameEQ = "CSRF_TOKEN=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                this.Token = c.substring(nameEQ.length, c.length);
                return this.Token;
            }
        }

        this.Token = null;
        return null;
    }

}

class Convenience {

    static async AsyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    // Get the first day of the current week (monday)
    static GetFirstDay() {
        var curr = new Date();
        var first = curr.getDate() - curr.getDay() + 1;
        var firstDay = new Date(curr.setDate(first));
        firstDay.setHours(0,0,0,0);

        return firstDay;
    }

    // Get the last day of the given dates week (sunday)
    static GetLastDay(firstDayDate) {
        var curr = new Date(firstDayDate);
        var last = curr.getDate() - curr.getDay() + 7;
        var lastDay = new Date(curr.setDate(last));
        lastDay.setHours(23,59,59,999);

        return lastDay;
    }

    static GetDateText(date) {
        return Convenience.WithLeadingZeros(date.getDate(), 2) + "."
            + Convenience.WithLeadingZeros(date.getMonth() + 1, 2) + "."
            + Convenience.WithLeadingZeros(date.getFullYear(), 4)
    }

    static GetTimeText(date) {
        return Convenience.WithLeadingZeros(date.getHours(), 2) + ":"
            + Convenience.WithLeadingZeros(date.getMinutes(), 2);
    }

    static IsToday(date) {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    static ShowLoadingOverlay() {
        var loadingOverlay = document.querySelectorAll(".fspl .loading-overlay")[0];
        if(loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    static HideLoadingOverlay() {
        var loadingOverlay = document.querySelectorAll(".fspl .loading-overlay")[0];
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    static WithLeadingZeros(number, length) {
        var stringNumber = number.toString();
        while(stringNumber.length < length) {
            stringNumber = "0" + stringNumber;
        }
        return stringNumber;
    }

}

class StyleHelper {

    static ApplyStyle() {
        this.CreateStyleTag(this.Style);
    }

    static CreateStyleTag(cssContent) {
        var newNode = document.createElement ('style');
        newNode.textContent = cssContent;
        document.head.append(newNode);
    }

    static Style = `
:root {
  --fs-red: #dc3545;
  --fs-yellow: #ffc107;
}

.fspl {
  position: fixed;
  color: var(--fs-brown);
  background-color: var(--fs-beige);
  border: 5px solid var(--fs-brown);
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

.fspl .loading-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
}

.fspl .loading-overlay.hidden {
  display: none;
}

.fspl .loading-overlay > div {
  font-size: 2rem;
}

.fspl .loading-overlay i {
  animation: rotation 2s linear infinite;
}

.day {
  flex: 1;
  border: 1px solid var(--fs-brown);
  height: max-content;
  height: 100%;
}

.day.today {
  background-color: #ffeeba;
}

.day .day-title {
  font-weight: bold;
  border-bottom: 1px solid black;
  padding: 5px;
}

.day .pickup {
  border: 0px solid transparent;
  border-left-width: 5px;
  outline: 1px solid var(--fs-brown);
  background-color: var(--fs-white);
  margin: 5px;
  border-radius: 5px;
  padding: 5px;
}

.day .pickup.me {
  background-color: #d8ffbe;
}

.day .pickup > a {
  color: var(--fs-brown);
}

.day .pickup.pickup-green {
  border-left-color: var(--fs-green);;
}

.day .pickup.pickup-yellow {
  border-left-color: #64ae2466;
}

.day .pickup.pickup-red {
  border-left-color: var(--fs-red);
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

.button-red {
  background-color: var(--fs-red);
}

.button-red:hover {
  background-color: #ff6977;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}

    `;

}

class DataStore {
    static Loaded = false;
    static FirstDay;
}

class DOMHelper {
    // Create generic element
    static CreateElement(tagName, classList, content) {
        var element = document.createElement(tagName);

        if(classList) element.classList = classList;
        if(content) element.append(content);

        return element;
    }

    // Create calendar button for navigation bar
    static CreatePlannerButton() {
        var i = this.CreateElement("i", "fas fa-calendar-alt");
        var a = this.CreateElement("a", "nav-link", i);
        a.href = "#";
        a.addEventListener('click',function () {TogglePlanner();});

        var li = this.CreateElement("li", "nav-item", a);
        var div = this.CreateElement("div", null, li);

        document.querySelectorAll(".navbar-nav.nav-row")[0].append(div);
    }

    static CreateNavigationButton(parentElement, title, iconClass, callback) {

        var buttonElement = this.CreateElement("button", "button m-1");
        buttonElement.setAttribute("title", title);
        buttonElement.innerHTML = '<i class="' + iconClass + '" />';
        buttonElement.addEventListener('click',function () {
            callback();
        });

        parentElement.append(buttonElement);
        return buttonElement;
    }

    static CreateLoadingOverlay(parentElement) {
        var loadingOverlay = this.CreateElement("div", "loading-overlay hidden");

        var spinnerDiv = this.CreateElement("div");
        spinnerDiv.innerHTML = '<i class="fas fa-pizza-slice" />';
        spinnerDiv.innerHTML += "&nbsp;Lade...";

        loadingOverlay.append(spinnerDiv);

        parentElement.append(loadingOverlay);
    }

    static SetupMainPanel() {
        var weekPanel = this.CreateElement("div", "week");
        var mainPanel = this.CreateElement("div", "fspl d-none", weekPanel);

        this.CreateLoadingOverlay(mainPanel);
        CreateNavigationButtons(mainPanel);

        document.querySelectorAll("body")[0].append(mainPanel);
    }
}

// Startup Function
(async function() {
  'use strict';

  // Load Token
  Api.ReadToken();
  if(!Api.Token) return;

  // Load user
  await Api.LoadMe();
  if(!Api.User) return;

  DOMHelper.CreatePlannerButton();
  StyleHelper.ApplyStyle();
  DataStore.FirstDay = Convenience.GetFirstDay();

  DOMHelper.SetupMainPanel();

})();

async function BuildPlannerAsync() {
    Convenience.ShowLoadingOverlay();

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

    if(!DataStore.Loaded) Api.PickupData = await Api.LoadPickupsAsync();

    var lastDayDate = Convenience.GetLastDay(DataStore.FirstDay);

    Api.PickupData.sort(function(a, b){return a.pickup.dateObj > b.pickup.dateObj});
    Api.PickupData.forEach(pickup => {

        if(pickup.pickup.dateObj > DataStore.FirstDay && pickup.pickup.dateObj < lastDayDate) {
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
                case 0:
                    sun.append(pickupDiv);
                    break;
            }
        }
    });

    Convenience.HideLoadingOverlay();
}

function CreateNavigationButtons(mainPanel) {
    var navigationPanel = DOMHelper.CreateElement("div", "fspl-nav text-center");

    DOMHelper.CreateNavigationButton(navigationPanel, "Vorherige Woche", "fas fa-arrow-left", () => {
        DataStore.FirstDay.setDate(DataStore.FirstDay.getDate() - 7);
        BuildPlannerAsync();
    });

    DOMHelper.CreateNavigationButton(navigationPanel, "Heute", "fas fa-calendar-day", () => {
        DataStore.FirstDay = Convenience.GetFirstDay();
        BuildPlannerAsync();
    });

    var closeButton = DOMHelper.CreateNavigationButton(navigationPanel, "Heute", "fas fa-times", () => {
        TogglePlanner();
    });
    closeButton.classList.add("button-red");

    DOMHelper.CreateNavigationButton(navigationPanel, "Neu laden", "fas fa-sync", () => {
        DataStore.Loaded = false;
        BuildPlannerAsync();
    });

    DOMHelper.CreateNavigationButton(navigationPanel, "Nächste Woche", "fas fa-arrow-right", () => {
        DataStore.FirstDay.setDate(DataStore.FirstDay.getDate() + 7);
        BuildPlannerAsync();
    });

    mainPanel.prepend(navigationPanel);
}

function CreatePickupDiv(data) {

  var elementClass = "pickup";
  if(data.pickup.occupiedSlots.length == data.pickup.totalSlots) elementClass += " pickup-green";
  if(data.pickup.occupiedSlots.length < data.pickup.totalSlots && data.pickup.occupiedSlots.length > 0) elementClass += " pickup-yellow";
  if(data.pickup.occupiedSlots.length == 0) elementClass += " pickup-red";

  var element = DOMHelper.CreateElement("div", elementClass);

  var headerSpan = DOMHelper.CreateElement("a", "font-weight-bold", data.store.name);
  headerSpan.setAttribute("href", "https://foodsharing.de/?page=fsbetrieb&id=" + data.store.id);
  headerSpan.setAttribute("target", "_blank");
  element.append(headerSpan);

  var timeString = Convenience.GetTimeText(data.pickup.dateObj);
  var timeSpan = DOMHelper.CreateElement("div", "", timeString);
  element.append(timeSpan);

  var imgContainer = DOMHelper.CreateElement("div", "img-container");

    // Occupies slots
    if(data.pickup.occupiedSlots.length > 0) {

        data.pickup.occupiedSlots.forEach(slot => {
            var imgUrl = 'https://' + window.location.hostname + '/images/mini_q_' + slot.profile.avatar;
            if(slot.profile.avatar.startsWith('/api/')) imgUrl = slot.profile.avatar + '?w=35&h=35';

            if(slot.profile.id == Api.User.id) {
              element.classList.add("me");
            }

            var imgClass = "";
            if(!slot.isConfirmed) imgClass = "not-confirmed";
            var imgDiv = DOMHelper.CreateElement("div", imgClass);
            imgDiv.innerHTML = '<a href="https://' + window.location.hostname + '/profile/' + slot.profile.id + '" target="_blank"><img title="' + slot.profile.name + '" src="' + imgUrl + '" /></a>';
            imgContainer.append(imgDiv);
        });
    }

    // Free slots
    for (let i = 0; i < data.pickup.freeSlots; i++) {
        var freeSlotA = DOMHelper.CreateElement("a", "empty-slot");
        freeSlotA.setAttribute("href", "#");
        freeSlotA.addEventListener('click', function () {
            Api.BookPickup(data);
        });

        freeSlotA.innerHTML = '<i class="fas fa-question" />';

        imgContainer.append(freeSlotA);
    }

    element.append(imgContainer);


  return element;
}

function CreateColumn(dayOffset, title) {
    var titleDiv = DOMHelper.CreateElement("div", "day-title text-center", title);
    titleDiv.innerHTML = title;

    var displayDate = new Date(DataStore.FirstDay);
    displayDate.setDate(DataStore.FirstDay.getDate() + dayOffset);

    titleDiv.innerHTML = titleDiv.innerHTML + "<br />" + Convenience.GetDateText(displayDate);

    var classes = "day day-" + dayOffset;
    if(Convenience.IsToday(displayDate)) classes += " today";

    var day = DOMHelper.CreateElement("div", classes, titleDiv);

    return day;
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
