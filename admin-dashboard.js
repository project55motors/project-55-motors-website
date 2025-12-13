// admin-dashboard.js — FIXED CONTRACT VERSION
const API_BASE = "/api";

const tableBody = document.getElementById("admin-table-body");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// ---------------- Auth gate ----------------

async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, { credentials: "include" });
  const data = await res.json();
  if (!data.loggedIn) {
    document.getElementById("login-modal").style.display = "flex";
    return false;
  }
  return true;
}

// ---------------- Load cars ----------------

async function loadCars() {
  if (!(await checkLogin())) return;

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include"
  });

  if (!res.ok) {
    console.error("Failed to load cars");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
  wireSaveButtons();
}

// ---------------- Save wiring ----------------

function findSaveButton(row) {
  return row.querySelector(".btn-save");
}

function wireSaveButtons() {
  tableBody.querySelectorAll("tr").forEach((row) => {
    const saveBtn = findSaveButton(row);
    if (!saveBtn) return;

    saveBtn.disabled = true;

    row.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("input", () => {
        saveBtn.disabled = false;
      });
    });
  });
}

// ---------------- Save ----------------

window.save = async function (id) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("[name]").forEach((el) => {
    fields[el.name] =
      el.type === "number" ? Number(el.value) || null : el.value;
  });

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (res.ok) {
    row.querySelector(".btn-save").disabled = true;
  }
};

// ---------------- Sold ----------------

window.sold = async function (id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });

  loadCars();
};

// ---------------- Create ----------------

async function createVehicle() {
  await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });
  loadCars();
}

// ---------------- Logout ----------------

async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.href = "/";
}

// ---------------- Events ----------------

if (refreshBtn) refreshBtn.onclick = loadCars;
if (newVehicleBtn) newVehicleBtn.onclick = createVehicle;
if (logoutBtn) logoutBtn.onclick = logout;

// ---------------- Boot ----------------

loadCars();
