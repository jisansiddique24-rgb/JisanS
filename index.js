// ===== StudentHub Public Landing Page (index.html) =====
// This page is public — no login required to view it.
// It shows live platform stats and a preview of the latest gigs,
// and lets visitors go to Log In or Register from the header.
// (Unlike home.html, it does NOT redirect to login.html and does NOT
// render a signed-in user menu.)

var memoryFallback = {};
var storageBlocked = false;

function testStorage() {
  try {
    var k = "__studenthub_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}
storageBlocked = !testStorage();
if (storageBlocked) {
  console.warn("localStorage is blocked in this browser/tab — using temporary in-memory storage instead.");
}

var safeStorage = {
  getItem: function (key) {
    return storageBlocked ? (key in memoryFallback ? memoryFallback[key] : null) : localStorage.getItem(key);
  },
  setItem: function (key, value) {
    if (storageBlocked) { memoryFallback[key] = value; } else { localStorage.setItem(key, value); }
  },
  removeItem: function (key) {
    if (storageBlocked) { delete memoryFallback[key]; } else { localStorage.removeItem(key); }
  }
};

function countStored(key) {
  var raw = safeStorage.getItem(key);
  if (!raw) return 0;
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (e) {
    return 0;
  }
}

function renderLiveStats() {
  var statStudents = document.getElementById("statStudents");
  var statGigs = document.getElementById("statGigs");
  var statTeams = document.getElementById("statTeams");

  if (statStudents) statStudents.textContent = countStored("studenthub_users").toLocaleString();
  if (statGigs) statGigs.textContent = countStored("studenthub_gigs").toLocaleString();
  if (statTeams) statTeams.textContent = countStored("studenthub_projects").toLocaleString();
}

function loadGigs() {
  var raw = safeStorage.getItem("studenthub_gigs");
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function renderLatestGigs() {
  var gigList = document.getElementById("gigList");
  if (!gigList) return;

  var gigs = loadGigs().slice().sort(function (a, b) { return b.postedAt - a.postedAt; });
  var latest = gigs.slice(0, 3);

  if (latest.length === 0) {
    gigList.innerHTML = '<p class="empty-hint">No gigs posted yet — be the first!</p>';
    return;
  }

  gigList.innerHTML = "";
  latest.forEach(function (gig) {
    var item = document.createElement("div");
    item.className = "gig-item";
    item.innerHTML =
      (gig.urgent ? '<span class="tag urgent">URGENT</span>' : '') +
      '<span class="gig-title"></span>' +
      '<span class="tag category"></span>' +
      '<span class="gig-price"></span>';
    item.querySelector(".gig-title").textContent = gig.title;
    item.querySelector(".tag.category").textContent = gig.category;
    item.querySelector(".gig-price").textContent = "$" + gig.price;
    gigList.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  renderLiveStats();
  renderLatestGigs();
});