// ===== StudentHub Admin Login (demo) =====
// IMPORTANT: This checks the admin credentials in the browser, which is
// NOT secure — anyone who reads this file can see the password. This is
// fine for a front-end-only class project/demo, but a real admin portal
// MUST verify credentials on a server and never ship the check to the
// client like this.

// Default admin credentials — used only the very first time the portal is
// opened. Once the admin changes their email/password from the Settings
// tab inside the dashboard, those saved credentials (below) take over.
var DEFAULT_ADMIN_EMAIL = "admin@studenthub.com";
var DEFAULT_ADMIN_PASSWORD = "Admin@2026";
var ADMIN_CREDENTIALS_KEY = "studenthub_admin_credentials";

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

// Reads the admin's current email/password. If the admin has never changed
// them from the dashboard's Settings tab, this falls back to (and saves)
// the defaults above — keeping this page in sync with admin.js.
function getAdminCredentials() {
  var raw = safeStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (raw) return JSON.parse(raw);
  var defaults = { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };
  safeStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(defaults));
  return defaults;
}

function showFieldError(fieldEl, message) {
  fieldEl.classList.add("invalid");
  var errorEl = fieldEl.querySelector(".field-error");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove("invalid");
}

function showFormMessage(el, message, type) {
  el.textContent = message;
  el.className = "form-message show " + type;
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("adminLoginForm");
  var emailField = document.getElementById("emailField");
  var passwordField = document.getElementById("passwordField");
  var formMessage = document.getElementById("formMessage");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = document.getElementById("emailInput").value.trim().toLowerCase();
    var password = document.getElementById("passwordInput").value;

    [emailField, passwordField].forEach(clearFieldError);
    formMessage.classList.remove("show");

    var hasError = false;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError(emailField, "Please enter a valid email address.");
      hasError = true;
    }
    if (!password) {
      showFieldError(passwordField, "Please enter the admin password.");
      hasError = true;
    }
    if (hasError) return;

    var creds = getAdminCredentials();
    if (email !== creds.email.toLowerCase() || password !== creds.password) {
      showFormMessage(formMessage, "Incorrect admin email or password.", "error");
      return;
    }

    safeStorage.setItem("studenthub_admin_session", JSON.stringify({ email: creds.email, loggedInAt: Date.now() }));
    showFormMessage(formMessage, "Signed in! Redirecting to the dashboard…", "success");

    setTimeout(function () {
      window.location.href = "admin.html";
    }, 700);
  });
});