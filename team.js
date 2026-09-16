// ===== StudentHub Team page =====
// Shows every project the signed-in user is part of — as Leader, Member,
// or Advisor — with the full member roster and open roles for each.
// Clicking a member card goes to that person's portfolio page.

// ---------- Safe storage ----------
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

var safeStorage = {
  getItem: function (key) {
    return storageBlocked ? (key in memoryFallback ? memoryFallback[key] : null) : localStorage.getItem(key);
  }
};

function getCurrentUser() {
  var raw = safeStorage.getItem("studenthub_current_user");
  return raw ? JSON.parse(raw) : null;
}

function logoutUser() {
  localStorage.removeItem("studenthub_current_user");
  window.location.href = "login.html";
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(function (part) { return part[0].toUpperCase(); })
    .slice(0, 2)
    .join("");
}

function categoryAccentClass(category) {
  return "accent-" + category.toLowerCase().replace(/\s+/g, "-");
}

function loadProjects() {
  var raw = safeStorage.getItem("studenthub_projects");
  return raw ? JSON.parse(raw) : [];
}

// ---------- Main ----------
document.addEventListener("DOMContentLoaded", function () {
  var user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  var initials = getInitials(user.name);

  // ----- Header chip -----
  var headerAvatar = document.getElementById("headerAvatar");
  var headerUsername = document.getElementById("headerUsername");
  var headerRole = document.getElementById("headerRole");
  var headerLogout = document.getElementById("headerLogout");

  if (headerAvatar) headerAvatar.textContent = initials;
  if (headerUsername) headerUsername.textContent = user.name;
  if (headerRole) headerRole.textContent = user.role;
  if (headerLogout) headerLogout.addEventListener("click", function (e) {
    e.preventDefault();
    logoutUser();
  });

  var userChip = document.getElementById("userChip");
  var userMenu = document.getElementById("userMenu");
  if (userChip && userMenu) {
    userChip.addEventListener("click", function () {
      userMenu.classList.toggle("open");
    });
  }

  // ----- Find every project this user belongs to -----
  var allProjects = loadProjects();
  var myProjects = allProjects.filter(function (project) {
    return project.members.some(function (m) { return m.email === user.email; });
  }).sort(function (a, b) { return b.createdAt - a.createdAt; });

  var teamSubtitle = document.getElementById("teamSubtitle");
  var teamList = document.getElementById("teamList");

  if (myProjects.length === 0) {
    teamSubtitle.textContent = "You're not on any project teams yet.";
    teamList.innerHTML =
      '<div class="empty-state">' +
      '<p>Post a project of your own, or join someone else\'s team from the Projects page.</p>' +
      '<a class="btn" href="projects.html">Browse Projects →</a>' +
      '</div>';
    return;
  }

  teamSubtitle.textContent = "You're on " + myProjects.length + (myProjects.length === 1 ? " project team." : " project teams.");

  myProjects.forEach(function (project) {
    var openRolesCount = project.rolesNeeded ? project.rolesNeeded.length : 0;
    var isFull = project.members.length >= project.teamSize;

    var card = document.createElement("div");
    card.className = "team-card " + categoryAccentClass(project.category);

    card.innerHTML =
      '<div class="team-card-header">' +
      '<h2></h2>' +
      '<div style="display:flex; align-items:center;">' +
      '<div class="team-card-stats"></div>' +
      '<span class="capacity-badge"></span>' +
      '</div>' +
      '</div>' +
      '<div class="team-card-body">' +
      '<p class="section-label">Current Members</p>' +
      '<div class="member-grid"></div>' +
      (openRolesCount > 0 ? '<p class="section-label">Open Roles</p><div class="open-roles"></div>' : '') +
      '</div>';

    card.querySelector("h2").textContent = project.title;
    card.querySelector(".team-card-stats").textContent =
      project.members.length + "/" + project.teamSize + (project.members.length === 1 ? " member" : " members") +
      " · " + openRolesCount + (openRolesCount === 1 ? " open role" : " open roles");

    var capacityBadge = card.querySelector(".capacity-badge");
    capacityBadge.textContent = isFull ? "Full" : "Open";
    capacityBadge.classList.add(isFull ? "full" : "open");

    var memberGrid = card.querySelector(".member-grid");
    project.members.forEach(function (member) {
      var memberCard = document.createElement("div");
      memberCard.className = "member-card";

      var roleClass = (member.teamRole || "Member").toLowerCase();

      memberCard.innerHTML =
        '<div class="member-avatar"></div>' +
        '<div class="member-name"></div>' +
        '<div class="member-title"></div>' +
        '<span class="member-role-badge ' + roleClass + '"></span>';

      memberCard.querySelector(".member-avatar").textContent = getInitials(member.name);
      memberCard.querySelector(".member-name").textContent = member.name;
      memberCard.querySelector(".member-title").textContent = member.title || member.teamRole || "Member";
      memberCard.querySelector(".member-role-badge").textContent = member.teamRole || "Member";

      memberCard.addEventListener("click", function () {
        window.location.href = "portfolio.html?user=" + encodeURIComponent(member.email);
      });

      memberGrid.appendChild(memberCard);
    });

    if (openRolesCount > 0) {
      var openRolesEl = card.querySelector(".open-roles");
      project.rolesNeeded.forEach(function (role) {
        var chip = document.createElement("span");
        chip.className = "role-chip";
        chip.textContent = "+ " + role;
        openRolesEl.appendChild(chip);
      });
    }

    teamList.appendChild(card);
  });
});