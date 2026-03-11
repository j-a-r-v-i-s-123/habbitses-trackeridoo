const AUTH_API = "/api/auth";
const HABITS_API = "/api/habits";

const COLORS = ["#5b4fcf", "#e74c3c", "#27ae60", "#f39c12", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#2c3e50", "#e91e63"];
const ICONS = [
  { id: "star", emoji: "\u2b50" },
  { id: "fire", emoji: "\ud83d\udd25" },
  { id: "book", emoji: "\ud83d\udcda" },
  { id: "run", emoji: "\ud83c\udfc3" },
  { id: "water", emoji: "\ud83d\udca7" },
  { id: "sleep", emoji: "\ud83d\ude34" },
  { id: "food", emoji: "\ud83e\udd57" },
  { id: "meditate", emoji: "\ud83e\uddd8" },
  { id: "music", emoji: "\ud83c\udfb5" },
  { id: "code", emoji: "\ud83d\udcbb" },
  { id: "heart", emoji: "\u2764\ufe0f" },
  { id: "gym", emoji: "\ud83c\udfcb\ufe0f" },
];
const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

// State
let showArchived = false;
let habitsCache = [];

// DOM
const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const alertEl = document.getElementById("alert");
const tabs = document.querySelectorAll(".tab");
const modalRoot = document.getElementById("modal-root");

// --- Auth helpers ---
function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + getToken(),
  };
}

// --- UI helpers ---
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(id, msg) {
  var el = document.getElementById(id);
  var input = el.previousElementSibling;
  el.textContent = msg;
  el.classList.remove("hidden");
  if (input) input.classList.add("error");
}

function clearErrors() {
  document.querySelectorAll(".error-text").forEach(function (el) {
    el.classList.add("hidden");
    el.textContent = "";
  });
  document.querySelectorAll("input.error").forEach(function (el) {
    el.classList.remove("error");
  });
}

function showAlert(msg, type) {
  alertEl.textContent = msg;
  alertEl.className = "alert alert-" + type;
  alertEl.classList.remove("hidden");
}

function hideAlert() {
  alertEl.classList.add("hidden");
}

function getIconEmoji(iconId) {
  var icon = ICONS.find(function (i) { return i.id === iconId; });
  return icon ? icon.emoji : "\u2b50";
}

function formatFrequency(freq) {
  if (freq === "daily") return "Daily";
  if (freq === "weekly") return "Weekly";
  return freq.split(",").map(function (d) {
    var t = d.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }).join(", ");
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Tab switching ---
tabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    var target = tab.dataset.tab;
    tabs.forEach(function (t) { t.classList.remove("active"); });
    tab.classList.add("active");
    clearErrors();
    hideAlert();
    if (target === "login") {
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    } else {
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
    }
  });
});

// --- Auth: Login ---
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearErrors();
  hideAlert();

  var email = document.getElementById("login-email").value.trim();
  var password = document.getElementById("login-password").value;
  var valid = true;

  if (!email || !validateEmail(email)) {
    showFieldError("login-email-error", "Please enter a valid email");
    valid = false;
  }
  if (!password) {
    showFieldError("login-password-error", "Password is required");
    valid = false;
  }
  if (!valid) return;

  var btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    var res = await fetch(AUTH_API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email, password: password }),
    });
    var data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Login failed", "error");
      return;
    }
    localStorage.setItem("token", data.token);
    showDashboard(data.user);
  } catch (err) {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});

// --- Auth: Register ---
registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearErrors();
  hideAlert();

  var name = document.getElementById("register-name").value.trim();
  var email = document.getElementById("register-email").value.trim();
  var password = document.getElementById("register-password").value;
  var confirm = document.getElementById("register-confirm").value;
  var valid = true;

  if (!email || !validateEmail(email)) {
    showFieldError("register-email-error", "Please enter a valid email");
    valid = false;
  }
  if (!password || password.length < 8) {
    showFieldError("register-password-error", "Password must be at least 8 characters");
    valid = false;
  }
  if (password !== confirm) {
    showFieldError("register-confirm-error", "Passwords do not match");
    valid = false;
  }
  if (!valid) return;

  var btn = document.getElementById("register-btn");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    var res = await fetch(AUTH_API + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email, password: password, name: name || undefined }),
    });
    var data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Registration failed", "error");
      return;
    }
    localStorage.setItem("token", data.token);
    showDashboard(data.user);
  } catch (err) {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});

// --- Auth: Logout ---
document.getElementById("logout-btn").addEventListener("click", async function () {
  try {
    await fetch(AUTH_API + "/logout", { method: "POST", credentials: "include" });
  } catch (err) { /* ignore */ }
  localStorage.removeItem("token");
  showAuth();
});

// --- Navigation ---
function showDashboard(user) {
  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  document.getElementById("user-badge").textContent = user.email;
  loadHabits();
}

function showAuth() {
  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  clearErrors();
  hideAlert();
  loginForm.reset();
  registerForm.reset();
}

