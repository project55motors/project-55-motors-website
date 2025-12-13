// admin-dashboard.js — FINAL STABLE BUILD (Airtable-safe)

const API_BASE = "/api";

const tableBody = document.getElementById("inventory-table-body");
const statusBar = document.getElementById("admin-status");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// ---------------- Status helper ----------------

function setStatus(msg, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = msg;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------------- Airtable field rules ----------------

// EXACT options as defined in Airtable
const SELECT_FIELDS = {
  Fuel_type: ["Petrol", "Diesel", "Hybrid", "Electric"],
  Transmission: ["Manual", "Automatic"],
  Status: ["Available", "Sold", "Hidden"]
};

// ---------------- Load vehicles ----------------

async function loadCars() {
  setStatus("Loading vehicles…");

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include"
  });

  if (!res.ok) {
    setStatus("Failed to load vehicles", "error");
    return;
  }

  const html = await res.text();

  if (!tableBody) {
    setStatus("Table body missing", "error");
    return;
  }

  tableBody.innerHTML = html;
  wireSaveButtons();

  setStatus("Vehicles loaded.", "success");
}

// ---------------- Save handling ----------------

function wireSaveButtons() {
  document.querySelectorAll("tr[data-id]").forEach(row => {
    const saveBtn = row.querySelector(".btn-save");
    if (!saveBtn) return;

    saveBtn.disabled = true;

    row.querySelectorAll("input, textarea, select").forEach(el => {
      el.addEventListener("input", () => saveBtn.disabled = false);
      el.addEventListener("change", () => saveBtn.disabled = false);
    });
  });
}

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input[name], textarea[name], select[name]").forEach(el => {
    const name = el.name;
    const value = el.value;

    if (value === "" || value === null) return;

    // ---- Single-select enforcement ----
    if (SELECT_FIELDS[name]) {
      if (SELECT_FIELDS[name].includes(value)) {
        fields[name] = value;
      }
      return;
    }

    // ---- Numbers ----
    if (el.type === "number") {
      fields[name] = Number(value);
      return;
    }

    // ---- Dates ----
    if (el.type === "date") {
      fields[name] = value;
      return;
    }

    // ---- Text ----
    fields[name] = value;
  });

  if (Object.keys(fields).length === 0) {
    setStatus("Nothing to save", "info");
    return;
  }

  setStatus("Saving…");

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (!res.ok) {
    setStatus("Save failed (invalid field value)", "error");
    return;
  }

  setStatus("Saved successfully", "success");
  row.querySelector(".btn-save").disabled = true;
}

// ---------------- Sold ----------------

async function sold(id) {
  await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  loadCars();
}

// ---------------- Create vehicle ----------------

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

// ---------------- Bind ----------------

refreshBtn?.addEventListener("click", loadCars);
newVehicleBtn?.addEventListener("click", createVehicle);
logoutBtn?.addEventListener("click", logout);

window.save = save;
window.sold = sold;

loadCars();
