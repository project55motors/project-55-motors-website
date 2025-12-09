// admin-dashboard.js – simple, full-width admin grid

const API_BASE = "/api";

const tableBody   = document.getElementById("admin-table-body");
const statusBar   = document.getElementById("admin-status");
const toastEl     = document.getElementById("admin-toast");

const btnHide     = document.getElementById("btn-hide-inactive");
const btnRefresh  = document.getElementById("btn-refresh");
const btnLogout   = document.getElementById("btn-logout");
const btnAdd      = document.getElementById("btn-add-vehicle");
const btnTheme    = document.getElementById("btn-theme");

const descModal    = document.getElementById("desc-modal");
const descTextarea = document.getElementById("desc-modal-text");
const descCancel   = document.getElementById("desc-cancel");
const descApply    = document.getElementById("desc-apply");

let hideInactive     = false;
let currentDescRowId = null;

function setStatus(message, type = "info") {
  if (statusBar) {
    statusBar.textContent = message;
    statusBar.className = "admin-status-bar admin-status-" + type;
  }

  if (!toastEl) return;

  toastEl.textContent = message;
  toastEl.classList.remove("show", "error", "success", "info");
  toastEl.classList.add("show");
  if (type === "error") toastEl.classList.add("error");
  if (type === "success") toastEl.classList.add("success");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

function toAirtableDate(value) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}-${m}-${d}`;
  }
  return null;
}

// ───────────── LOAD TABLE ─────────────

async function loadCars() {
  setStatus("Loading vehicles…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (res.status === 401) {
      setStatus("Not logged in – please use the admin login route.", "error");
      return;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("admin/all error:", txt);
      setStatus(`Failed to load vehicles (HTTP ${res.status})`, "error");
      return;
    }

    const html = await res.text();
    tableBody.innerHTML = html;

    attachRowBehaviours();
    applyHideFilter();
    setStatus("Vehicles loaded.", "success");
  } catch (err) {
    console.error("loadCars error:", err);
    setStatus("Failed to load vehicles – network error.", "error");
  }
}

// ───────────── SAVE / SOLD ─────────────

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach((el) => {
    const name = el.name;
    if (!name) return;

    let value = el.value.trim();

    if (el.type === "number") {
      value = value === "" ? null : Number(value);
    }

    if (el.type === "date") {
      value = value ? toAirtableDate(value) : null;
    }

    if (name === "Price" || name === "Mileage") {
      value = value === "" ? null : Number(value);
    }

    if (value !== "" && value !== null && value !== undefined) {
      fields[name] = value;
    }
  });

  setStatus("Saving changes…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    if (res.ok) {
      setStatus("Saved.", "success");
    } else {
      const txt = await res.text().catch(() => "");
      console.error("Save failed:", txt);
      setStatus("Save failed – see console for details.", "error");
      alert("Save failed – open DevTools → Network → admin/update to see the Airtable error.");
    }
  } catch (err) {
    console.error("Save error:", err);
    setStatus("Save failed – network error.", "error");
  }
}

async function sold(id) {
  setStatus("Marking as sold…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    if (res.ok) {
      setStatus("Vehicle marked as sold.", "success");
      loadCars();
    } else {
      setStatus("Failed to mark sold.", "error");
    }
  } catch (err) {
    console.error("Sold error:", err);
    setStatus("Failed to mark sold – network error.", "error");
  }
}

// ───────────── CREATE ─────────────

async function createVehicle() {
  setStatus("Creating new vehicle…", "info");
  try {
    const res = await fetch(`${API_BASE}/admin/create`, {
      method: "POST",
      credentials: "include"
    });

    if (res.ok) {
      setStatus("Vehicle created – refreshing.", "success");
      loadCars();
    } else {
      setStatus("Failed to create vehicle.", "error");
    }
  } catch (err) {
    console.error("Create error:", err);
    setStatus("Failed to create vehicle – network error.", "error");
  }
}

// ───────────── ORDER (Sort_Index) ─────────────

async function moveBy(id, delta) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const sortInput = row.querySelector('input[name="Sort_Index"]');
  let current = sortInput ? parseInt(sortInput.value, 10) : 0;
  if (isNaN(current)) current = 0;

  const next = current + delta;
  if (sortInput) sortInput.value = next;

  setStatus("Updating order…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        fields: { Sort_Index: next }
      })
    });

    if (res.ok) {
      setStatus("Order updated.", "success");
      loadCars();
    } else {
      setStatus("Order update failed.", "error");
    }
  } catch (err) {
    console.error("Order error:", err);
    setStatus("Order update failed – network error.", "error");
  }
}

// ───────────── FULL DESCRIPTION MODAL ─────────────

function openDesc(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const ta = row.querySelector('textarea[name="Full_Description"]');
  if (!ta) return;

  currentDescRowId = id;
  descTextarea.value = ta.value || "";

  descModal.classList.add("show");
  descTextarea.focus();
}

function closeDescModal() {
  descModal.classList.remove("show");
  currentDescRowId = null;
}

function applyDescModal() {
  if (!currentDescRowId) {
    closeDescModal();
    return;
  }

  const row = document.querySelector(`tr[data-id="${currentDescRowId}"]`);
  if (!row) {
    closeDescModal();
    return;
  }

  const ta = row.querySelector('textarea[name="Full_Description"]');
  if (ta) {
    ta.value = descTextarea.value;
  }

  closeDescModal();
}

// ───────────── FILTERS & THEME ─────────────

function applyHideFilter() {
  const rows = tableBody.querySelectorAll("tr[data-id]");
  rows.forEach(row => {
    const statusSel = row.querySelector('select[name="Status"]');
    if (!statusSel) return;
    const value = statusSel.value || "";

    if (hideInactive && value !== "Available") {
      row.style.display = "none";
    } else {
      row.style.display = "";
    }
  });

  if (btnHide) {
    btnHide.textContent = hideInactive ? "Show All" : "Hide Sold / Hidden";
  }
}

const THEME_KEY = "p55_admin_theme";

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;

  if (theme === "dark") {
    body.classList.add("admin-dark");
    if (btnTheme) btnTheme.textContent = "Light Mode";
  } else {
    body.classList.remove("admin-dark");
    if (btnTheme) btnTheme.textContent = "Dark Mode";
  }
}

function initTheme() {
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    const hour = new Date().getHours();
    saved = (hour >= 18 || hour < 7) ? "dark" : "light";
  }
  applyTheme(saved);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("admin-dark");
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

// ───────────── LOGOUT ─────────────

async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    window.location.href = "index.html";
  }
}

// ───────────── ATTACH BEHAVIOURS ─────────────

function attachRowBehaviours() {
  // buttons to open description editor
  tableBody.querySelectorAll("[data-edit-full]").forEach(btn => {
    const id = btn.getAttribute("data-edit-full");
    btn.addEventListener("click", () => openDesc(id));
  });
}

// Top controls
if (btnHide) {
  btnHide.addEventListener("click", () => {
    hideInactive = !hideInactive;
    applyHideFilter();
  });
}

if (btnRefresh) {
  btnRefresh.addEventListener("click", () => loadCars());
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => logout());
}

if (btnAdd) {
  btnAdd.addEventListener("click", () => createVehicle());
}

if (btnTheme) {
  btnTheme.addEventListener("click", toggleTheme);
}

if (descCancel) {
  descCancel.addEventListener("click", closeDescModal);
}
if (descApply) {
  descApply.addEventListener("click", applyDescModal);
}

if (descModal) {
  descModal.addEventListener("click", (e) => {
    if (e.target === descModal) closeDescModal();
  });
}

// Expose functions for inline onclick in the HTML rows
window.save     = save;
window.sold     = sold;
window.moveUp   = (id) => moveBy(id, -1);
window.moveDown = (id) => moveBy(id, 1);
window.openDesc = openDesc;

// Init
initTheme();
loadCars();
