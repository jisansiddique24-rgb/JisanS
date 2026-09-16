// ===== StudentHub Portfolio / My Profile page =====
// Shared by both the "Portfolio" nav link and "My Profile" in the header
// dropdown (they open the same page). Requires sign-in. Lets the signed-in
// user edit their own About / Skills / Projects / Certifications, saved
// per-account in localStorage. "Hire Me" opens an email to the address the
// user registered with.

// ---------- Safe storage (falls back to memory if localStorage is blocked) ----------
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

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(function (part) { return part[0].toUpperCase(); })
    .slice(0, 2)
    .join("");
}

// ---------- Portfolio data (per account, keyed by email) ----------
function portfolioKey(email) {
  return "studenthub_portfolio_" + email;
}

function defaultPortfolio(role) {
  return {
    title: role || "Student",
    about: "",
    skills: [],
    projects: [],
    certifications: []
  };
}

function loadPortfolio(email, role) {
  var raw = safeStorage.getItem(portfolioKey(email));
  if (!raw) return defaultPortfolio(role);
  try {
    var parsed = JSON.parse(raw);
    return {
      title: parsed.title || role || "Student",
      about: parsed.about || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : []
    };
  } catch (e) {
    return defaultPortfolio(role);
  }
}

function savePortfolio(email, data) {
  safeStorage.setItem(portfolioKey(email), JSON.stringify(data));
}

function getUsers() {
  var raw = safeStorage.getItem("studenthub_users");
  return raw ? JSON.parse(raw) : [];
}

function findUserByEmail(email) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email) return users[i];
  }
  return null;
}

