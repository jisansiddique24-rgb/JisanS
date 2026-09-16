// ===== StudentHub Admin Dashboard =====
// Front-end only demo: everything is read from / written to localStorage,
// the same storage used by the student-facing pages (home, gigs, projects,
// portfolio, contact). That means anything the admin edits here shows up
// immediately for students too, and anything students create shows up here.
//
// NOTE: In a real deployment none of this logic (auth, data writes) would
// live in the browser — it would be enforced by a server with a real
// database and authenticated API endpoints.

// ---------- Safe storage wrapper (matches the rest of the site) ----------
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
    return storageBlocked
      ? key in memoryFallback
        ? memoryFallback[key]
        : null
      : localStorage.getItem(key);
  },
  setItem: function (key, value) {
    if (storageBlocked) {
      memoryFallback[key] = value;
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: function (key) {
    if (storageBlocked) {
      delete memoryFallback[key];
    } else {
      localStorage.removeItem(key);
    }
  },
  allKeys: function () {
    return storageBlocked
      ? Object.keys(memoryFallback)
      : Object.keys(localStorage);
  },
};

var ADMIN_SESSION_KEY = "studenthub_admin_session";
var ADMIN_CREDENTIALS_KEY = "studenthub_admin_credentials";
var USERS_KEY = "studenthub_users";
var PROJECTS_KEY = "studenthub_projects";
var GIGS_KEY = "studenthub_gigs";
var SUPPORT_EMAIL = "support@studenthub.local";

// ---------- Auth guard ----------
var adminSession = null;
(function requireAdminAuth() {
  var raw = safeStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    window.location.href = "admin-login.html";
    return;
  }
  try {
    adminSession = JSON.parse(raw);
  } catch (e) {
    window.location.href = "admin-login.html";
  }
})();

// ---------- Data helpers ----------
function getUsers() {
  var raw = safeStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveUsers(users) {
  safeStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getProjects() {
  var raw = safeStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveProjects(projects) {
  safeStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function getGigs() {
  var raw = safeStorage.getItem(GIGS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveGigs(gigs) {
  safeStorage.setItem(GIGS_KEY, JSON.stringify(gigs));
}

function getPortfolio(email) {
  var raw = safeStorage.getItem("studenthub_portfolio_" + email);
  return raw ? JSON.parse(raw) : null;
}
function savePortfolioData(email, data) {
  safeStorage.setItem("studenthub_portfolio_" + email, JSON.stringify(data));
}
function deletePortfolio(email) {
  safeStorage.removeItem("studenthub_portfolio_" + email);
}

function getAllPortfolios() {
  var prefix = "studenthub_portfolio_";
  return safeStorage
    .allKeys()
    .filter(function (k) {
      return k.indexOf(prefix) === 0;
    })
    .map(function (k) {
      var email = k.slice(prefix.length);
      var raw = safeStorage.getItem(k);
      var data = raw ? JSON.parse(raw) : null;
      return { email: email, data: data };
    })
    .filter(function (p) {
      return p.data;
    });
}

// Returns ONE profile entry per registered user (not just users who bothered
// to fill in a portfolio). If a user has saved portfolio data it is used;
// otherwise a blank/default profile shape is generated on the fly so the
// admin can still see the account and open/manage it. This is what powers
// "see every user's profile" in the admin dashboard.
function getAllStudentProfiles() {
  var users = getUsers();
  return users.map(function (u) {
    var portfolio = getPortfolio(u.email);
    var hasPortfolio = !!portfolio;
    var data = portfolio || {
      title: u.role || "Student",
      about: "",
      skills: [],
      projects: [],
      certifications: [],
    };
    return {
      email: u.email,
      name: u.name,
      role: u.role,
      hasPortfolio: hasPortfolio,
      data: data,
    };
  });
}

function threadKey(emailA, emailB) {
  var pair = [emailA, emailB].sort();
  return "studenthub_thread_" + pair[0] + "::" + pair[1];
}
function loadThread(key) {
  var raw = safeStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function saveThread(key, messages) {
  safeStorage.setItem(key, JSON.stringify(messages));
}

function getSupportConversations() {
  var prefix = "studenthub_thread_";
  var suffix = "::" + SUPPORT_EMAIL;
  var altPrefix = prefix + SUPPORT_EMAIL + "::";
  return safeStorage
    .allKeys()
    .filter(function (k) {
      return (
        k.indexOf(prefix) === 0 &&
        (k.indexOf(suffix, k.length - suffix.length) !== -1 ||
          k.indexOf(altPrefix) === 0)
      );
    })
    .map(function (k) {
      var body = k.slice(prefix.length);
      var parts = body.split("::");
      var studentEmail = parts[0] === SUPPORT_EMAIL ? parts[1] : parts[0];
      var thread = loadThread(k);
      return { key: k, studentEmail: studentEmail, thread: thread };
    })
    .filter(function (c) {
      return c.studentEmail && c.thread.length > 0;
    })
    .sort(function (a, b) {
      var lastA = a.thread[a.thread.length - 1].time || 0;
      var lastB = b.thread[b.thread.length - 1].time || 0;
      return lastB - lastA;
    });
}

function getAdminCredentials() {
  var raw = safeStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (raw) return JSON.parse(raw);
  var defaults = { email: "admin@studenthub.com", password: "Admin@2026" };
  safeStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(defaults));
  return defaults;
}

function findUserByEmail(email) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email) return users[i];
  }
  return null;
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map(function (p) {
      return p[0].toUpperCase();
    })
    .slice(0, 2)
    .join("");
}

function timeAgo(ts) {
  if (!ts) return "";
  var diff = Date.now() - ts;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  var days = Math.floor(hrs / 24);
  return days + "d ago";
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// ---------- Toast ----------
var toastEl = document.getElementById("toast");
var toastTimer = null;
function showToast(message, type) {
  toastEl.textContent = message;
  toastEl.className = "toast show " + (type || "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toastEl.className = "toast " + (type || "");
  }, 2600);
}

// ---------- Modal ----------
var modalOverlay = document.getElementById("modalOverlay");
var modalTitle = document.getElementById("modalTitle");
var modalBody = document.getElementById("modalBody");

function openModal(title, bodyHtml, onMount) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalOverlay.classList.add("show");
  if (onMount) onMount(modalBody);
}
function closeModal() {
  modalOverlay.classList.remove("show");
  modalBody.innerHTML = "";
}
document.getElementById("modalClose").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", function (e) {
  if (e.target === modalOverlay) closeModal();
});

