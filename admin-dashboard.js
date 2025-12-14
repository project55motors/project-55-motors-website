/* ============================================================
   Project 55 Motors – Admin Dashboard JS (STABLE)
   ============================================================ */

const API_BASE = "/api";

const statusBox = document.getElementById("admin-status");
const tableBody = document.getElementById("admin-table-body");

/* ------------------------------------------------------------
   Status helper
------------------------------------------------------------ */
function setStatus(msg, type = "info") {
  if (!statusBox) return;
  statusBox.textContent = msg;
  statusBox.className = `admin-status ${type}`;
}

/* ------------------------------------------------------------
   Login check on load
------------------------------------------------------------ */
async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, {
    credentials: "include",
    cache: "no-store"
  });

  const data = await res.json();

  if (!data.loggedIn) {
    document.getElementById("login-modal").style.display = "flex";
    return false;
  }

  return true;
}

/* ------------------------------------------------------------
   Load inventory table
------------------------------------------------------------ */
async function loadCars() {
  const ok = await checkLogin();
  if (!ok) return;

  setStatus("Loading inventory…");

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 401) {
    document.getElementById("login-modal").style.display = "flex";
    setStatus("Please log in", "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;

  setStatus("Inventory loaded", "success");
}

/* ------------------------------------------------------------
   SAVE VEHICLE (THIS WAS MISSING)
------------------------------------------------------------ */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, select, textarea").forEach(el => {
    const name = el.name;
    if (!name) return;
    fields[name] = el.value;
  });

  setStatus("Saving changes…");

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (!res.ok) {
    setStatus("Save failed", "error");
    return;
  }

  setStatus("Saved successfully", "success");
}

/* ------------------------------------------------------------
   MARK SOLD
------------------------------------------------------------ */
async function sold(id) {
  setStatus("Marking as sold…");

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  if (!res.ok) {
    setStatus("Failed to mark sold", "error");
    return;
  }

  setStatus("Vehicle marked as sold", "success");
  loadCars();
}

/* ------------------------------------------------------------
   CREATE VEHICLE
------------------------------------------------------------ */
async function addVehicle() {
  setStatus("Creating vehicle…");

  const res = await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });

  if (!res.ok) {
    setStatus("Failed to create vehicle", "error");
    return;
  }

  setStatus("Vehicle created", "success");
  loadCars();
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */
document.getElementById("btn-refresh")?.addEventListener("click", loadCars);
document.getElementById("btn-add-vehicle")?.addEventListener("click", addVehicle);

loadCars();