// ---------- Main ----------
document.addEventListener("DOMContentLoaded", function () {
  var user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  var initials = getInitials(user.name);

  // ----- Determine whose portfolio we're viewing -----
  // "My Profile" always shows your own. Arriving with ?user=<email> (e.g. from
  // clicking "Join" on a project) shows that person's portfolio in read-only
  // mode instead.
  var params = new URLSearchParams(window.location.search);
  var viewedEmail = params.get("user");
  var isOwnProfile = !viewedEmail || viewedEmail === user.email;

  var viewedUser = user;
  if (!isOwnProfile) {
    var found = findUserByEmail(viewedEmail);
    if (found) {
      viewedUser = found;
    } else {
      // Unknown email — fall back to your own profile instead of showing broken data.
      isOwnProfile = true;
      viewedUser = user;
    }
  }

  var viewedInitials = getInitials(viewedUser.name);
  var data = loadPortfolio(viewedUser.email, viewedUser.role);
  var draft = null; // working copy while editing

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

  // ----- Profile card -----
  var profileAvatar = document.getElementById("profileAvatar");
  var profileName = document.getElementById("profileName");
  var profileTitleView = document.getElementById("profileTitleView");
  var profileTitleInput = document.getElementById("profileTitleInput");
  var profileMeta = document.getElementById("profileMeta");

  if (profileAvatar) profileAvatar.textContent = viewedInitials;
  if (profileName) profileName.textContent = viewedUser.name;
  if (profileMeta) {
    profileMeta.textContent = viewedUser.university
      ? viewedUser.role + " · " + viewedUser.university
      : viewedUser.role;
  }

  // ----- Hire Me: takes the visitor to the Contact page's message form for this person -----
  var hireMeBtn = document.getElementById("hireMeBtn");
  if (hireMeBtn) {
    if (isOwnProfile) {
      hireMeBtn.style.display = "none";
    } else {
      hireMeBtn.href = "contact.html?to=" + encodeURIComponent(viewedUser.email) + "&name=" + encodeURIComponent(viewedUser.name);
    }
  }

  // ----- Read-only banner when viewing someone else's portfolio -----
  if (!isOwnProfile) {
    var banner = document.createElement("div");
    banner.className = "viewing-banner";
    banner.innerHTML = 'You\'re viewing <b>' + viewedUser.name + '</b>\'s public portfolio (read-only). <a href="portfolio.html">← Back to my profile</a>';
    var pageEl = document.querySelector(".page");
    pageEl.insertBefore(banner, pageEl.firstChild);
  }

  // ----- Elements -----
  var aboutView = document.getElementById("aboutView");
  var aboutInput = document.getElementById("aboutInput");
  var skillsList = document.getElementById("skillsList");
  var addSkillBtn = document.getElementById("addSkillBtn");
  var projectsList = document.getElementById("projectsList");
  var addProjectBtn = document.getElementById("addProjectBtn");
  var certsList = document.getElementById("certsList");
  var addCertBtn = document.getElementById("addCertBtn");
  var editToggleBtn = document.getElementById("editToggleBtn");
  var saveBtn = document.getElementById("saveBtn");
  var cancelBtn = document.getElementById("cancelBtn");

  if (!isOwnProfile && editToggleBtn) {
    editToggleBtn.style.display = "none";
  }

  // ---------- VIEW MODE RENDERING ----------
  function renderViewAll() {
    profileTitleView.textContent = data.title;
    aboutView.textContent = data.about || "This student hasn't added an About section yet.";

    // Skills
    skillsList.innerHTML = "";
    if (data.skills.length === 0) {
      skillsList.innerHTML = '<p class="empty-hint">No skills added yet.</p>';
    } else {
      data.skills.forEach(function (skill) {
        var pct = Math.max(0, Math.min(100, parseInt(skill.pct, 10) || 0));
        var row = document.createElement("div");
        row.className = "skill-row";
        row.innerHTML =
          '<div class="skill-top"><span></span><span class="pct">' + pct + '%</span></div>' +
          '<div class="skill-bar"><div class="skill-fill" style="width:' + pct + '%;"></div></div>';
        row.querySelector(".skill-top span").textContent = skill.name;
        skillsList.appendChild(row);
      });
    }

    // Projects
    projectsList.innerHTML = "";
    if (data.projects.length === 0) {
      projectsList.innerHTML = '<p class="empty-hint">No projects added yet.</p>';
    } else {
      data.projects.forEach(function (proj) {
        var isCompleted = proj.status === "Completed";
        var item = document.createElement("div");
        item.className = "project-item";
        item.innerHTML =
          '<div class="project-top"><h3></h3><span class="status ' + (isCompleted ? "completed" : "in-progress") + '"></span></div>' +
          '<p></p>' +
          '<div class="project-stack"></div>';
        item.querySelector("h3").textContent = proj.title;
        item.querySelector(".status").textContent = proj.status;
        item.querySelector("p").textContent = proj.desc || "";
        item.querySelector(".project-stack").textContent = proj.stack || "";
        projectsList.appendChild(item);
      });
    }

    // Certifications
    certsList.innerHTML = "";
    if (data.certifications.length === 0) {
      certsList.innerHTML = '<p class="empty-hint">No certifications added yet.</p>';
    } else {
      data.certifications.forEach(function (cert) {
        var row = document.createElement("div");
        row.className = "cert-item";
        row.innerHTML = '<span class="icon">🏆</span><span></span>';
        row.querySelector("span:last-child").textContent = cert;
        certsList.appendChild(row);
      });
    }
  }

  // ---------- EDIT MODE RENDERING ----------
  function renderSkillsEdit() {
    skillsList.innerHTML = "";
    draft.skills.forEach(function (skill, i) {
      var row = document.createElement("div");
      row.className = "skill-edit-row";
      row.innerHTML =
        '<input type="text" class="mini-input skill-name" placeholder="Skill (e.g. React)">' +
        '<input type="number" class="mini-input skill-pct" min="0" max="100" placeholder="%">' +
        '<button type="button" class="remove-btn">✕</button>';
      row.querySelector(".skill-name").value = skill.name || "";
      row.querySelector(".skill-pct").value = skill.pct != null ? skill.pct : "";
      row.querySelector(".remove-btn").addEventListener("click", function () {
        draft.skills.splice(i, 1);
        renderSkillsEdit();
      });
      skillsList.appendChild(row);
    });
  }

  function renderProjectsEdit() {
    projectsList.innerHTML = "";
    draft.projects.forEach(function (proj, i) {
      var card = document.createElement("div");
      card.className = "project-edit-card";
      card.innerHTML =
        '<div class="row-top">' +
        '<input type="text" class="mini-input proj-title" placeholder="Project title">' +
        '<select class="mini-select proj-status">' +
        '<option value="In Progress">In Progress</option>' +
        '<option value="Completed">Completed</option>' +
        '</select>' +
        '<button type="button" class="remove-btn">✕</button>' +
        '</div>' +
        '<textarea class="mini-textarea proj-desc" rows="2" placeholder="Short description"></textarea>' +
        '<input type="text" class="mini-input proj-stack" placeholder="Tech stack, e.g. React, Node.js">';
      card.querySelector(".proj-title").value = proj.title || "";
      card.querySelector(".proj-status").value = proj.status === "Completed" ? "Completed" : "In Progress";
      card.querySelector(".proj-desc").value = proj.desc || "";
      card.querySelector(".proj-stack").value = proj.stack || "";
      card.querySelector(".remove-btn").addEventListener("click", function () {
        draft.projects.splice(i, 1);
        renderProjectsEdit();
      });
      projectsList.appendChild(card);
    });
  }

  function renderCertsEdit() {
    certsList.innerHTML = "";
    draft.certifications.forEach(function (cert, i) {
      var row = document.createElement("div");
      row.className = "cert-edit-row";
      row.innerHTML =
        '<input type="text" class="mini-input cert-text" placeholder="e.g. Google — Data Analytics Certificate">' +
        '<button type="button" class="remove-btn">✕</button>';
      row.querySelector(".cert-text").value = cert || "";
      row.querySelector(".remove-btn").addEventListener("click", function () {
        draft.certifications.splice(i, 1);
        renderCertsEdit();
      });
      certsList.appendChild(row);
    });
  }

  function enterEditMode() {
    draft = JSON.parse(JSON.stringify(data)); // deep copy so Cancel can discard

    profileTitleView.classList.add("hidden");
    profileTitleInput.classList.remove("hidden");
    profileTitleInput.value = draft.title;

    aboutView.classList.add("hidden");
    aboutInput.classList.remove("hidden");
    aboutInput.value = draft.about;

    renderSkillsEdit();
    renderProjectsEdit();
    renderCertsEdit();

    addSkillBtn.classList.remove("hidden");
    addProjectBtn.classList.remove("hidden");
    addCertBtn.classList.remove("hidden");

    editToggleBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
  }

  function exitEditMode() {
    draft = null;

    profileTitleView.classList.remove("hidden");
    profileTitleInput.classList.add("hidden");

    aboutView.classList.remove("hidden");
    aboutInput.classList.add("hidden");

    addSkillBtn.classList.add("hidden");
    addProjectBtn.classList.add("hidden");
    addCertBtn.classList.add("hidden");

    editToggleBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");

    renderViewAll();
  }

  function collectDraftFromInputs() {
    draft.title = profileTitleInput.value.trim() || user.role;
    draft.about = aboutInput.value.trim();

    var skillRows = skillsList.querySelectorAll(".skill-edit-row");
    draft.skills = [];
    skillRows.forEach(function (row) {
      var name = row.querySelector(".skill-name").value.trim();
      var pct = row.querySelector(".skill-pct").value;
      if (name) {
        draft.skills.push({ name: name, pct: Math.max(0, Math.min(100, parseInt(pct, 10) || 0)) });
      }
    });

    var projectCards = projectsList.querySelectorAll(".project-edit-card");
    draft.projects = [];
    projectCards.forEach(function (card) {
      var title = card.querySelector(".proj-title").value.trim();
      if (title) {
        draft.projects.push({
          title: title,
          status: card.querySelector(".proj-status").value,
          desc: card.querySelector(".proj-desc").value.trim(),
          stack: card.querySelector(".proj-stack").value.trim()
        });
      }
    });

    var certRows = certsList.querySelectorAll(".cert-edit-row");
    draft.certifications = [];
    certRows.forEach(function (row) {
      var text = row.querySelector(".cert-text").value.trim();
      if (text) draft.certifications.push(text);
    });
  }

  // ----- Wire up buttons -----
  editToggleBtn.addEventListener("click", enterEditMode);

  cancelBtn.addEventListener("click", function () {
    exitEditMode();
  });

  saveBtn.addEventListener("click", function () {
    collectDraftFromInputs();
    data = draft;
    savePortfolio(user.email, data);
    exitEditMode();
  });

  addSkillBtn.addEventListener("click", function () {
    draft.skills.push({ name: "", pct: 50 });
    renderSkillsEdit();
  });

  addProjectBtn.addEventListener("click", function () {
    draft.projects.push({ title: "", status: "In Progress", desc: "", stack: "" });
    renderProjectsEdit();
  });

  addCertBtn.addEventListener("click", function () {
    draft.certifications.push("");
    renderCertsEdit();
  });

  // ----- Initial render -----
  renderViewAll();
});