// ===== StudentHub Register (demo, stored in browser localStorage) =====
// This file only handles the Register page. It saves the new account and
// immediately signs the person in, then sends them to home.html.
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

function saveUsers(users) {
  safeStorage.setItem(USERS_KEY, JSON.stringify(users));
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

// ===== REGISTER =====
function handleRegister(event) {
  event.preventDefault();

  try {
    var nameField = document.getElementById("nameField");
    var emailField = document.getElementById("emailField");
    var passwordField = document.getElementById("passwordField");
    var roleField = document.getElementById("roleField");
    var formMessage = document.getElementById("formMessage");

    var name = document.getElementById("nameInput").value.trim();
    var email = document.getElementById("emailInput").value.trim().toLowerCase();
    var password = document.getElementById("passwordInput").value;
    var role = document.getElementById("roleInput").value;

    [nameField, emailField, passwordField, roleField].forEach(clearFieldError);
    formMessage.classList.remove("show");

    var hasError = false;

    if (name.length < 2) {
      showFieldError(nameField, "Please enter your full name.");
      hasError = true;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError(emailField, "Please enter a valid email address.");
      hasError = true;
    }

    if (password.length < 6) {
      showFieldError(passwordField, "Password must be at least 6 characters.");
      hasError = true;
    }

    if (!role) {
      showFieldError(roleField, "Please select your role.");
      hasError = true;
    }

    if (hasError) return;

    var users = getUsers();

    if (users.some(function (u) { return u.email === email; })) {
      showFormMessage(formMessage, "An account with this email already exists. Try signing in instead.", "error");
      return;
    }

    users.push({ name: name, email: email, password: password, role: role });
    saveUsers(users);
    setCurrentUser({ name: name, email: email, role: role });

    showFormMessage(formMessage, storageBlocked
      ? "Account created for this session! Logging you in…"
      : "Account created! Logging you in…", "success");

    setTimeout(function () {
      window.location.href = "home.html";
    }, 900);
  } catch (err) {
    console.error("Register error:", err);
    alert("Something went wrong while registering: " + err.message);
  }
}

// ===== WIRE UP THE FORM (no inline onsubmit needed in the HTML) =====
document.addEventListener("DOMContentLoaded", function () {
  var registerForm = document.getElementById("registerForm");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);
});