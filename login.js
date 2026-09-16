// ===== StudentHub Login (demo, stored in browser localStorage) =====
// This file only handles the Sign In page. It checks the email/password
// against accounts that were saved by register.html.
//
// NOTE: This is a front-end only demo. Passwords are stored in plain text
// in the browser's localStorage, which is fine for learning/demo purposes
// but should NEVER be done in a real production site. A real site must
// hash passwords and check them on a server.

// Safe wrapper around localStorage: falls back to an in-memory object if
// localStorage is blocked (e.g. some strict browser privacy modes), so the
// page still works for the current visit instead of breaking completely.
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

var USERS_KEY = "studenthub_users";

function getUsers() {
  var raw = safeStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setCurrentUser(user) {
  safeStorage.setItem("studenthub_current_user", JSON.stringify(user));
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

// ===== LOGIN =====
function handleLogin(event) {
  event.preventDefault();

  try {
    var emailField = document.getElementById("emailField");
    var passwordField = document.getElementById("passwordField");
    var formMessage = document.getElementById("formMessage");

    var email = document.getElementById("emailInput").value.trim().toLowerCase();
    var password = document.getElementById("passwordInput").value;

    [emailField, passwordField].forEach(clearFieldError);
    formMessage.classList.remove("show");

    var hasError = false;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError(emailField, "Please enter a valid email address.");
      hasError = true;
    }

    if (password.length === 0) {
      showFieldError(passwordField, "Please enter your password.");
      hasError = true;
    }

    if (hasError) return;

    var users = getUsers();
    var match = users.find(function (u) {
      return u.email === email && u.password === password;
    });

    if (!match) {
      showFormMessage(formMessage, "No matching account found. Check your email/password, or register first.", "error");
      return;
    }

    setCurrentUser({ name: match.name, email: match.email, role: match.role });
    showFormMessage(formMessage, "Signed in! Redirecting…", "success");

    setTimeout(function () {
      window.location.href = "home.html";
    }, 900);
  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong while signing in: " + err.message);
  }
}

// ===== WIRE UP THE FORM (no inline onsubmit needed in the HTML) =====
document.addEventListener("DOMContentLoaded", function () {
  var loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
});