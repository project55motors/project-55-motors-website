/* ============================================================
   Project 55 Motors – Admin Dashboard JS (STABLE + FIXED)
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
   LOGIN CHECK
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
   LOAD CARS
------------------------------------------------------------ */
async function loadCars() {
  const ok = await checkLogin();
  if (!ok) return;

  setStatus("Loading vehicles…");

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

  setStatus("Vehicles loaded", "success");
}

/* ------------------------------------------------------------
   SAVE VEHICLE  ✅ FIXED (GLOBAL)
------------------------------------------------------------ */
window.save = async function (id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("input, select, textarea").forEach(el => {
    fields[el.name] = el.value;
  });

  setStatus("Saving…");

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

  setStatus("Saved", "success");
};

/* ------------------------------------------------------------
   MARK SOLD  ✅ FIXED (GLOBAL)
------------------------------------------------------------ */
window.sold = async function (id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  setStatus("Marked as sold", "success");
  loadCars();
};

/* ------------------------------------------------------------
   ADD VEHICLE
------------------------------------------------------------ */
async function addVehicle() {
  const res = await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });

  if (!res.ok) {
    setStatus("Create failed", "error");
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
