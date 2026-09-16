// ===== StudentHub Projects page =====
// Students post a project needing teammates (the poster becomes the
// project's Leader). Posting generates a unique join code that only the
// leader sees/shares. Other students see two actions on each project:
//   - Contact  -> goes straight to the leader's portfolio page
//   - Join     -> asks for the join code; correct code adds them to the team

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
};

function getCurrentUser() {
  var raw = safeStorage.getItem("studenthub_current_user");
  return raw ? JSON.parse(raw) : null;
}

function logoutUser() {
  safeStorage.setItem("studenthub_current_user", "");
  localStorage.removeItem("studenthub_current_user");
  window.location.href = "login.html";
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(function (part) {
      return part[0].toUpperCase();
    })
    .slice(0, 2)
    .join("");
}

// ---------- Projects data ----------
var PROJECTS_KEY = "studenthub_projects";

function categorySlug(cat) {
  return "cat-" + cat.toLowerCase().replace(/\s+/g, "-");
}

function hoursAgo(h) {
  return Date.now() - h * 60 * 60 * 1000;
}

function findUserByEmail(email) {
  var raw = safeStorage.getItem("studenthub_users");
  var users = raw ? JSON.parse(raw) : [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email) return users[i];
  }
  return null;
}

function memberTitleFor(name, email, fallbackRole) {
  var raw = safeStorage.getItem("studenthub_portfolio_" + email);
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (parsed.title) return parsed.title;
    } catch (e) {
      /* ignore malformed data */
    }
  }
  var account = findUserByEmail(email);
  return (account && account.role) || fallbackRole || "Member";
}

function seedProjectsIfEmpty() {
  var existing = safeStorage.getItem(PROJECTS_KEY);
  if (existing) return;

  var seed = [
    {
      id: "seed-p1",
      title: "StudentHub — Campus Freelance Platform",
      category: "Web Dev",
      teamSize: 4,
      description:
        "Building the very platform you're using right now — a place for UIU students to find gigs, teammates, and showcase their work. Come build it with us!",
      rolesNeeded: ["Frontend Dev", "Backend Dev", "UI Designer"],
      leaderName: "Ananta Haider",
      leaderEmail: "ananta@uiu.ac.bd",
      members: [
        {
          name: "Ananta Haider",
          email: "ananta@uiu.ac.bd",
          title: "Full-Stack Developer",
          teamRole: "Lead",
        },
      ],
      joinCode: "SH2026X",
      createdAt: hoursAgo(6),
    },
    {
      id: "seed-p2",
      title: "Campus Events App",
      category: "Mobile",
      teamSize: 5,
      description:
        "A mobile app for students to discover and RSVP to campus events, with push notifications for their favorite clubs.",
      rolesNeeded: ["Node.js Developer", "QA Tester", "Content Writer"],
      leaderName: "Sara B.",
      leaderEmail: "sara.b@uiu.ac.bd",
      members: [
        {
          name: "Sara B.",
          email: "sara.b@uiu.ac.bd",
          title: "UI/UX Designer",
          teamRole: "Lead",
        },
        {
          name: "John T.",
          email: "john.t@uiu.ac.bd",
          title: "React Native Dev",
          teamRole: "Member",
        },
      ],
      joinCode: "EVT204",
      createdAt: hoursAgo(30),
    },
    {
      id: "seed-p3",
      title: "AI-Powered Study Assistant",
      category: "Research",
      teamSize: 4,
      description:
        "Researching and prototyping an AI tool that summarizes lecture notes and generates practice questions for exam prep.",
      rolesNeeded: ["ML/Research", "Backend Dev", "Data Collection"],
      leaderName: "Nadia K.",
      leaderEmail: "nadia@uiu.ac.bd",
      members: [
        {
          name: "Nadia K.",
          email: "nadia@uiu.ac.bd",
          title: "AI Researcher",
          teamRole: "Lead",
        },
        {
          name: "Omar F.",
          email: "omar@uiu.ac.bd",
          title: "Backend Dev",
          teamRole: "Member",
        },
      ],
      joinCode: "AI901X",
      createdAt: hoursAgo(50),
    },
    {
      id: "seed-p4",
      title: "Mental Health Chatbot",
      category: "Data",
      teamSize: 5,
      description:
        "Building a supportive chatbot trained on mental-health resources to help students find campus counseling services faster.",
      rolesNeeded: ["Data Annotator"],
      leaderName: "Priya L.",
      leaderEmail: "priya.l@uiu.ac.bd",
      members: [
        {
          name: "Priya L.",
          email: "priya.l@uiu.ac.bd",
          title: "AI Researcher",
          teamRole: "Lead",
        },
        {
          name: "David W.",
          email: "david.w@uiu.ac.bd",
          title: "Backend Dev",
          teamRole: "Member",
        },
        {
          name: "Amy C.",
          email: "amy.c@uiu.ac.bd",
          title: "Frontend Dev",
          teamRole: "Member",
        },
        {
          name: "Sam K.",
          email: "sam.k@uiu.ac.bd",
          title: "Psychologist",
          teamRole: "Advisor",
        },
      ],
      joinCode: "MHC77Q",
      createdAt: hoursAgo(80),
    },
  ];

  safeStorage.setItem(PROJECTS_KEY, JSON.stringify(seed));
}