// --- Habits API ---
async function loadHabits() {
  try {
    var url = showArchived ? HABITS_API + "?archived=true" : HABITS_API;
    var res = await fetch(url, { headers: authHeaders(), credentials: "include" });
    if (!res.ok) throw new Error("Failed to load habits");
    var data = await res.json();
    habitsCache = data.habits;
    renderHabits(data.habits);
  } catch (err) {
    console.error("Load habits error:", err);
  }
}

async function createHabit(habitData) {
  var res = await fetch(HABITS_API, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(habitData),
  });
  if (!res.ok) {
    var data = await res.json();
    throw new Error(data.error || "Failed to create habit");
  }
  return (await res.json()).habit;
}

async function updateHabit(id, habitData) {
  var res = await fetch(HABITS_API + "/" + id, {
    method: "PUT",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(habitData),
  });
  if (!res.ok) {
    var data = await res.json();
    throw new Error(data.error || "Failed to update habit");
  }
  return (await res.json()).habit;
}

async function deleteHabit(id) {
  var res = await fetch(HABITS_API + "/" + id, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete habit");
}

// --- Render habits ---
function renderHabits(habits) {
  var list = document.getElementById("habit-list");
  var empty = document.getElementById("empty-state");

  if (habits.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = habits.map(function (h) {
    return '<li class="habit-item' + (h.archived ? ' habit-archived' : '') + '" data-id="' + h.id + '">' +
      '<div class="habit-icon" style="background:' + h.color + '">' + getIconEmoji(h.icon) + '</div>' +
      '<div class="habit-info">' +
        '<div class="habit-name">' + escapeHtml(h.name) + '</div>' +
        (h.description ? '<div class="habit-desc">' + escapeHtml(h.description) + '</div>' : '') +
        '<div class="habit-freq">' + formatFrequency(h.frequency) + (h.archived ? ' &middot; Archived' : '') + '</div>' +
      '</div>' +
      '<div class="habit-actions">' +
        '<button class="icon-btn" onclick="openEditModal(\'' + h.id + '\')" title="Edit">&#9998;</button>' +
        '<button class="icon-btn" onclick="toggleArchive(\'' + h.id + '\', ' + !h.archived + ')" title="' + (h.archived ? 'Unarchive' : 'Archive') + '">&#128230;</button>' +
        '<button class="icon-btn" onclick="openDeleteConfirm(\'' + h.id + '\', \'' + escapeHtml(h.name).replace(/'/g, "\\'") + '\')" title="Delete">&#128465;</button>' +
      '</div>' +
    '</li>';
  }).join("");
}

// --- Toggle archived ---
document.getElementById("toggle-archived").addEventListener("click", function () {
  showArchived = !showArchived;
  document.getElementById("toggle-archived").textContent = showArchived ? "Hide archived" : "Show archived";
  loadHabits();
});

// --- Add habit ---
document.getElementById("add-habit-btn").addEventListener("click", function () {
  openHabitFormModal();
});

// --- Modals ---
function closeModal() {
  modalRoot.innerHTML = "";
}

function openHabitFormModal(habit) {
  var isEdit = !!habit;
  var title = isEdit ? "Edit Habit" : "New Habit";
  var selectedColor = habit ? habit.color : COLORS[0];
  var selectedIcon = habit ? habit.icon : ICONS[0].id;
  var selectedFreq = habit ? habit.frequency : "daily";

  var colorSwatches = COLORS.map(function (c) {
    return '<div class="color-swatch' + (c === selectedColor ? ' selected' : '') + '" data-color="' + c + '" style="background:' + c + '"></div>';
  }).join("");

  var iconOptions = ICONS.map(function (i) {
    return '<div class="icon-option' + (i.id === selectedIcon ? ' selected' : '') + '" data-icon="' + i.id + '">' + i.emoji + '</div>';
  }).join("");

  var isCustom = selectedFreq !== "daily" && selectedFreq !== "weekly";
  var customDays = isCustom ? selectedFreq.split(",") : [];

  var dayToggles = DAYS.map(function (d) {
    return '<button type="button" class="day-toggle' + (customDays.includes(d.id) ? ' selected' : '') + '" data-day="' + d.id + '">' + d.label + '</button>';
  }).join("");

  modalRoot.innerHTML =
    '<div class="modal-overlay" id="modal-overlay">' +
      '<div class="modal">' +
        '<h2>' + title + '</h2>' +
        '<form id="habit-form">' +
          '<div class="form-group">' +
            '<label>Name *</label>' +
            '<input type="text" id="habit-name" value="' + (isEdit ? escapeHtml(habit.name) : '') + '" placeholder="e.g. Morning run" required>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Description</label>' +
            '<textarea id="habit-desc" placeholder="Optional description">' + (isEdit && habit.description ? escapeHtml(habit.description) : '') + '</textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Frequency</label>' +
            '<select id="habit-freq">' +
              '<option value="daily"' + (selectedFreq === "daily" ? ' selected' : '') + '>Daily</option>' +
              '<option value="weekly"' + (selectedFreq === "weekly" ? ' selected' : '') + '>Weekly</option>' +
              '<option value="custom"' + (isCustom ? ' selected' : '') + '>Custom days</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group' + (isCustom ? '' : ' hidden') + '" id="days-group">' +
            '<label>Select days</label>' +
            '<div class="days-picker" id="days-picker">' + dayToggles + '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Color</label>' +
            '<div class="color-options" id="color-picker">' + colorSwatches + '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Icon</label>' +
            '<div class="icon-options" id="icon-picker">' + iconOptions + '</div>' +
          '</div>' +
          '<div id="habit-form-error" class="error-text hidden"></div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
            '<button type="submit" class="btn" id="habit-submit-btn">' + (isEdit ? 'Save' : 'Create') + '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';

  // Close on overlay click
  document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  // Color picker
  document.getElementById("color-picker").addEventListener("click", function (e) {
    var swatch = e.target.closest(".color-swatch");
    if (!swatch) return;
    document.querySelectorAll(".color-swatch").forEach(function (s) { s.classList.remove("selected"); });
    swatch.classList.add("selected");
  });

  // Icon picker
  document.getElementById("icon-picker").addEventListener("click", function (e) {
    var opt = e.target.closest(".icon-option");
    if (!opt) return;
    document.querySelectorAll(".icon-option").forEach(function (o) { o.classList.remove("selected"); });
    opt.classList.add("selected");
  });

  // Frequency change
  document.getElementById("habit-freq").addEventListener("change", function (e) {
    var daysGroup = document.getElementById("days-group");
    if (e.target.value === "custom") {
      daysGroup.classList.remove("hidden");
    } else {
      daysGroup.classList.add("hidden");
    }
  });

  // Day toggles
  document.getElementById("days-picker").addEventListener("click", function (e) {
    var toggle = e.target.closest(".day-toggle");
    if (!toggle) return;
    toggle.classList.toggle("selected");
  });

  // Form submit
  document.getElementById("habit-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var errEl = document.getElementById("habit-form-error");
    errEl.classList.add("hidden");

    var name = document.getElementById("habit-name").value.trim();
    var description = document.getElementById("habit-desc").value.trim();
    var freqSelect = document.getElementById("habit-freq").value;
    var colorEl = document.querySelector(".color-swatch.selected");
    var color = colorEl ? colorEl.dataset.color : COLORS[0];
    var iconEl = document.querySelector(".icon-option.selected");
    var icon = iconEl ? iconEl.dataset.icon : ICONS[0].id;

    if (!name) {
      errEl.textContent = "Name is required";
      errEl.classList.remove("hidden");
      return;
    }

    var frequency = freqSelect;
    if (freqSelect === "custom") {
      var selectedDays = Array.from(document.querySelectorAll(".day-toggle.selected")).map(function (d) { return d.dataset.day; });
      if (selectedDays.length === 0) {
        errEl.textContent = "Select at least one day";
        errEl.classList.remove("hidden");
        return;
      }
      frequency = selectedDays.join(",");
    }

    var btn = document.getElementById("habit-submit-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      if (isEdit) {
        await updateHabit(habit.id, { name: name, description: description, frequency: frequency, color: color, icon: icon });
      } else {
        await createHabit({ name: name, description: description, frequency: frequency, color: color, icon: icon });
      }
      closeModal();
      loadHabits();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = isEdit ? "Save" : "Create";
    }
  });
}

window.openEditModal = function (id) {
  var habit = habitsCache.find(function (h) { return h.id === id; });
  if (habit) openHabitFormModal(habit);
};

window.toggleArchive = async function (id, archive) {
  try {
    await updateHabit(id, { archived: archive });
    loadHabits();
  } catch (err) {
    console.error("Archive error:", err);
  }
};

window.openDeleteConfirm = function (id, name) {
  modalRoot.innerHTML =
    '<div class="modal-overlay" id="modal-overlay">' +
      '<div class="modal">' +
        '<h2>Delete Habit</h2>' +
        '<p class="confirm-text">Are you sure you want to delete <strong>' + name + '</strong>? This cannot be undone.</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
          '<button class="btn btn-danger" id="confirm-delete-btn">Delete</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  document.getElementById("confirm-delete-btn").addEventListener("click", async function () {
    var btn = document.getElementById("confirm-delete-btn");
    btn.disabled = true;
    btn.textContent = "Deleting...";
    try {
      await deleteHabit(id);
      closeModal();
      loadHabits();
    } catch (err) {
      console.error("Delete error:", err);
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  });
};

// --- Session check ---
async function checkSession() {
  var token = getToken();
  if (!token) return;

  try {
    var res = await fetch(AUTH_API + "/me", {
      headers: { Authorization: "Bearer " + token },
      credentials: "include",
    });
    if (res.ok) {
      var data = await res.json();
      showDashboard(data.user);
    } else {
      localStorage.removeItem("token");
    }
  } catch (err) {
    // Ignore - show login form
  }
}

checkSession();
