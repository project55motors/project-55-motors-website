// ======================================================================
// PROJECT 55 MOTORS – ADMIN DASHBOARD SCRIPT (FIXED & VERIFIED)
// - Correct table body ID
// - Proper login flow with cookies
// - Reloads dashboard after successful login
// ======================================================================

const API_BASE = "/api";

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const tableBody = document.getElementById("admin-table-body");
const statusEl = document.getElementById("admin-status");

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = `admin-status ${type}`;
}

// ------------------------------------------------------------
// LOGIN CHECK ON LOAD
// ------------------------------------------------------------
async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, {
    credentials: "include",
    cache: "no-store"
  });

  const data = await res.json();

  if (!data.loggedIn) {
    loginModal.style.display = "flex";
    return false;
  }

  loginModal.style.display = "none";
  return true;
}

// ------------------------------------------------------------
// LOAD INVENTORY
// ------------------------------------------------------------
async function loadCars() {
  const loggedIn = await checkLogin();
  if (!loggedIn) return;

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 401) {
    loginModal.style.display = "flex";
    setStatus("Please log in", "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
  setStatus("Vehicles loaded", "success");
}

// ------------------------------------------------------------
// LOGIN SUBMIT
// ------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginError.textContent = "";

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!res.ok) {
    loginError.textContent = data.error || "Login failed";
    return;
  }

  // Success → reload dashboard state
  loginModal.style.display = "none";
  await loadCars();
});

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.reload();
});

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
loadCars();
