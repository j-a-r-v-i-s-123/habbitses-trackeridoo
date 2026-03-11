const AUTH_API = "/api/auth";
const HABITS_API = "/api/habits";

const ICON_MAP = {
  star: "\u2B50",
  heart: "\u2764\uFE0F",
  fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6",
  run: "\uD83C\uDFC3",
  water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34",
  meditate: "\uD83E\uDDD7",
  code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5",
};

// State
let currentUser = null;
let habits = [];
let editingHabitId = null;
let deletingHabitId = null;

// DOM elements
const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const alertEl = document.getElementById("alert");
const tabs = document.querySelectorAll(".tab");

// ---- Auth ----

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.remove("active"));
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

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  const input = el.previousElementSibling;
  el.textContent = msg;
  el.classList.remove("hidden");
  if (input) input.classList.add("error");
}

function clearErrors() {
  document.querySelectorAll(".error-text").forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });
  document.querySelectorAll("input.error").forEach((el) => {
    el.classList.remove("error");
  });
}

function showAlert(msg, type) {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type}`;
  alertEl.classList.remove("hidden");
}

function hideAlert() {
  alertEl.classList.add("hidden");
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  hideAlert();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  let valid = true;

  if (!email || !validateEmail(email)) {
    showFieldError("login-email-error", "Please enter a valid email");
    valid = false;
  }
  if (!password) {
    showFieldError("login-password-error", "Password is required");
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Login failed", "error");
      return;
    }
    localStorage.setItem("token", data.token);
    currentUser = data.user;
    showDashboard();
  } catch {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  hideAlert();

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;
  let valid = true;

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

  const btn = document.getElementById("register-btn");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    const res = await fetch(`${AUTH_API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Registration failed", "error");
      return;
    }
    localStorage.setItem("token", data.token);
    currentUser = data.user;
    showDashboard();
  } catch {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await fetch(`${AUTH_API}/logout`, { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
  localStorage.removeItem("token");
  currentUser = null;
  habits = [];
  showAuth();
});

function showDashboard() {
  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  document.getElementById("user-email-badge").textContent = currentUser ? currentUser.email : "";
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

async function checkSession() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${AUTH_API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      showDashboard();
    } else {
      localStorage.removeItem("token");
    }
  } catch {
    // show login
  }
}

// ---- Habits ----