// ==================================================================
// NAVIGATION
// ==================================================================
var views = document.querySelectorAll(".view");
var navItems = document.querySelectorAll(".nav-item");
var topbarTitle = document.getElementById("topbarTitle");

var VIEW_TITLES = {
  overview: "Overview",
  students: "Manage Students",
  projects: "Manage Projects",
  gigs: "Manage Gigs",
  portfolios: "All User Profiles",
  messages: "Support Inbox",
  settings: "Settings",
};

function goToView(name) {
  views.forEach(function (v) {
    v.classList.toggle("active", v.id === "view-" + name);
  });
  navItems.forEach(function (n) {
    n.classList.toggle("active", n.dataset.view === name);
  });
  topbarTitle.textContent = VIEW_TITLES[name] || "Admin";
  renderView(name);
}

navItems.forEach(function (btn) {
  btn.addEventListener("click", function () {
    goToView(btn.dataset.view);
  });
});

document.querySelectorAll("[data-goto]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    goToView(btn.dataset.goto);
  });
});

function renderView(name) {
  if (name === "overview") renderOverview();
  else if (name === "students") renderStudents();
  else if (name === "projects") renderProjects();
  else if (name === "gigs") renderGigs();
  else if (name === "portfolios") renderPortfolios();
  else if (name === "messages") renderInbox();
  else if (name === "settings") renderSettings();
}

function refreshSidebarCounts() {
  document.getElementById("countStudents").textContent = getUsers().length;
  document.getElementById("countProjects").textContent = getProjects().length;
  document.getElementById("countGigs").textContent = getGigs().length;
  document.getElementById("countPortfolios").textContent =
    getAllStudentProfiles().length;
  document.getElementById("countMessages").textContent =
    getSupportConversations().length;
}

// ==================================================================
// OVERVIEW
// ==================================================================
function renderOverview() {
  var users = getUsers();
  var projects = getProjects();
  var gigs = getGigs();
  var convos = getSupportConversations();

  document.getElementById("statTotalStudents").textContent = users.length;
  document.getElementById("statTotalProjects").textContent = projects.length;
  document.getElementById("statTotalGigs").textContent = gigs.length;
  document.getElementById("statTotalMessages").textContent = convos.length;

  var recentStudents = users.slice(-5).reverse();
  var listEl = document.getElementById("recentStudentsList");
  listEl.innerHTML = recentStudents.length
    ? recentStudents
        .map(function (u) {
          return (
            '<div class="mini-row">' +
            '<div class="mini-avatar">' +
            escapeHtml(getInitials(u.name)) +
            "</div>" +
            '<div class="mini-info"><div class="mini-title">' +
            escapeHtml(u.name) +
            "</div>" +
            '<div class="mini-sub">' +
            escapeHtml(u.email) +
            "</div></div>" +
            '<div class="mini-badge">' +
            escapeHtml(u.role || "Student") +
            "</div>" +
            "</div>"
          );
        })
        .join("")
    : '<div class="empty-state">No students registered yet.</div>';

  var recentGigs = gigs.slice(-5).reverse();
  var gigsListEl = document.getElementById("recentGigsList");
  gigsListEl.innerHTML = recentGigs.length
    ? recentGigs
        .map(function (g) {
          return (
            '<div class="mini-row">' +
            '<div class="mini-avatar">💼</div>' +
            '<div class="mini-info"><div class="mini-title">' +
            escapeHtml(g.title) +
            "</div>" +
            '<div class="mini-sub">by ' +
            escapeHtml(g.postedBy || "Unknown") +
            " · $" +
            escapeHtml(g.price) +
            "</div></div>" +
            (g.urgent
              ? '<div class="mini-badge" style="background:rgba(255,107,107,0.15);color:#ff6b6b;">Urgent</div>'
              : "") +
            "</div>"
          );
        })
        .join("")
    : '<div class="empty-state">No gigs posted yet.</div>';
}

