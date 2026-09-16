// ===== StudentHub Gigs page =====
// Browsing + filtering the shared gig marketplace, and posting a new gig
// through a panel modal. Gigs are stored in localStorage and shared across
// everyone using this browser (a real backend would make them shared across
// all users/devices — this demo only shares them within one browser).

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
  },
  setItem: function (key, value) {
    if (storageBlocked) { memoryFallback[key] = value; } else { localStorage.setItem(key, value); }
  }
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
    .map(function (part) { return part[0].toUpperCase(); })
    .slice(0, 2)
    .join("");
}

// ---------- Gigs data ----------
var GIGS_KEY = "studenthub_gigs";

function categorySlug(cat) {
  return "cat-" + cat.toLowerCase().replace(/\s+/g, "-");
}

function hoursAgo(h) {
  return Date.now() - h * 60 * 60 * 1000;
}

function seedGigsIfEmpty() {
  var existing = safeStorage.getItem(GIGS_KEY);
  if (existing) return;

  var seed = [
    {
      id: "seed-1", title: "React Frontend Developer", category: "Web Dev", urgent: true,
      price: 120, description: "Need a skilled frontend dev to build a responsive dashboard. Figma designs ready.",
      tags: ["React", "TypeScript", "Tailwind"], postedBy: "Rahul M.", postedAt: hoursAgo(2)
    },
    {
      id: "seed-2", title: "Research Assistant — Data Collection", category: "Research", urgent: false,
      price: 80, description: "Looking for help collecting and cleaning survey data for a thesis project.",
      tags: ["Excel", "Python", "SPSS"], postedBy: "Nadia K.", postedAt: hoursAgo(5)
    },
    {
      id: "seed-3", title: "Graphic Designer — Social Media Kit", category: "Design", urgent: true,
      price: 150, description: "Create a complete visual identity with 20+ social media templates. Brand guidelines provided.",
      tags: ["Figma", "Illustrator", "Canva"], postedBy: "Tariq S.", postedAt: hoursAgo(24)
    },
    {
      id: "seed-4", title: "Content Writer for Tech Blog", category: "Writing", urgent: false,
      price: 60, description: "Write 4 long-form articles about AI trends. SEO experience preferred.",
      tags: ["SEO", "Content", "Research"], postedBy: "Priya L.", postedAt: hoursAgo(48)
    },
    {
      id: "seed-5", title: "Python Data Analysis", category: "Data", urgent: false,
      price: 100, description: "Analyze e-commerce sales dataset and produce visualizations. Jupyter Notebook.",
      tags: ["Python", "Pandas", "Matplotlib"], postedBy: "Omar F.", postedAt: hoursAgo(72)
    },
    {
      id: "seed-6", title: "Mobile App UI in Figma", category: "Design", urgent: true,
      price: 200, description: "Design complete UI for a food delivery app. 15+ screens, dark and light mode.",
      tags: ["Figma", "UI/UX", "Prototyping"], postedBy: "Sara B.", postedAt: hoursAgo(96)
    }
  ];

  safeStorage.setItem(GIGS_KEY, JSON.stringify(seed));
}

