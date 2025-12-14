// admin-dashboard.js — Project 55 Motors
// FINAL VERIFIED BUILD (Step 1)
// - Correct table body ID
// - Deterministic login handling
// - Surfaces server-side auth errors clearly
// - No caching anywhere

const API_BASE = "/api";

// ---------- DOM ----------
const tableBody = document.getElementById("admin-table-body");
const statusBar = document.getElementById("admin-status");

const hideInactiveBtn = document.getElementById("btn-hide-inactive");
const refreshBtn = document.getElementById("btn-refresh");
const addVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// Login modal
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-message");

// ---------- Status ----------
function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------- Login helpers ----------
function showLogin(message = "") {
  if (loginMsg) loginMsg.textContent = message;
  if (loginModal) loginModal.style.display = "flex";
}

function hideLogin() {
  if (loginMsg) loginMsg.textContent = "";
  if (loginModal) loginModal.style.display = "none";
}

// ---------- Utils ----------
function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function findRow(id) {
  return document.querySelector(`tr[data-id="${id}"]`);
}

// ---------- Auth ----------
async function loginCheck() {
  try {
    const res = await fetch(`${API_BASE}/login-check?ts=${Date.now()}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.loggedIn;
  } catch {
    return false;
  }
}

// ---------- Load inventory ----------
async function loadCars() {
  setStatus("Loading vehicles…");

  const ok = await loginCheck();
  if (!ok) {
    if (tableBody) tableBody.innerHTML = "";
    showLogin("Please log in to access the admin dashboard.");
    setStatus("Not authenticated.", "error");
    return;
  }

  hideLogin();

  const res = await fetch(`${API_BASE}/admin/all?ts=${Date.now()}`, {
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 401) {
    showLogin("Session expired. Please log in again.");
    return;
  }

  if (!res.ok) {
    setStatus(`Failed loading vehicles (${res.status})`, "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
  setStatus("Vehicles loaded.", "success");
}

// ---------- Save ----------
async function save(id) {
  const row = findRow(id);
  if (!row) return;

  const fields = {};
  qsa("input, textarea, select", row).forEach(el => {
    if (!el.name) return;
    fields[el.name] = el.value === "" ? null : el.value;
  });

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Save failed:", txt);
    setStatus("Save failed.", "error");
    return;
  }

  setStatus("Saved.", "success");
}

// ---------- Sold ----------
async function sold(id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });
  await loadCars();
}

// ---------- Create ----------
async function createVehicle() {
  await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
  await loadCars();
}

// ---------- Logout ----------
async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
  location.href = "/";
}

// ---------- Buttons ----------
refreshBtn?.addEventListener("click", loadCars);
addVehicleBtn?.addEventListener("click", createVehicle);
logoutBtn?.addEventListener("click", logout);

// ---------- Login submit (IMPORTANT FIX) ----------
loginForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const username = qs('input[name="username"]', loginForm)?.value || "";
  const password = qs('input[name="password"]', loginForm)?.value || "";

  setStatus("Logging in…");

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("LOGIN FAILED:", body);
    showLogin(body.error || "Login failed.");
    setStatus("Login failed.", "error");
    return;
  }

  hideLogin();
  await loadCars();
});

// ---------- Expose ----------
window.save = save;
window.sold = sold;

// ---------- Init ----------
loadCars();
