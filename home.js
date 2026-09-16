// ===== StudentHub Home page =====
// Protects the page (redirects to login.html if nobody is signed in),
// fills the header chip with the real signed-in user's name/role/initials,
// wires up the Log Out link, and toggles the user dropdown menu.

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

function getCurrentUser() {
  var raw = safeStorage.getItem("studenthub_current_user");
  return raw ? JSON.parse(raw) : null;
}

function logoutUser() {
  safeStorage.removeItem("studenthub_current_user");
  window.location.href = "login.html";
}

function requireAuthAndRenderHeader() {
  var user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  var initials = user.name
    .split(" ")
    .filter(Boolean)
    .map(function (part) { return part[0].toUpperCase(); })
    .slice(0, 2)
    .join("");

  var avatarEl = document.getElementById("headerAvatar");
  var nameEl = document.getElementById("headerUsername");
  var roleEl = document.getElementById("headerRole");
  var logoutEl = document.getElementById("headerLogout");

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (logoutEl) logoutEl.addEventListener("click", function (e) {
    e.preventDefault();
    logoutUser();
  });
}

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
  var userChip = document.getElementById("userChip");
  var userMenu = document.getElementById("userMenu");
  if (userChip && userMenu) {
    userChip.addEventListener("click", function () {
      userMenu.classList.toggle("open");
    });
  }

  requireAuthAndRenderHeader();
  renderLiveStats();
  renderLatestGigs();
});