function loadProjects() {
  var raw = safeStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveProjects(projects) {
  safeStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function timeAgo(timestamp) {
  var diffMs = Date.now() - timestamp;
  var mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  var days = Math.floor(hours / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}

function copyToClipboard(text, onDone) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(onDone)
      .catch(function () {
        fallbackCopy(text, onDone);
      });
  } else {
    fallbackCopy(text, onDone);
  }
}

function fallbackCopy(text, onDone) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {
    /* ignore */
  }
  document.body.removeChild(ta);
  if (onDone) onDone();
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
  if (headerLogout)
    headerLogout.addEventListener("click", function (e) {
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

  // ----- Projects data -----
  seedProjectsIfEmpty();
  var projects = loadProjects();
  var activeCategory = "All";

  var projectsGrid = document.getElementById("projectsGrid");
  var projectsSubtitle = document.getElementById("projectsSubtitle");
  var filterPills = document.getElementById("filterPills");

  function isMember(project, email) {
    return project.members.some(function (m) {
      return m.email === email;
    });
  }

  function renderProjects() {
    var sorted = projects.slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    var filtered =
      activeCategory === "All"
        ? sorted
        : sorted.filter(function (p) {
            return p.category === activeCategory;
          });

    var openCount = projects.filter(function (p) {
      return p.members.length < p.teamSize;
    }).length;
    projectsSubtitle.textContent =
      openCount +
      (openCount === 1
        ? " project looking for teammates"
        : " projects looking for teammates");

    projectsGrid.innerHTML = "";

    if (filtered.length === 0) {
      projectsGrid.innerHTML =
        '<p class="empty-hint">No projects in this category yet. Be the first to post one!</p>';
      return;
    }

    filtered.forEach(function (project) {
      var full = project.members.length >= project.teamSize;
      var youAreLeader = project.leaderEmail === user.email;
      var youAreMember = isMember(project, user.email);

      var card = document.createElement("div");
      card.className = "project-card";

      card.innerHTML =
        '<div class="project-top">' +
        '<span class="badge ' +
        categorySlug(project.category) +
        '"></span>' +
        '<span class="team-progress' +
        (full ? " full" : "") +
        '"></span>' +
        "</div>" +
        '<h3 class="project-title"></h3>' +
        '<p class="project-desc"></p>' +
        '<div class="project-footer">' +
        '<div class="project-meta leader-badge"><span class="crown">👑</span> Led by <b></b> · <span class="time"></span></div>' +
        '<button type="button" class="details-btn">Project Details</button>' +
        "</div>";

      card.querySelector(".badge").textContent = project.category;
      card.querySelector(".team-progress").textContent =
        project.members.length +
        "/" +
        project.teamSize +
        (full ? " (Full)" : " members");
      card.querySelector(".project-title").textContent = project.title;
      card.querySelector(".project-desc").textContent = project.description;
      card.querySelector(".leader-badge b").textContent = project.leaderName;
      card.querySelector(".time").textContent = timeAgo(project.createdAt);

      card.querySelector(".details-btn").addEventListener("click", function () {
        openProjectDetails(project);
      });

      projectsGrid.appendChild(card);
    });
  }

  // ----- Project Details panel -----
  var detailsOverlay = document.getElementById("projectDetailsOverlay");
  var detailsCloseBtn = document.getElementById("detailsCloseBtn");
  var detailsTitle = document.getElementById("detailsTitle");
  var detailsBadge = document.getElementById("detailsBadge");
  var detailsProgress = document.getElementById("detailsProgress");
  var detailsDesc = document.getElementById("detailsDesc");
  var detailsRoles = document.getElementById("detailsRoles");
  var detailsLeaderName = document.getElementById("detailsLeaderName");
  var detailsTime = document.getElementById("detailsTime");
  var detailsActions = document.getElementById("detailsActions");

  function closeProjectDetails() {
    detailsOverlay.classList.add("hidden");
  }

  function openProjectDetails(project) {
    var full = project.members.length >= project.teamSize;
    var youAreLeader = project.leaderEmail === user.email;
    var youAreMember = isMember(project, user.email);

    detailsTitle.textContent = project.title;
    detailsBadge.className = "badge " + categorySlug(project.category);
    detailsBadge.textContent = project.category;
    detailsProgress.className = "team-progress" + (full ? " full" : "");
    detailsProgress.textContent =
      project.members.length +
      "/" +
      project.teamSize +
      (full ? " (Full)" : " members");
    detailsDesc.textContent = project.description;
    detailsLeaderName.textContent = project.leaderName;
    detailsTime.textContent = timeAgo(project.createdAt);

    detailsRoles.innerHTML = "";
    if (project.rolesNeeded && project.rolesNeeded.length) {
      project.rolesNeeded.forEach(function (role) {
        var chip = document.createElement("span");
        chip.className = "role-chip";
        chip.textContent = role;
        detailsRoles.appendChild(chip);
      });
    } else {
      detailsRoles.innerHTML =
        '<span class="field-hint">No specific roles listed.</span>';
    }

    detailsActions.innerHTML = "";

    if (youAreLeader) {
      var chip = document.createElement("div");
      chip.className = "leader-code-chip";
      chip.innerHTML = '🔑 <span></span><button type="button">Copy</button>';
      chip.querySelector("span").textContent = project.joinCode;
      chip.querySelector("button").addEventListener("click", function () {
        var btn = chip.querySelector("button");
        copyToClipboard(project.joinCode, function () {
          btn.textContent = "Copied!";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1500);
        });
      });
      detailsActions.appendChild(chip);
    } else {
      var actionsWrap = document.createElement("div");
      actionsWrap.className = "action-buttons";

      var contactBtn = document.createElement("button");
      contactBtn.type = "button";
      contactBtn.className = "contact-btn";
      contactBtn.textContent = "Contact";
      contactBtn.addEventListener("click", function () {
        window.location.href =
          "portfolio.html?user=" + encodeURIComponent(project.leaderEmail);
      });
      actionsWrap.appendChild(contactBtn);

      var joinBtn = document.createElement("button");
      joinBtn.type = "button";
      joinBtn.className = "join-btn";

      if (youAreMember) {
        joinBtn.textContent = "✓ Joined";
        joinBtn.classList.add("joined");
        joinBtn.disabled = true;
      } else if (full) {
        joinBtn.textContent = "Team Full";
        joinBtn.disabled = true;
      } else {
        joinBtn.textContent = "Join";
        joinBtn.addEventListener("click", function () {
          closeProjectDetails();
          openJoinCodeModal(project);
        });
      }
      actionsWrap.appendChild(joinBtn);

      detailsActions.appendChild(actionsWrap);
    }

    detailsOverlay.classList.remove("hidden");
  }

  detailsCloseBtn.addEventListener("click", closeProjectDetails);
  detailsOverlay.addEventListener("click", function (e) {
    if (e.target === detailsOverlay) closeProjectDetails();
  });

  filterPills.addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    filterPills.querySelectorAll(".pill").forEach(function (p) {
      p.classList.remove("active");
    });
    btn.classList.add("active");
    renderProjects();
  });

  // ----- Post a Project modal -----
  var overlay = document.getElementById("postProjectOverlay");
  var postProjectBtn = document.getElementById("postProjectBtn");
  var modalCloseBtn = document.getElementById("modalCloseBtn");
  var modalCancelBtn = document.getElementById("modalCancelBtn");
  var postProjectForm = document.getElementById("postProjectForm");
  var postSuccess = document.getElementById("postSuccess");
  var generatedCodeEl = document.getElementById("generatedCode");
  var copyCodeBtn = document.getElementById("copyCodeBtn");
  var postSuccessDoneBtn = document.getElementById("postSuccessDoneBtn");

  var titleField = document.getElementById("titleField");
  var categoryField = document.getElementById("categoryField");
  var teamSizeField = document.getElementById("teamSizeField");
  var descField = document.getElementById("descField");
  var setJoinCodeField = document.getElementById("setJoinCodeField");

  function openModal() {
    postProjectForm.classList.remove("hidden");
    postSuccess.classList.add("hidden");
    overlay.classList.remove("hidden");
  }

  function closeModal() {
    overlay.classList.add("hidden");
    postProjectForm.reset();
    postProjectForm.classList.remove("hidden");
    postSuccess.classList.add("hidden");
    [
      titleField,
      categoryField,
      teamSizeField,
      descField,
      setJoinCodeField,
    ].forEach(function (f) {
      f.classList.remove("invalid");
    });
  }

  postProjectBtn.addEventListener("click", openModal);
  modalCloseBtn.addEventListener("click", closeModal);
  modalCancelBtn.addEventListener("click", closeModal);
  postSuccessDoneBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  if (window.location.hash === "#post-project") {
    openModal();
  }

  copyCodeBtn.addEventListener("click", function () {
    copyToClipboard(generatedCodeEl.textContent, function () {
      copyCodeBtn.textContent = "Copied!";
      copyCodeBtn.classList.add("copied");
      setTimeout(function () {
        copyCodeBtn.textContent = "Copy";
        copyCodeBtn.classList.remove("copied");
      }, 1500);
    });
  });

  postProjectForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var title = document.getElementById("titleInput").value.trim();
    var category = document.getElementById("categoryInput").value;
    var teamSize = document.getElementById("teamSizeInput").value;
    var description = document.getElementById("descInput").value.trim();
    var rolesRaw = document.getElementById("rolesInput").value.trim();
    var joinCode = document.getElementById("setJoinCodeInput").value.trim();

    [
      titleField,
      categoryField,
      teamSizeField,
      descField,
      setJoinCodeField,
    ].forEach(function (f) {
      f.classList.remove("invalid");
    });

    var hasError = false;
    if (!title) {
      titleField.classList.add("invalid");
      hasError = true;
    }
    if (!category) {
      categoryField.classList.add("invalid");
      hasError = true;
    }
    if (!teamSize || Number(teamSize) < 1) {
      teamSizeField.classList.add("invalid");
      hasError = true;
    }
    if (!description) {
      descField.classList.add("invalid");
      hasError = true;
    }
    if (!joinCode || joinCode.length < 4) {
      setJoinCodeField.classList.add("invalid");
      hasError = true;
    }
    if (hasError) return;

    var rolesNeeded = rolesRaw
      ? rolesRaw
          .split(",")
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean)
      : [];

    var newProject = {
      id: "project-" + Date.now(),
      title: title,
      category: category,
      teamSize: Number(teamSize),
      description: description,
      rolesNeeded: rolesNeeded,
      leaderName: user.name,
      leaderEmail: user.email,
      members: [
        {
          name: user.name,
          email: user.email,
          title: memberTitleFor(user.name, user.email, user.role),
          teamRole: "Lead",
        },
      ],
      joinCode: joinCode,
      createdAt: Date.now(),
    };

    projects.unshift(newProject);
    saveProjects(projects);

    activeCategory = "All";
    filterPills.querySelectorAll(".pill").forEach(function (p) {
      p.classList.remove("active");
    });
    filterPills.querySelector('[data-category="All"]').classList.add("active");

    renderProjects();

    // Show the success view (confirming the join code they set) instead of closing right away.
    postProjectForm.classList.add("hidden");
    generatedCodeEl.textContent = joinCode;
    postSuccess.classList.remove("hidden");
  });

  // ----- Join Code modal -----
  var joinOverlay = document.getElementById("joinCodeOverlay");
  var joinCodeForm = document.getElementById("joinCodeForm");
  var joinCodeField = document.getElementById("joinCodeField");
  var joinCodeInput = document.getElementById("joinCodeInput");
  var joinModalTitle = document.getElementById("joinModalTitle");
  var joinModalCloseBtn = document.getElementById("joinModalCloseBtn");
  var joinModalCancelBtn = document.getElementById("joinModalCancelBtn");

  var pendingJoinProject = null;

  function openJoinCodeModal(project) {
    pendingJoinProject = project;
    joinModalTitle.textContent = 'Join "' + project.title + '"';
    joinCodeInput.value = "";
    joinCodeField.classList.remove("invalid");
    joinOverlay.classList.remove("hidden");
    joinCodeInput.focus();
  }

  function closeJoinCodeModal() {
    joinOverlay.classList.add("hidden");
    pendingJoinProject = null;
    joinCodeForm.reset();
    joinCodeField.classList.remove("invalid");
  }

  joinModalCloseBtn.addEventListener("click", closeJoinCodeModal);
  joinModalCancelBtn.addEventListener("click", closeJoinCodeModal);
  joinOverlay.addEventListener("click", function (e) {
    if (e.target === joinOverlay) closeJoinCodeModal();
  });

  joinCodeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!pendingJoinProject) return;

    var entered = joinCodeInput.value.trim().toUpperCase();
    var correct = pendingJoinProject.joinCode.toUpperCase();

    if (entered !== correct) {
      joinCodeField.classList.add("invalid");
      return;
    }

    pendingJoinProject.members.push({
      name: user.name,
      email: user.email,
      title: memberTitleFor(user.name, user.email, user.role),
      teamRole: "Member",
    });
    saveProjects(projects);
    renderProjects();

    closeJoinCodeModal();

    window.location.href = "team.html";
  });

  // ----- Initial render -----
  renderProjects();
});
