// admin-dashboard.js — FIXED to match current admin-worker

const API_BASE = "/api";

const tableBody = document.getElementById("inventory-table-body");
const statusBar = document.getElementById("admin-status");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-new-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// ---------------- Status ----------------

function setStatus(msg, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = msg;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------------- Login check ----------------

async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, {
    credentials: "include"
  });
  const data = await res.json();
  return data.loggedIn === true;
}

// ---------------- Load cars ----------------

async function loadCars() {
  setStatus("Loading vehicles…");

  const loggedIn = await checkLogin();
  if (!loggedIn) {
    setStatus("Not logged in.", "error");
    return;
  }

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include"
  });

  if (!res.ok) {
    setStatus("Failed loading vehicles.", "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;

  wireRows();
  setStatus("Vehicles loaded.", "success");
}

// ---------------- Wire rows ----------------

function wireRows() {
  tableBody.querySelectorAll("tr[id^='row-']").forEach((row) => {
    const id = row.id.replace("row-", "");
    row.dataset.id = id;

    const saveBtn = row.querySelector(".btn-save");
    if (!saveBtn) return;

    saveBtn.disabled = true;

    const markDirty = () => {
      saveBtn.disabled = false;
    };

    row.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("input", markDirty);
      el.addEventListener("change", markDirty);
    });
  });
}

// ---------------- Save ----------------

window.save = async function (id) {
  const row = document.querySelector(`#row-${id}`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("input, textarea, select").forEach((el) => {
    if (!el.name) return;
    fields[el.name] = el.type === "number" ? Number(el.value) : el.value;
  });

  setStatus("Saving…");

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

  setStatus("Saved.", "success");
  row.querySelector(".btn-save").disabled = true;
};

// ---------------- Sold ----------------

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

// ---------------- Buttons ----------------

refreshBtn?.addEventListener("click", loadCars);
newVehicleBtn?.addEventListener("click", createVehicle);
logoutBtn?.addEventListener("click", logout);

// ---------------- Init ----------------

loadCars();
