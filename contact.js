// ===== StudentHub Contact page =====
// Two modes:
// 1) Arriving via "Hire Me" (contact.html?to=<email>&name=<name>) shows a
//    message form. Sending it opens a real email (mailto:) addressed to
//    that person, pre-filled with the visitor's email and message.
// 2) The default Contact page shows general info plus a "Contact Support"
//    button that opens a simple chat panel between the signed-in user and
//    StudentHub Support (saved in localStorage so it persists on this
//    browser).

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

function showFieldError(fieldEl, message) {
  fieldEl.classList.add("invalid");
  var errorEl = fieldEl.querySelector(".field-error");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove("invalid");
}

// ---------- Message thread storage (used for both person-to-person logs and Support chat) ----------
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

  // ----- Decide which section to show -----
  var params = new URLSearchParams(window.location.search);
  var toEmail = params.get("to");
  var toName = params.get("name");

  var personalSection = document.getElementById("personalContactSection");
  var defaultSection = document.getElementById("defaultContactSection");

  if (toEmail) {
    // ===== PERSON-TO-PERSON MESSAGE FORM =====
    defaultSection.style.display = "none";
    personalSection.style.display = "block";

    document.getElementById("recipientAvatar").textContent = getInitials(toName || toEmail);
    document.getElementById("recipientName").textContent = toName || toEmail;
    document.getElementById("yourEmailInput").value = user.email;

    var form = document.getElementById("personalContactForm");
    var yourEmailField = document.getElementById("yourEmailField");
    var messageField = document.getElementById("messageField");
    var formMessage = document.getElementById("personalFormMessage");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var yourEmail = document.getElementById("yourEmailInput").value.trim();
      var message = document.getElementById("messageInput").value.trim();

      [yourEmailField, messageField].forEach(clearFieldError);
      formMessage.classList.remove("show");

      var hasError = false;
      if (!/^\S+@\S+\.\S+$/.test(yourEmail)) {
        showFieldError(yourEmailField, "Please enter a valid email address.");
        hasError = true;
      }
      if (!message) {
        showFieldError(messageField, "Please write a message.");
        hasError = true;
      }
      if (hasError) return;

      // Log it in a shared thread (so it can be seen again later, e.g. in a future inbox feature)
      var key = threadKey(user.email, toEmail);
      var thread = loadThread(key);
      thread.push({ from: yourEmail, text: message, time: Date.now() });
      saveThread(key, thread);

      // Open a real email addressed to the recipient, from the visitor's own email client
      var subject = encodeURIComponent("Message from " + user.name + " via StudentHub");
      var body = encodeURIComponent(message + "\n\n— " + user.name + " (" + yourEmail + ")");
      window.location.href = "mailto:" + toEmail + "?subject=" + subject + "&body=" + body;

      formMessage.textContent = "Opening your email client to send this to " + (toName || toEmail) + "…";
      formMessage.className = "form-message show success";
      form.reset();
      document.getElementById("yourEmailInput").value = user.email;
    });

  } else {
    // ===== DEFAULT CONTACT PAGE + SUPPORT CHAT =====
    var SUPPORT_EMAIL = "support@studenthub.local";
    var supportToggleBtn = document.getElementById("supportToggleBtn");
    var supportCard = document.getElementById("supportCard");
    var chatMessages = document.getElementById("chatMessages");
    var chatInput = document.getElementById("chatInput");
    var chatSendBtn = document.getElementById("chatSendBtn");
    var chatKey = threadKey(user.email, SUPPORT_EMAIL);

    function timeLabel(ts) {
      var d = new Date(ts);
      var h = d.getHours();
      var m = d.getMinutes();
      var ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return h + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
    }

    function renderChat() {
      var thread = loadThread(chatKey);
      chatMessages.innerHTML = "";

      if (thread.length === 0) {
        chatMessages.innerHTML = '<p class="chat-empty-hint">Say hi to Support — ask about gigs, projects, or your account.</p>';
        return;
      }

      thread.forEach(function (msg) {
        var isMe = msg.from === user.email;
        var bubble = document.createElement("div");
        bubble.className = "chat-bubble " + (isMe ? "me" : "them");
        bubble.innerHTML = '<span class="chat-text"></span><span class="chat-time"></span>';
        bubble.querySelector(".chat-text").textContent = msg.text;
        bubble.querySelector(".chat-time").textContent = timeLabel(msg.time);
        chatMessages.appendChild(bubble);
      });

      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChatMessage() {
      var text = chatInput.value.trim();
      if (!text) return;

      var thread = loadThread(chatKey);
      thread.push({ from: user.email, text: text, time: Date.now() });
      saveThread(chatKey, thread);
      chatInput.value = "";
      renderChat();

      // A light, canned auto-reply so the chat feels alive in this demo (no real backend).
      setTimeout(function () {
        var latest = loadThread(chatKey);
        latest.push({
          from: SUPPORT_EMAIL,
          text: "Thanks for reaching out! A StudentHub team member will follow up here soon.",
          time: Date.now()
        });
        saveThread(chatKey, latest);
        renderChat();
      }, 900);
    }

    supportToggleBtn.addEventListener("click", function () {
      var isOpen = supportCard.style.display !== "none";
      supportCard.style.display = isOpen ? "none" : "block";
      supportToggleBtn.textContent = isOpen ? "💬 Contact Support" : "✕ Close Chat";
      if (!isOpen) renderChat();
    });

    chatSendBtn.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendChatMessage();
    });
  }
});