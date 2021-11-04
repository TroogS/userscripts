// ==UserScript==
// @name         Foodsharing Planner
// @namespace    http://tampermonkey.net/
// @version      0.1
// @updateURL    https://github.com/TroogS/userscripts/raw/master/foodsharing_planner.user.js
// @downloadURL  https://github.com/TroogS/userscripts/raw/master/foodsharing_planner.user.js
// @description  Use stackoverflow full width, optional night mode
// @author       A. Beging
// @match        https://foodsharing.de*
// @match        https://foodsharing.de/*
// @grant        none
// ==/UserScript==

function GM_addStyle (cssStr) {
    var newNode = document.createElement ('style');
    newNode.textContent = cssStr;
    document.head.append(newNode);
}

var token;

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
  margin: 5px;
  border-radius: 5px;
  padding: 5px;
}

.day .pickup.available {
  border-color: #64ae25;
}

.day .pickup .img-container {
  display: flex;
}

.day .pickup .img-container div {
  padding-right: 5px;
}

` );

async function BuildPlannerAsync() {
    var data = await LoadPickupsAsync();
    console.log(data);

    var mainPanel = document.querySelectorAll(".fspl")[0];

    var mon = CreateColumn("1", "Montag");
    var tue = CreateColumn("2", "Tuesday");
    var wed = CreateColumn("3", "Wednesday");
    var thu = CreateColumn("4", "Thursday");
    var fri = CreateColumn("5", "Friday");
    var sat = CreateColumn("6", "Saturday");
    var sun = CreateColumn("7", "Sunday");

    data.sort(function(a, b){return a.pickup.date > b.pickup.date});
    data.forEach(pickup => {

        if(pickup.pickup.date > GetFirstDay() && pickup.pickup.date < GetLastDay()) {
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

    mainPanel.append(mon);
    mainPanel.append(tue);
    mainPanel.append(wed);
    mainPanel.append(thu);
    mainPanel.append(fri);
    mainPanel.append(sat);
    mainPanel.append(sun);
}

/*function BuildPlanner() {



    console.log(22);
    return;
    console.log(11);
  LoadPickups().then(function(data){


      console.log(1);
      console.log(data);
      console.log(2);

      data.forEach(store => {
          store.pickups.forEach(pickup => {
              var pickupDiv = CreatePickupDiv(store.name, "19");
              mon.append(pickupDiv);
          });
      });

      mainPanel.append(mon);
      mainPanel.append(tue);
      mainPanel.append(wed);
      mainPanel.append(thu);
      mainPanel.append(fri);
      mainPanel.append(sat);
      mainPanel.append(sun);

      return;
  });

}*/

function GetFirstDay() {
    var curr = new Date();
    var first = curr.getDate() - curr.getDay() + 1;
    var firstDay = new Date(curr.setDate(first));
    firstDay.setHours(0,0,0,0);

    return firstDay;
}

function GetLastDay() {
    var curr = new Date();
    var last = curr.getDate() - curr.getDay() + 7;
    var lastDay = new Date(curr.setDate(last));
    lastDay.setHours(23,59,59,999);

    return lastDay;
}

function CreatePickupDiv(data) {
  var elementClass = "pickup";
  if(data.pickup.isAvailable) elementClass += " available";
  var element = CreateElement("div", elementClass);

  var headerSpan = CreateElement("div", "font-weight-bold", data.store.name);
  element.append(headerSpan);

  var hours = (data.pickup.date.getHours() < 10 ? '0' : '') + data.pickup.date.getHours();
  var minutes = (data.pickup.date.getMinutes() < 10 ? '0' : '') + data.pickup.date.getMinutes();
  var timeString = hours + ":" + minutes;
  var timeSpan = CreateElement("div", "", timeString);
  element.append(timeSpan);

  if(data.pickup.occupiedSlots.length > 0) {
     var imgContainer = CreateElement("div", "img-container");

     data.pickup.occupiedSlots.forEach(slot => {
         var imgDiv = CreateElement("div");
         imgDiv.innerHTML = '<a href="https://foodsharing.de/profile/' + slot.profile.id + '" target="_blank"><img title="' + slot.profile.name + '" src="images/mini_q_' + slot.profile.avatar + '" /></a>';
         imgContainer.append(imgDiv);
     });

     element.append(imgContainer);
  }


  return element;
}

async function LoadPickupsAsync() {

    var pickupData = new Array();
    var apiStoreData = await ApiGetCallAsync("user/current/stores");

    await asyncForEach(apiStoreData, async (store) => {
        var apiPickups = await ApiGetCallAsync('stores/' + store.id + '/pickups');
        if(apiPickups.pickups.length > 0) {

            apiPickups.pickups.forEach(pickup => {

                pickup.date = new Date(pickup.date);

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

    return pickupData;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function LoadPickups() {

    return new Promise(function(resolve, reject){

        var storeData = new Array();

        // Retrieve stores
        ApiGetCall('user/current/stores').then(function(apiStoreData){
            apiStoreData.forEach(store => {

                // Retrieve pickups for store
                ApiGetCall('stores/' + store.id + '/pickups').then(function(apiPickups) {
                    if(apiPickups.pickups.length > 0) {

                        apiPickups.pickups.forEach(pickup => {
                            pickup.date = new Date(pickup.date);
                        });

                        // Add storedata only if pickups available
                        var obj = {
                            id: store.id,
                            name: store.name,
                            pickups: apiPickups.pickups,
                            pickupStatus: store.pickupStatus,
                        };


                        storeData.push(obj);
                    }
                });
            });

            resolve(storeData);
        });
	});

}

function CreateColumn(num, title) {
    var titleDiv = CreateElement("div", "day-title text-center", title);
    var day = CreateElement("div", "day day-" + num, titleDiv);

    return day;
}


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

function CreateButton() {
    var i = CreateElement("i", "fas fa-calendar-alt");
    var a = CreateElement("a", "nav-link", i);
    a.href = "#";
    a.addEventListener('click',function () {TogglePlanner();});

    var li = CreateElement("li", "nav-item", a);
    var div = CreateElement("div", null, li);

    document.querySelectorAll(".navbar-nav.nav-row")[0].append(div);
}

function CreateElement(tagName, classList, content) {
  var element = document.createElement(tagName);

  if(classList) element.classList = classList;
  if(content) element.append(content);

  return element;
}

function ApiGetCall(endpoint) {

    if(token == null) { token = ReadToken(); }

	return new Promise(function(resolve, reject){
		window.$.ajax({
			url: 'https://foodsharing.de/api/' + endpoint,
			beforeSend: function(xhr) {
				 xhr.setRequestHeader("X-CSRF-Token", token)
			}, success: function(data){
				resolve(data)
			}
		});
	});
}

async function ApiGetCallAsync(endpoint) {
  const res = await getData('https://foodsharing.de/api/' + endpoint);
  return res;
}

function getData(ajaxurl) {
  return window.$.ajax({
    url: ajaxurl,
    type: 'GET',
  });
};

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