// ==================================================================
// STUDENTS
// ==================================================================
function renderStudents(filter) {
  var users = getUsers();
  var q = (filter || "").toLowerCase();
  if (q) {
    users = users.filter(function (u) {
      return (
        (u.name || "").toLowerCase().indexOf(q) !== -1 ||
        (u.email || "").toLowerCase().indexOf(q) !== -1 ||
        (u.role || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  var body = document.getElementById("studentsTableBody");
  var emptyState = document.getElementById("studentsEmptyState");

  if (!users.length) {
    body.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  body.innerHTML = users
    .map(function (u, idx) {
      return (
        "<tr>" +
        "<td><strong>" +
        escapeHtml(u.name) +
        "</strong></td>" +
        "<td>" +
        escapeHtml(u.email) +
        "</td>" +
        '<td><span class="badge purple">' +
        escapeHtml(u.role || "Student") +
        "</span></td>" +
        '<td><span class="badge gray">Student</span></td>' +
        '<td class="actions-col"><div class="row-actions">' +
        '<button class="icon-btn" data-edit-user="' +
        escapeHtml(u.email) +
        '" title="Edit">✏️</button>' +
        '<button class="icon-btn" data-reset-user="' +
        escapeHtml(u.email) +
        '" title="Reset password">🔑</button>' +
        '<button class="icon-btn danger" data-delete-user="' +
        escapeHtml(u.email) +
        '" title="Delete">🗑️</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-edit-user]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openEditUserModal(btn.getAttribute("data-edit-user"));
    });
  });
  body.querySelectorAll("[data-reset-user]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openResetPasswordModal(btn.getAttribute("data-reset-user"));
    });
  });
  body.querySelectorAll("[data-delete-user]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      confirmDeleteUser(btn.getAttribute("data-delete-user"));
    });
  });
}