function loadGigs() {
  var raw = safeStorage.getItem(GIGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveGigs(gigs) {
  safeStorage.setItem(GIGS_KEY, JSON.stringify(gigs));
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

  // ----- Gigs data -----
  seedGigsIfEmpty();
  var gigs = loadGigs();
  var activeCategory = "All";

  var gigsGrid = document.getElementById("gigsGrid");
  var gigsSubtitle = document.getElementById("gigsSubtitle");
  var filterPills = document.getElementById("filterPills");

  function renderGigs() {
    var sorted = gigs.slice().sort(function (a, b) { return b.postedAt - a.postedAt; });
    var filtered = activeCategory === "All"
      ? sorted
      : sorted.filter(function (g) { return g.category === activeCategory; });

    gigsSubtitle.textContent = gigs.length + (gigs.length === 1 ? " opportunity waiting for you" : " opportunities waiting for you");

    gigsGrid.innerHTML = "";

    if (filtered.length === 0) {
      gigsGrid.innerHTML = '<p class="empty-hint">No gigs in this category yet. Be the first to post one!</p>';
      return;
    }

    filtered.forEach(function (gig) {
      var card = document.createElement("div");
      card.className = "gig-card";

      var badgesHtml = '<span class="badge ' + categorySlug(gig.category) + '"></span>';
      if (gig.urgent) badgesHtml += '<span class="badge urgent">URGENT</span>';

      var tagsHtml = (gig.tags || []).map(function () { return '<span class="tag"></span>'; }).join("");

      card.innerHTML =
        '<div class="gig-top">' +
        '<div class="gig-badges">' + badgesHtml + '</div>' +
        '<div class="gig-price"></div>' +
        '</div>' +
        '<h3 class="gig-title"></h3>' +
        '<p class="gig-desc"></p>' +
        '<div class="gig-tags">' + tagsHtml + '</div>' +
        '<div class="gig-footer">' +
        '<div class="gig-meta">by <b></b> · <span class="time"></span></div>' +
        '<button class="apply-btn" type="button">Apply Now</button>' +
        '</div>';

      card.querySelector(".badge:not(.urgent)").textContent = gig.category;
      card.querySelector(".gig-price").textContent = "$" + gig.price;
      card.querySelector(".gig-title").textContent = gig.title;
      card.querySelector(".gig-desc").textContent = gig.description;

      var tagEls = card.querySelectorAll(".tag");
      (gig.tags || []).forEach(function (tag, i) { tagEls[i].textContent = tag; });

      card.querySelector(".gig-meta b").textContent = gig.postedBy;
      card.querySelector(".gig-meta .time").textContent = timeAgo(gig.postedAt);

      card.querySelector(".apply-btn").addEventListener("click", function () {
        alert('Your interest in "' + gig.title + '" has been noted. (This demo has no backend to actually send applications yet.)');
      });

      gigsGrid.appendChild(card);
    });
  }

  filterPills.addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    filterPills.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    renderGigs();
  });

  // ----- Post a Gig modal -----
  var overlay = document.getElementById("postGigOverlay");
  var postGigBtn = document.getElementById("postGigBtn");
  var modalCloseBtn = document.getElementById("modalCloseBtn");
  var modalCancelBtn = document.getElementById("modalCancelBtn");
  var postGigForm = document.getElementById("postGigForm");

  var titleField = document.getElementById("titleField");
  var categoryField = document.getElementById("categoryField");
  var priceField = document.getElementById("priceField");
  var descField = document.getElementById("descField");

  function openModal() {
    overlay.classList.remove("hidden");
  }

  function closeModal() {
    overlay.classList.add("hidden");
    postGigForm.reset();
    [titleField, categoryField, priceField, descField].forEach(function (f) {
      f.classList.remove("invalid");
    });
  }

  postGigBtn.addEventListener("click", openModal);
  modalCloseBtn.addEventListener("click", closeModal);
  modalCancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  // Open automatically if arrived via "Post a Gig" in the header dropdown
  if (window.location.hash === "#post-gig") {
    openModal();
  }

  postGigForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var title = document.getElementById("titleInput").value.trim();
    var category = document.getElementById("categoryInput").value;
    var price = document.getElementById("priceInput").value;
    var description = document.getElementById("descInput").value.trim();
    var tagsRaw = document.getElementById("tagsInput").value.trim();
    var urgent = document.getElementById("urgentInput").checked;

    [titleField, categoryField, priceField, descField].forEach(function (f) {
      f.classList.remove("invalid");
    });

    var hasError = false;
    if (!title) { titleField.classList.add("invalid"); hasError = true; }
    if (!category) { categoryField.classList.add("invalid"); hasError = true; }
    if (!price || Number(price) <= 0) { priceField.classList.add("invalid"); hasError = true; }
    if (!description) { descField.classList.add("invalid"); hasError = true; }
    if (hasError) return;

    var tags = tagsRaw ? tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean) : [];

    var newGig = {
      id: "gig-" + Date.now(),
      title: title,
      category: category,
      urgent: urgent,
      price: Number(price),
      description: description,
      tags: tags,
      postedBy: user.name,
      postedAt: Date.now()
    };

    gigs.unshift(newGig);
    saveGigs(gigs);

    activeCategory = "All";
    filterPills.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("active"); });
    filterPills.querySelector('[data-category="All"]').classList.add("active");

    renderGigs();
    closeModal();
  });

  // ----- Initial render -----
  renderGigs();
});