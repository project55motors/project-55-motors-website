// admin-dashboard.js — Admin stock control for Project 55 Motors
// FINAL STABLE CLIENT VERSION
// - Enforces login before loading dashboard
// - Compatible with BOTH row formats:
//     <tr data-id="recXXX">
//     <tr id="row-recXXX">
// - Re-enables Save buttons on edit
// - Guarantees Airtable write calls fire correctly

const API_BASE = "/api";

const tableBody = document.getElementById("inventory-table-body");
const statusBar = document.getElementById("admin-status");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-new-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// ---------------------------------------------------------------------
// Status helper
// ---------------------------------------------------------------------

function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------------------------------------------------------------------
// Authentication gate (prevents phantom dashboard state)
// ---------------------------------------------------------------------

async function requireLogin() {
  try {
    const res = await fetch(`${API_BASE}/login-check`, {
      credentials: "include"
    });

    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = "/login.html";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Login check failed:", err);
    window.location.href = "/login.html";
    return false;
  }
}

// ---------------------------------------------------------------------
// Row helpers (handles BOTH worker formats)
// ---------------------------------------------------------------------

function getRowId(row) {
  if (!row) return null;

  const did = row.getAttribute("data-id");
  if (did) return did;

  const rid = row.getAttribute("id");
  if (rid && rid.startsWith("row-")) return rid.slice(4);

  return null;
}

function getRowById(id) {
  return (
    document.querySelector(`tr[data-id="${id}"]`) ||
    document.getElementById(`row-${id}`) ||
    null
  );
}

function getAllRows() {
  return Array.from(
    document.querySelectorAll("tr[data-id], tr[id^='row-']")
  );
}

// ---------------------------------------------------------------------
// Save button discovery (Worker HTML-safe)
// ---------------------------------------------------------------------

function findSaveButton(row) {
  if (!row) return null;

  return (
    row.querySelector(".btn-save") ||
    [...row.querySelectorAll("button")].find(
      b => (b.textContent || "").trim().toLowerCase() === "save"
    ) ||
    null
  );
}

// ---------------------------------------------------------------------
// Enable Save buttons on edit
// ---------------------------------------------------------------------

function wireSaveButtons() {
  getAllRows().forEach(row => {
    const saveBtn = findSaveButton(row);
    if (!saveBtn) return;

    saveBtn.disabled = true;

    const markDirty = () => {
      saveBtn.disabled = false;
      saveBtn.classList.add("is-dirty");
    };

    row.querySelectorAll("input, textarea, select").forEach(el => {
      el.addEventListener("input", markDirty);
      el.addEventListener("change", markDirty);
    });

    row.querySelectorAll("img").forEach(img => {
      img.classList.add("photo-thumb");
      img.loading = "lazy";
    });
  });
}

// ---------------------------------------------------------------------
// Load inventory
// ---------------------------------------------------------------------

async function loadCars() {
  setStatus("Loading vehicles...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (res.status === 401 || res.status === 403) {
      setStatus("Session expired.", "error");
      window.location.href = "/login.html";
      return;
    }

    if (!res.ok) {
      setStatus("Failed loading vehicles.", "error");
      return;
    }

    const html = await res.text();
    tableBody.innerHTML = html;
    wireSaveButtons();

    setStatus("Vehicles loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Failed loading vehicles.", "error");
  }
}

// ---------------------------------------------------------------------
// Save vehicle
// ---------------------------------------------------------------------

async function save(id) {
  const row = getRowById(id);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach(el => {
    if (!el.name) return;

    if (el.type === "number") {
      fields[el.name] = el.value === "" ? null : Number(el.value);
    } else {
      fields[el.name] = el.value;
    }
  });

  setStatus("Saving...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      setStatus("Save failed.", "error");
      return;
    }

    const saveBtn = findSaveButton(row);
    if (saveBtn) saveBtn.disabled = true;

    setStatus("Saved successfully.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Save failed.", "error");
  }
}

// ---------------------------------------------------------------------
// Mark sold
// ---------------------------------------------------------------------

async function sold(id) {
  await save(id);
  await loadCars();
}

// ---------------------------------------------------------------------
// Create new vehicle
// ---------------------------------------------------------------------

async function createVehicle() {
  setStatus("Creating vehicle...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/create`, {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      setStatus("Create failed.", "error");
      return;
    }

    await loadCars();
    setStatus("Vehicle created.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Create failed.", "error");
  }
}

// ---------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------

async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } finally {
    window.location.href = "/";
  }
}

// ---------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  if (!tableBody) return;
  if (!(await requireLogin())) return;
  await loadCars();
});

// ---------------------------------------------------------------------
// Global bindings for Worker inline onclicks
// ---------------------------------------------------------------------

window.save = save;
window.sold = sold;
window.createCar = createVehicle;
window.logout = logout;

if (refreshBtn) refreshBtn.onclick = loadCars;
if (newVehicleBtn) newVehicleBtn.onclick = createVehicle;
if (logoutBtn) logoutBtn.onclick = logout;
