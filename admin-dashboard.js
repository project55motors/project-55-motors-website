/* ============================================================
   Project 55 Motors – Admin Dashboard JS (STABLE / FIXED)
   ============================================================ */

const API_BASE = "/api";

const tableBody = document.getElementById("admin-table-body");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-message");

/* ------------------------------------------------------------
   LOGIN CHECK
------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   LOGIN SUBMIT (🔥 THIS WAS MISSING)
------------------------------------------------------------ */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  loginMsg.textContent = "Logging in…";

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    loginMsg.textContent = data.error || "Login failed";
    return;
  }

  loginMsg.textContent = "";
  loginModal.style.display = "none";
  loadCars();
});

/* ------------------------------------------------------------
   LOAD INVENTORY
------------------------------------------------------------ */
async function loadCars() {
  const ok = await checkLogin();
  if (!ok) return;

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 401) {
    loginModal.style.display = "flex";
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
}

/* ------------------------------------------------------------
   SAVE VEHICLE
------------------------------------------------------------ */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("input, select, textarea").forEach(el => {
    if (el.name) fields[el.name] = el.value;
  });

  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });
}

/* ------------------------------------------------------------
   MARK SOLD
------------------------------------------------------------ */
async function sold(id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });

  loadCars();
}

/* ------------------------------------------------------------
   CREATE VEHICLE
------------------------------------------------------------ */
async function addVehicle() {
  await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });

  loadCars();
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */
document.getElementById("btn-refresh")?.addEventListener("click", loadCars);
document.getElementById("btn-add-vehicle")?.addEventListener("click", addVehicle);

loadCars();