function openEditUserModal(email) {
  var user = findUserByEmail(email);
  if (!user) return;
  openModal(
    "Edit Student",
    "" +
      '<form id="editUserForm" class="modal-form">' +
      '<div class="field"><label>Full Name</label><input type="text" id="editUserName" value="' +
      escapeHtml(user.name) +
      '"></div>' +
      '<div class="field"><label>Email</label><input type="email" id="editUserEmail" value="' +
      escapeHtml(user.email) +
      '"></div>' +
      '<div class="field"><label>Role</label>' +
      '<select id="editUserRole">' +
      ["Developer", "Designer", "Researcher", "Other"]
        .map(function (r) {
          return (
            '<option value="' +
            r +
            '"' +
            (user.role === r ? " selected" : "") +
            ">" +
            r +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      "</div>" +
      '<div class="modal-footer-row">' +
      '<button type="button" class="btn-secondary" id="cancelEditUser">Cancel</button>' +
      '<button type="submit" class="btn-primary">Save Changes</button>' +
      "</div>" +
      "</form>",
    function () {
      document
        .getElementById("cancelEditUser")
        .addEventListener("click", closeModal);
      document
        .getElementById("editUserForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var newName = document.getElementById("editUserName").value.trim();
          var newEmail = document
            .getElementById("editUserEmail")
            .value.trim()
            .toLowerCase();
          var newRole = document.getElementById("editUserRole").value;

          if (!newName || !/^\S+@\S+\.\S+$/.test(newEmail)) {
            showToast("Please enter a valid name and email.", "error");
            return;
          }

          var users = getUsers();
          if (
            newEmail !== email &&
            users.some(function (u) {
              return u.email === newEmail;
            })
          ) {
            showToast("Another account already uses that email.", "error");
            return;
          }

          users = users.map(function (u) {
            if (u.email === email) {
              return Object.assign({}, u, {
                name: newName,
                email: newEmail,
                role: newRole,
              });
            }
            return u;
          });
          saveUsers(users);
          showToast("Student updated.", "success");
          closeModal();
          renderStudents(document.getElementById("studentSearch").value);
          refreshSidebarCounts();
        });
    },
  );
}

function openResetPasswordModal(email) {
  openModal(
    "Reset Password",
    "" +
      '<form id="resetPwForm" class="modal-form">' +
      '<p style="color:#a3a6b8;font-size:13px;margin-top:0;">Set a new password for <strong>' +
      escapeHtml(email) +
      "</strong>.</p>" +
      '<div class="field"><label>New Password</label><input type="text" id="newPwInput" placeholder="At least 6 characters"></div>' +
      '<div class="modal-footer-row">' +
      '<button type="button" class="btn-secondary" id="cancelResetPw">Cancel</button>' +
      '<button type="submit" class="btn-primary">Reset Password</button>' +
      "</div>" +
      "</form>",
    function () {
      document
        .getElementById("cancelResetPw")
        .addEventListener("click", closeModal);
      document
        .getElementById("resetPwForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var pw = document.getElementById("newPwInput").value;
          if (pw.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            return;
          }
          var users = getUsers().map(function (u) {
            return u.email === email
              ? Object.assign({}, u, { password: pw })
              : u;
          });
          saveUsers(users);
          showToast("Password reset for " + email + ".", "success");
          closeModal();
        });
    },
  );
}

function confirmDeleteUser(email) {
  if (
    !confirm(
      "Delete the account for " +
        email +
        "? This also removes their portfolio. This cannot be undone.",
    )
  )
    return;
  var users = getUsers().filter(function (u) {
    return u.email !== email;
  });
  saveUsers(users);
  deletePortfolio(email);
  showToast("Student account deleted.", "success");
  renderStudents(document.getElementById("studentSearch").value);
  refreshSidebarCounts();
}

document.getElementById("studentSearch").addEventListener("input", function () {
  renderStudents(this.value);
});

// ==================================================================
// PROJECTS
// ==================================================================
function renderProjects(filter) {
  var projects = getProjects();
  var q = (filter || "").toLowerCase();
  if (q) {
    projects = projects.filter(function (p) {
      return (
        (p.title || "").toLowerCase().indexOf(q) !== -1 ||
        (p.category || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  var grid = document.getElementById("projectsGrid");
  var emptyState = document.getElementById("projectsEmptyState");

  if (!projects.length) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  grid.innerHTML = projects
    .map(function (p) {
      return (
        '<div class="item-card">' +
        '<div class="item-card-header">' +
        '<div><div class="item-card-title">' +
        escapeHtml(p.title) +
        "</div>" +
        '<div class="item-card-sub">' +
        escapeHtml(p.category) +
        " · " +
        (p.members ? p.members.length : 0) +
        "/" +
        escapeHtml(p.teamSize) +
        " members</div></div>" +
        '<span class="badge orange">' +
        escapeHtml(p.category) +
        "</span>" +
        "</div>" +
        '<div class="item-card-desc">' +
        escapeHtml(p.description) +
        "</div>" +
        '<div class="item-card-tags">' +
        (p.rolesNeeded || [])
          .map(function (r) {
            return '<span class="tag-pill">' + escapeHtml(r) + "</span>";
          })
          .join("") +
        "</div>" +
        '<div class="item-card-footer">' +
        '<span class="mini-sub">Led by ' +
        escapeHtml(p.leaderName || "Unknown") +
        "</span>" +
        '<div class="row-actions">' +
        '<button class="icon-btn" data-edit-project="' +
        escapeHtml(p.id) +
        '" title="Edit">✏️</button>' +
        '<button class="icon-btn danger" data-delete-project="' +
        escapeHtml(p.id) +
        '" title="Delete">🗑️</button>' +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  grid.querySelectorAll("[data-edit-project]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openProjectModal(btn.getAttribute("data-edit-project"));
    });
  });
  grid.querySelectorAll("[data-delete-project]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      confirmDeleteProject(btn.getAttribute("data-delete-project"));
    });
  });
}

function openProjectModal(id) {
  var projects = getProjects();
  var project = id
    ? projects.find(function (p) {
        return p.id === id;
      })
    : null;
  var isNew = !project;
  project = project || {
    id: "p-" + Date.now(),
    title: "",
    category: "Web Dev",
    teamSize: 4,
    description: "",
    rolesNeeded: [],
    leaderName: adminSession.email,
    leaderEmail: adminSession.email,
    members: [],
    joinCode: "NEW" + Math.floor(Math.random() * 9000 + 1000),
    createdAt: Date.now(),
  };

  openModal(
    isNew ? "Add Project" : "Edit Project",
    "" +
      '<form id="projectForm" class="modal-form">' +
      '<div class="field"><label>Title</label><input type="text" id="pfTitle" value="' +
      escapeHtml(project.title) +
      '"></div>' +
      '<div class="field"><label>Category</label>' +
      '<select id="pfCategory">' +
      ["Web Dev", "Mobile", "Research", "Data", "Design"]
        .map(function (c) {
          return (
            '<option value="' +
            c +
            '"' +
            (project.category === c ? " selected" : "") +
            ">" +
            c +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      "</div>" +
      '<div class="field"><label>Team Size (target)</label><input type="number" id="pfTeamSize" min="1" value="' +
      escapeHtml(project.teamSize) +
      '"></div>' +
      '<div class="field"><label>Description</label><textarea id="pfDescription">' +
      escapeHtml(project.description) +
      "</textarea></div>" +
      '<div class="field"><label>Roles Needed <span class="optional-tag">(comma separated)</span></label><input type="text" id="pfRoles" value="' +
      escapeHtml((project.rolesNeeded || []).join(", ")) +
      '"></div>' +
      '<div class="field"><label>Leader Name</label><input type="text" id="pfLeaderName" value="' +
      escapeHtml(project.leaderName || "") +
      '"></div>' +
      '<div class="field"><label>Leader Email</label><input type="email" id="pfLeaderEmail" value="' +
      escapeHtml(project.leaderEmail || "") +
      '"></div>' +
      '<div class="modal-footer-row">' +
      '<button type="button" class="btn-secondary" id="cancelProject">Cancel</button>' +
      '<button type="submit" class="btn-primary">' +
      (isNew ? "Create Project" : "Save Changes") +
      "</button>" +
      "</div>" +
      "</form>",
    function () {
      document
        .getElementById("cancelProject")
        .addEventListener("click", closeModal);
      document
        .getElementById("projectForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var title = document.getElementById("pfTitle").value.trim();
          if (!title) {
            showToast("Title is required.", "error");
            return;
          }

          var updated = Object.assign({}, project, {
            title: title,
            category: document.getElementById("pfCategory").value,
            teamSize:
              parseInt(document.getElementById("pfTeamSize").value, 10) || 1,
            description: document.getElementById("pfDescription").value.trim(),
            rolesNeeded: document
              .getElementById("pfRoles")
              .value.split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean),
            leaderName: document.getElementById("pfLeaderName").value.trim(),
            leaderEmail: document
              .getElementById("pfLeaderEmail")
              .value.trim()
              .toLowerCase(),
          });

          if (isNew) {
            if (!updated.members || !updated.members.length) {
              updated.members = [
                {
                  name: updated.leaderName,
                  email: updated.leaderEmail,
                  title: "Lead",
                  teamRole: "Lead",
                },
              ];
            }
            projects.push(updated);
          } else {
            projects = projects.map(function (p) {
              return p.id === project.id ? updated : p;
            });
          }
          saveProjects(projects);
          showToast(isNew ? "Project created." : "Project updated.", "success");
          closeModal();
          renderProjects(document.getElementById("projectSearch").value);
          refreshSidebarCounts();
        });
    },
  );
}

function confirmDeleteProject(id) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  var projects = getProjects().filter(function (p) {
    return p.id !== id;
  });
  saveProjects(projects);
  showToast("Project deleted.", "success");
  renderProjects(document.getElementById("projectSearch").value);
  refreshSidebarCounts();
}

document.getElementById("addProjectBtn").addEventListener("click", function () {
  openProjectModal(null);
});
document.getElementById("projectSearch").addEventListener("input", function () {
  renderProjects(this.value);
});

// ==================================================================
// GIGS
// ==================================================================
function renderGigs(filter) {
  var gigs = getGigs();
  var q = (filter || "").toLowerCase();
  if (q) {
    gigs = gigs.filter(function (g) {
      return (
        (g.title || "").toLowerCase().indexOf(q) !== -1 ||
        (g.category || "").toLowerCase().indexOf(q) !== -1 ||
        (g.postedBy || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  var body = document.getElementById("gigsTableBody");
  var emptyState = document.getElementById("gigsEmptyState");

  if (!gigs.length) {
    body.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  body.innerHTML = gigs
    .map(function (g) {
      return (
        "<tr>" +
        "<td><strong>" +
        escapeHtml(g.title) +
        "</strong></td>" +
        '<td><span class="badge gray">' +
        escapeHtml(g.category) +
        "</span></td>" +
        "<td>$" +
        escapeHtml(g.price) +
        "</td>" +
        "<td>" +
        escapeHtml(g.postedBy || "Unknown") +
        "</td>" +
        '<td><button class="toggle-pill ' +
        (g.urgent ? "on" : "off") +
        '" data-toggle-urgent="' +
        escapeHtml(g.id) +
        '">' +
        (g.urgent ? "Urgent" : "Normal") +
        "</button></td>" +
        '<td class="actions-col"><div class="row-actions">' +
        '<button class="icon-btn" data-edit-gig="' +
        escapeHtml(g.id) +
        '" title="Edit">✏️</button>' +
        '<button class="icon-btn danger" data-delete-gig="' +
        escapeHtml(g.id) +
        '" title="Delete">🗑️</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  body.querySelectorAll("[data-edit-gig]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openGigModal(btn.getAttribute("data-edit-gig"));
    });
  });
  body.querySelectorAll("[data-delete-gig]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      confirmDeleteGig(btn.getAttribute("data-delete-gig"));
    });
  });
  body.querySelectorAll("[data-toggle-urgent]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      toggleGigUrgent(btn.getAttribute("data-toggle-urgent"));
    });
  });
}

function toggleGigUrgent(id) {
  var gigs = getGigs().map(function (g) {
    return g.id === id ? Object.assign({}, g, { urgent: !g.urgent }) : g;
  });
  saveGigs(gigs);
  renderGigs(document.getElementById("gigSearch").value);
}

function openGigModal(id) {
  var gigs = getGigs();
  var gig = id
    ? gigs.find(function (g) {
        return g.id === id;
      })
    : null;
  var isNew = !gig;
  gig = gig || {
    id: "g-" + Date.now(),
    title: "",
    category: "Web Dev",
    urgent: false,
    price: 0,
    description: "",
    tags: [],
    postedBy: "StudentHub Admin",
    postedAt: Date.now(),
  };

  openModal(
    isNew ? "Add Gig" : "Edit Gig",
    "" +
      '<form id="gigForm" class="modal-form">' +
      '<div class="field"><label>Title</label><input type="text" id="gfTitle" value="' +
      escapeHtml(gig.title) +
      '"></div>' +
      '<div class="field"><label>Category</label>' +
      '<select id="gfCategory">' +
      ["Web Dev", "Mobile", "Design", "Writing", "Research", "Data"]
        .map(function (c) {
          return (
            '<option value="' +
            c +
            '"' +
            (gig.category === c ? " selected" : "") +
            ">" +
            c +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      "</div>" +
      '<div class="field"><label>Price (USD)</label><input type="number" id="gfPrice" min="0" value="' +
      escapeHtml(gig.price) +
      '"></div>' +
      '<div class="field"><label>Description</label><textarea id="gfDescription">' +
      escapeHtml(gig.description) +
      "</textarea></div>" +
      '<div class="field"><label>Tags <span class="optional-tag">(comma separated)</span></label><input type="text" id="gfTags" value="' +
      escapeHtml((gig.tags || []).join(", ")) +
      '"></div>' +
      '<div class="field"><label>Posted By</label><input type="text" id="gfPostedBy" value="' +
      escapeHtml(gig.postedBy || "") +
      '"></div>' +
      '<div class="field"><label><input type="checkbox" id="gfUrgent" ' +
      (gig.urgent ? "checked" : "") +
      ' style="width:auto;margin-right:8px;"> Mark as urgent</label></div>' +
      '<div class="modal-footer-row">' +
      '<button type="button" class="btn-secondary" id="cancelGig">Cancel</button>' +
      '<button type="submit" class="btn-primary">' +
      (isNew ? "Post Gig" : "Save Changes") +
      "</button>" +
      "</div>" +
      "</form>",
    function () {
      document
        .getElementById("cancelGig")
        .addEventListener("click", closeModal);
      document
        .getElementById("gigForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var title = document.getElementById("gfTitle").value.trim();
          if (!title) {
            showToast("Title is required.", "error");
            return;
          }

          var updated = Object.assign({}, gig, {
            title: title,
            category: document.getElementById("gfCategory").value,
            price: parseInt(document.getElementById("gfPrice").value, 10) || 0,
            description: document.getElementById("gfDescription").value.trim(),
            tags: document
              .getElementById("gfTags")
              .value.split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean),
            postedBy:
              document.getElementById("gfPostedBy").value.trim() ||
              "StudentHub Admin",
            urgent: document.getElementById("gfUrgent").checked,
          });

          if (isNew) {
            gigs.push(updated);
          } else {
            gigs = gigs.map(function (g) {
              return g.id === gig.id ? updated : g;
            });
          }
          saveGigs(gigs);
          showToast(isNew ? "Gig posted." : "Gig updated.", "success");
          closeModal();
          renderGigs(document.getElementById("gigSearch").value);
          refreshSidebarCounts();
        });
    },
  );
}

function confirmDeleteGig(id) {
  if (!confirm("Delete this gig? This cannot be undone.")) return;
  var gigs = getGigs().filter(function (g) {
    return g.id !== id;
  });
  saveGigs(gigs);
  showToast("Gig deleted.", "success");
  renderGigs(document.getElementById("gigSearch").value);
  refreshSidebarCounts();
}

document.getElementById("addGigBtn").addEventListener("click", function () {
  openGigModal(null);
});
document.getElementById("gigSearch").addEventListener("input", function () {
  renderGigs(this.value);
});

// ==================================================================
// PORTFOLIOS
// ==================================================================
function renderPortfolios(filter) {
  var profiles = getAllStudentProfiles();
  var q = (filter || "").toLowerCase();
  if (q) {
    profiles = profiles.filter(function (p) {
      var name = p.name || "";
      return (
        p.email.toLowerCase().indexOf(q) !== -1 ||
        name.toLowerCase().indexOf(q) !== -1 ||
        (p.data.title || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  var grid = document.getElementById("portfoliosGrid");
  var emptyState = document.getElementById("portfoliosEmptyState");

  if (!profiles.length) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    emptyState.textContent = getUsers().length
      ? "No profiles match your search."
      : "No registered students yet.";
    return;
  }
  emptyState.style.display = "none";

  grid.innerHTML = profiles
    .map(function (p) {
      var name = p.name || p.email;
      var statusBadge = p.hasPortfolio
        ? '<span class="badge green">' +
          escapeHtml(p.data.title || "Student") +
          "</span>"
        : '<span class="badge gray">No portfolio yet</span>';
      return (
        '<div class="item-card">' +
        '<div class="item-card-header">' +
        '<div><div class="item-card-title">' +
        escapeHtml(name) +
        "</div>" +
        '<div class="item-card-sub">' +
        escapeHtml(p.email) +
        (p.role ? " · " + escapeHtml(p.role) : "") +
        "</div></div>" +
        statusBadge +
        "</div>" +
        '<div class="item-card-desc">' +
        escapeHtml(p.data.about || "This student hasn't written a bio yet.") +
        "</div>" +
        '<div class="item-card-tags">' +
        (p.data.skills || [])
          .slice(0, 6)
          .map(function (s) {
            return '<span class="tag-pill">' + escapeHtml(s) + "</span>";
          })
          .join("") +
        "</div>" +
        '<div class="item-card-footer">' +
        '<span class="mini-sub">' +
        (p.data.projects || []).length +
        " project(s) · " +
        (p.data.certifications || []).length +
        " certification(s)</span>" +
        (p.hasPortfolio
          ? '<button class="icon-btn danger" data-delete-portfolio="' +
            escapeHtml(p.email) +
            '" title="Delete portfolio">🗑️</button>'
          : '<span class="mini-sub">—</span>') +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  grid.querySelectorAll("[data-delete-portfolio]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-delete-portfolio");
      if (
        !confirm(
          "Delete the portfolio content for " +
            email +
            "? The student account itself will stay.",
        )
      )
        return;
      deletePortfolio(email);
      showToast("Portfolio deleted.", "success");
      renderPortfolios(document.getElementById("portfolioSearch").value);
      refreshSidebarCounts();
    });
  });
}

document
  .getElementById("portfolioSearch")
  .addEventListener("input", function () {
    renderPortfolios(this.value);
  });

// ==================================================================
// SUPPORT INBOX
// ==================================================================
var activeThreadKey = null;

function renderInbox() {
  var convos = getSupportConversations();
  var listEl = document.getElementById("inboxList");
  var emptyState = document.getElementById("inboxEmptyState");

  if (!convos.length) {
    listEl.innerHTML =
      '<div class="empty-state">No support conversations yet.</div>';
    document.getElementById("inboxThread").innerHTML =
      '<div class="inbox-placeholder">Select a conversation to view messages.</div>';
    return;
  }

  listEl.innerHTML = convos
    .map(function (c) {
      var user = findUserByEmail(c.studentEmail);
      var name = user ? user.name : c.studentEmail;
      var last = c.thread[c.thread.length - 1];
      return (
        '<div class="inbox-item' +
        (c.key === activeThreadKey ? " active" : "") +
        '" data-thread-key="' +
        escapeHtml(c.key) +
        '" data-student="' +
        escapeHtml(c.studentEmail) +
        '">' +
        '<div class="mini-avatar">' +
        escapeHtml(getInitials(name)) +
        "</div>" +
        '<div class="mini-info">' +
        '<div class="mini-title">' +
        escapeHtml(name) +
        "</div>" +
        '<div class="mini-sub">' +
        escapeHtml(last.text) +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  listEl.querySelectorAll("[data-thread-key]").forEach(function (item) {
    item.addEventListener("click", function () {
      openThread(
        item.getAttribute("data-thread-key"),
        item.getAttribute("data-student"),
      );
    });
  });

  if (
    activeThreadKey &&
    convos.some(function (c) {
      return c.key === activeThreadKey;
    })
  ) {
    var current = convos.find(function (c) {
      return c.key === activeThreadKey;
    });
    renderThreadBody(current);
  }
}

function timeLabel(ts) {
  var d = new Date(ts);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
}

function openThread(key, studentEmail) {
  activeThreadKey = key;
  var thread = loadThread(key);
  renderThreadBody({ key: key, studentEmail: studentEmail, thread: thread });
  renderInbox();
}

function renderThreadBody(convo) {
  var user = findUserByEmail(convo.studentEmail);
  var name = user ? user.name : convo.studentEmail;
  var threadEl = document.getElementById("inboxThread");

  threadEl.innerHTML =
    "" +
    '<div class="inbox-thread-header">' +
    escapeHtml(name) +
    ' <span style="color:#8a8d9c;font-weight:400;">· ' +
    escapeHtml(convo.studentEmail) +
    "</span></div>" +
    '<div class="inbox-messages" id="inboxMessages"></div>' +
    '<div class="inbox-reply-bar">' +
    '<input type="text" id="inboxReplyInput" placeholder="Reply as StudentHub Support…">' +
    '<button class="btn-primary" id="inboxSendBtn">Send</button>' +
    "</div>";

  var messagesEl = document.getElementById("inboxMessages");
  var thread = loadThread(convo.key);
  messagesEl.innerHTML = thread
    .map(function (msg) {
      var isSupport = msg.from === SUPPORT_EMAIL;
      return (
        '<div class="chat-bubble ' +
        (isSupport ? "me" : "them") +
        '">' +
        '<span class="chat-text">' +
        escapeHtml(msg.text) +
        "</span>" +
        '<span class="chat-time">' +
        timeLabel(msg.time) +
        "</span>" +
        "</div>"
      );
    })
    .join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;

  function sendReply() {
    var input = document.getElementById("inboxReplyInput");
    var text = input.value.trim();
    if (!text) return;
    var updated = loadThread(convo.key);
    updated.push({ from: SUPPORT_EMAIL, text: text, time: Date.now() });
    saveThread(convo.key, updated);
    input.value = "";
    renderThreadBody(convo);
    renderInbox();
  }

  document.getElementById("inboxSendBtn").addEventListener("click", sendReply);
  document
    .getElementById("inboxReplyInput")
    .addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendReply();
    });
}

// ==================================================================
// SETTINGS
// ==================================================================
function renderSettings() {
  var creds = getAdminCredentials();
  document.getElementById("settingsEmail").value = creds.email;
}

document
  .getElementById("adminSettingsForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    var msgEl = document.getElementById("settingsMessage");
    msgEl.classList.remove("show");

    var creds = getAdminCredentials();
    var newEmail = document
      .getElementById("settingsEmail")
      .value.trim()
      .toLowerCase();
    var currentPassword = document.getElementById(
      "settingsCurrentPassword",
    ).value;
    var newPassword = document.getElementById("settingsNewPassword").value;

    if (currentPassword !== creds.password) {
      msgEl.textContent = "Current password is incorrect.";
      msgEl.className = "form-message show error";
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      msgEl.textContent = "Please enter a valid email address.";
      msgEl.className = "form-message show error";
      return;
    }
    if (newPassword && newPassword.length < 6) {
      msgEl.textContent = "New password must be at least 6 characters.";
      msgEl.className = "form-message show error";
      return;
    }

    var updated = {
      email: newEmail,
      password: newPassword ? newPassword : creds.password,
    };
    safeStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updated));

    // Keep the current session in sync with the (possibly new) admin email.
    adminSession.email = newEmail;
    safeStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession));
    document.getElementById("adminEmailLabel").textContent = newEmail;
    document.getElementById("adminAvatar").textContent =
      newEmail[0].toUpperCase();
    document.getElementById("settingsCurrentPassword").value = "";
    document.getElementById("settingsNewPassword").value = "";

    msgEl.textContent = "Admin account updated successfully.";
    msgEl.className = "form-message show success";
    showToast("Settings saved.", "success");
  });

document.getElementById("resetDataBtn").addEventListener("click", function () {
  if (
    !confirm(
      "This will permanently delete ALL students, projects, and gigs on this browser. Continue?",
    )
  )
    return;
  if (!confirm("Are you absolutely sure? This cannot be undone.")) return;

  safeStorage.removeItem(USERS_KEY);
  safeStorage.removeItem(PROJECTS_KEY);
  safeStorage.removeItem(GIGS_KEY);
  safeStorage
    .allKeys()
    .filter(function (k) {
      return (
        k.indexOf("studenthub_portfolio_") === 0 ||
        k.indexOf("studenthub_thread_") === 0
      );
    })
    .forEach(function (k) {
      safeStorage.removeItem(k);
    });

  showToast("All site data has been reset.", "success");
  refreshSidebarCounts();
  renderView("overview");
});

// ==================================================================
// LOGOUT + INIT
// ==================================================================
document.getElementById("logoutBtn").addEventListener("click", function () {
  safeStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.href = "admin-login.html";
});

(function init() {
  document.getElementById("adminEmailLabel").textContent =
    adminSession && adminSession.email ? adminSession.email : "admin";
  document.getElementById("adminAvatar").textContent = (
    adminSession && adminSession.email ? adminSession.email[0] : "A"
  ).toUpperCase();
  refreshSidebarCounts();
  goToView("overview");
})();