async function loadHabits() {
  const showArchived = document.getElementById("show-archived").checked;
  try {
    const res = await fetch(`${HABITS_API}?archived=${showArchived}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    habits = data.habits;
    renderHabits();
  } catch (err) {
    console.error("Failed to load habits:", err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderHabits() {
  const list = document.getElementById("habits-list");
  const empty = document.getElementById("empty-state");

  if (habits.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = habits
    .map((h) => {
      const icon = ICON_MAP[h.icon] || ICON_MAP.star;
      const freqLabel = (h.frequency === "daily" || h.frequency === "weekly")
        ? h.frequency
        : h.frequency.split(",").map((d) => d.trim().substring(0, 3)).join(", ");

      return `<div class="habit-card ${h.archived ? "archived" : ""}" data-id="${h.id}">
        <div class="habit-icon" style="background:${escapeHtml(h.color)}">${icon}</div>
        <div class="habit-info">
          <div class="habit-name">${escapeHtml(h.name)}</div>
          ${h.description ? `<div class="habit-desc">${escapeHtml(h.description)}</div>` : ""}
          <div class="habit-meta">
            <span class="habit-badge">${escapeHtml(freqLabel)}</span>
            ${h.archived ? '<span class="habit-badge">archived</span>' : ""}
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn-archive" onclick="toggleArchive('${h.id}')" title="${h.archived ? "Unarchive" : "Archive"}">
            ${h.archived ? "&#128194;" : "&#128230;"}
          </button>
          <button class="btn-edit" onclick="openEditModal('${h.id}')" title="Edit">&#9998;</button>
          <button class="btn-delete" onclick="openDeleteModal('${h.id}')" title="Delete">&#128465;</button>
        </div>
      </div>`;
    })
    .join("");
}

// Filter checkbox
document.getElementById("show-archived").addEventListener("change", loadHabits);

// ---- Create/Edit Modal ----

const habitModal = document.getElementById("habit-modal");
const habitForm = document.getElementById("habit-form");
const modalTitle = document.getElementById("modal-title");
const modalSubmit = document.getElementById("modal-submit");
const frequencySelect = document.getElementById("habit-frequency");
const customDaysGroup = document.getElementById("custom-days-group");

document.getElementById("add-habit-btn").addEventListener("click", () => {
  editingHabitId = null;
  modalTitle.textContent = "New Habit";
  modalSubmit.textContent = "Create Habit";
  habitForm.reset();
  resetFormSelections();
  frequencySelect.value = "daily";
  customDaysGroup.classList.add("hidden");
  habitModal.classList.remove("hidden");
});

document.getElementById("modal-cancel").addEventListener("click", () => {
  habitModal.classList.add("hidden");
});

habitModal.addEventListener("click", (e) => {
  if (e.target === habitModal) habitModal.classList.add("hidden");
});

frequencySelect.addEventListener("change", () => {
  if (frequencySelect.value === "custom") {
    customDaysGroup.classList.remove("hidden");
  } else {
    customDaysGroup.classList.add("hidden");
  }
});

// Day toggles
document.querySelectorAll(".day-toggle").forEach((btn) => {
  btn.addEventListener("click", () => btn.classList.toggle("selected"));
});

// Color picker
document.querySelectorAll(".color-option").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".color-option").forEach((c) => c.classList.remove("selected"));
    el.classList.add("selected");
  });
});

// Icon picker
document.querySelectorAll(".icon-option").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".icon-option").forEach((c) => c.classList.remove("selected"));
    el.classList.add("selected");
  });
});

function resetFormSelections() {
  document.querySelectorAll(".color-option").forEach((c) => c.classList.remove("selected"));
  document.querySelector('.color-option[data-color="#5b4fcf"]').classList.add("selected");
  document.querySelectorAll(".icon-option").forEach((c) => c.classList.remove("selected"));
  document.querySelector('.icon-option[data-icon="star"]').classList.add("selected");
  document.querySelectorAll(".day-toggle").forEach((d) => d.classList.remove("selected"));
}

function getFormData() {
  const name = document.getElementById("habit-name").value.trim();
  const description = document.getElementById("habit-description").value.trim();
  const freqValue = frequencySelect.value;
  const colorEl = document.querySelector(".color-option.selected");
  const color = colorEl ? colorEl.dataset.color : "#5b4fcf";
  const iconEl = document.querySelector(".icon-option.selected");
  const icon = iconEl ? iconEl.dataset.icon : "star";

  let frequency = freqValue;
  if (freqValue === "custom") {
    const selectedDays = Array.from(document.querySelectorAll(".day-toggle.selected"))
      .map((d) => d.dataset.day.toLowerCase());
    if (selectedDays.length === 0) return null;
    frequency = selectedDays.join(",");
  }

  return { name, description: description || undefined, frequency, color, icon };
}

habitForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = getFormData();
  if (!formData) {
    alert("Please select at least one day for custom frequency.");
    return;
  }
  if (!formData.name) {
    alert("Habit name is required.");
    return;
  }

  modalSubmit.disabled = true;

  try {
    const url = editingHabitId ? `${HABITS_API}/${editingHabitId}` : HABITS_API;
    const method = editingHabitId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to save habit");
      return;
    }

    habitModal.classList.add("hidden");
    loadHabits();
  } catch {
    alert("Network error. Please try again.");
  } finally {
    modalSubmit.disabled = false;
  }
});

// Open edit modal
function openEditModal(id) {
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  editingHabitId = id;
  modalTitle.textContent = "Edit Habit";
  modalSubmit.textContent = "Save Changes";

  document.getElementById("habit-name").value = habit.name;
  document.getElementById("habit-description").value = habit.description || "";

  const isCustom = habit.frequency !== "daily" && habit.frequency !== "weekly";
  if (isCustom) {
    frequencySelect.value = "custom";
    customDaysGroup.classList.remove("hidden");
    document.querySelectorAll(".day-toggle").forEach((d) => d.classList.remove("selected"));
    const days = habit.frequency.split(",").map((d) => d.trim().toLowerCase());
    days.forEach((day) => {
      const btn = document.querySelector(`.day-toggle[data-day="${day.charAt(0).toUpperCase() + day.slice(1)}"]`);
      if (btn) btn.classList.add("selected");
    });
  } else {
    frequencySelect.value = habit.frequency;
    customDaysGroup.classList.add("hidden");
    document.querySelectorAll(".day-toggle").forEach((d) => d.classList.remove("selected"));
  }

  document.querySelectorAll(".color-option").forEach((c) => c.classList.remove("selected"));
  const colorMatch = document.querySelector(`.color-option[data-color="${habit.color}"]`);
  if (colorMatch) colorMatch.classList.add("selected");
  else document.querySelector('.color-option[data-color="#5b4fcf"]').classList.add("selected");

  document.querySelectorAll(".icon-option").forEach((c) => c.classList.remove("selected"));
  const iconMatch = document.querySelector(`.icon-option[data-icon="${habit.icon}"]`);
  if (iconMatch) iconMatch.classList.add("selected");
  else document.querySelector('.icon-option[data-icon="star"]').classList.add("selected");

  habitModal.classList.remove("hidden");
}

// ---- Archive ----

async function toggleArchive(id) {
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  try {
    const res = await fetch(`${HABITS_API}/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ archived: !habit.archived }),
    });
    if (res.ok) loadHabits();
  } catch {
    alert("Failed to update habit.");
  }
}

// ---- Delete Modal ----

const deleteModal = document.getElementById("delete-modal");

function openDeleteModal(id) {
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  deletingHabitId = id;
  document.getElementById("delete-habit-name").textContent = habit.name;
  deleteModal.classList.remove("hidden");
}

document.getElementById("delete-cancel").addEventListener("click", () => {
  deleteModal.classList.add("hidden");
  deletingHabitId = null;
});

deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.add("hidden");
    deletingHabitId = null;
  }
});

document.getElementById("delete-confirm").addEventListener("click", async () => {
  if (!deletingHabitId) return;

  const btn = document.getElementById("delete-confirm");
  btn.disabled = true;

  try {
    const res = await fetch(`${HABITS_API}/${deletingHabitId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      deleteModal.classList.add("hidden");
      deletingHabitId = null;
      loadHabits();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete habit");
    }
  } catch {
    alert("Network error. Please try again.");
  } finally {
    btn.disabled = false;
  }
});

// ---- Init ----
checkSession();
