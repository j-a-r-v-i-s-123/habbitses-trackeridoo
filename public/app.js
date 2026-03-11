const API = "/api/auth";

// DOM elements
const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const alertEl = document.getElementById("alert");
const tabs = document.querySelectorAll(".tab");

// Tab switching
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

// Validation helpers
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

// Login
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
    const res = await fetch(`${API}/login`, {
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
    showDashboard(data.user);
  } catch {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});

// Register
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
    showFieldError(
      "register-password-error",
      "Password must be at least 8 characters"
    );
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
    const res = await fetch(`${API}/register`, {
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
    showDashboard(data.user);
  } catch {
    showAlert("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors on logout
  }
  localStorage.removeItem("token");
  showAuth();
});

// Show dashboard
function showDashboard(user) {
  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("user-name").textContent = user.name
    ? `Name: ${user.name}`
    : "";
  if (user.createdAt) {
    document.getElementById("user-since").textContent = `Member since ${new Date(
      user.createdAt
    ).toLocaleDateString()}`;
  }
}

// Show auth forms
function showAuth() {
  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  clearErrors();
  hideAlert();
  loginForm.reset();
  registerForm.reset();
}

// Check if already logged in on page load
async function checkSession() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      showDashboard(data.user);
    } else {
      localStorage.removeItem("token");
    }
  } catch {
    // Ignore - show login form
  }
}

checkSession();
