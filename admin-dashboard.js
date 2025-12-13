const API_BASE = "/api";

/* ---------- Elements ---------- */
const tableBody = document.getElementById("admin-table-body");
const statusBar = document.getElementById("admin-status");

const refreshBtn = document.getElementById("btn-refresh");
const addVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");
const hideInactiveBtn = document.getElementById("btn-hide-inactive");

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-message");
const loginUser = document.getElementById("login-username");
const loginPass = document.getElementById("login-password");

/* ---------- Status ---------- */
function setStatus(msg, type = "info") {
  statusBar.textContent = msg;
  statusBar.className = `admin-status admin-status-${type}`;
}

/* ---------- Login ---------- */
function showLogin(msg = "") {
  loginMsg.textContent = msg;
  loginModal.style.display = "flex";
}

function hideLogin() {
  loginMsg.textContent = "";
  loginModal.style.display = "none";
}

async function loginCheck() {
  const r = await fetch(`${API_BASE}/login-check`, { credentials: "include" });
  if (!r.ok) return false;
  const j = await r.json();
  return j.loggedIn === true;
}

async function doLogin(username, password) {
  const r = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "Login failed");
  }
}

/* ---------- Load Cars ---------- */
async function loadCars() {
  setStatus("Loading vehicles…");

  const authed = await loginCheck();
  if (!authed) {
    tableBody.innerHTML = "";
    showLogin("Please log in");
    return;
  }

  hideLogin();

  const r = await fetch(`${API_BASE}/admin/all`, { credentials: "include" });
  if (!r.ok) {
    setStatus("Failed loading vehicles", "error");
    return;
  }

  tableBody.innerHTML = await r.text();
  wireRows();

  setStatus("Vehicles loaded", "success");
}

/* ---------- Row Wiring ---------- */
function wireRows() {
  tableBody.querySelectorAll("tr[id^='row-']").forEach(row => {
    const saveBtn = row.querySelector(".btn-save");
    if (!saveBtn) return;

    saveBtn.disabled = true;

    row.querySelectorAll("input, textarea, select").forEach(el => {
      el.addEventListener("input", () => saveBtn.disabled = false);
      el.addEventListener("change", () => saveBtn.disabled = false);
    });

    row.querySelectorAll("img").forEach(img => {
      img.style.width = "80px";
      img.style.height = "55px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
    });
  });
}

/* ---------- SAVE (FIXED FOR AIRTABLE SELECTS) ---------- */
window.save = async function(id) {
  const row = document.getElementById(`row-${id}`);
  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach(el => {
    if (!el.name) return;

    if (el.type === "number") {
      fields[el.name] = el.value === "" ? null : Number(el.value);
    } else {
      fields[el.name] = el.value || null;
    }
  });

  setStatus("Saving…");

  const r = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (!r.ok) {
    setStatus("Save failed", "error");
    return;
  }

  setStatus("Saved", "success");
  row.querySelector(".btn-save").disabled = true;
};

/* ---------- SOLD ---------- */
window.sold = async function(id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });
  loadCars();
};

/* ---------- CREATE ---------- */
async function createVehicle() {
  await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });
  loadCars();
}

/* ---------- LOGOUT ---------- */
async function logout() {
  await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  location.href = "/";
}

/* ---------- Events ---------- */
refreshBtn.onclick = loadCars;
addVehicleBtn.onclick = createVehicle;
logoutBtn.onclick = logout;

loginForm.onsubmit = async e => {
  e.preventDefault();
  try {
    await doLogin(loginUser.value.trim(), loginPass.value);
    hideLogin();
    loadCars();
  } catch (err) {
    showLogin(err.message);
  }
};

/* ---------- Init ---------- */
loadCars();
