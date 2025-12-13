// admin-dashboard.js — Admin stock control for Project 55 Motors
// Robust against Worker HTML variations (row ids, button classes, etc.)

const API_BASE = "/api";

// ----- DOM -----
const tableBody = document.getElementById("admin-table-body");
const statusBar = document.getElementById("admin-status");

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");

const hideInactiveBtn = document.getElementById("btn-hide-inactive");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// ----- Status helper -----
function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message || "";
  statusBar.className = "admin-status admin-status-" + type;
}

function showLogin(message = "") {
  if (loginModal) loginModal.style.display = "flex";
  if (loginError) loginError.textContent = message || "";
}

function hideLogin() {
  if (loginModal) loginModal.style.display = "none";
  if (loginError) loginError.textContent = "";
}

// ----- Helpers to adapt to Worker HTML -----
function getRowById(id) {
  return (
    document.querySelector(`tr[data-id="${id}"]`) ||
    document.getElementById(`row-${id}`) ||
    document.getElementById(id) ||
    null
  );
}

function ensureRowHasDataId(row) {
  if (!row) return null;
  if (row.dataset && row.dataset.id) return row.dataset.id;

  // Worker often uses id="row_<recid>" or id="row-<recid>"
  const rid = row.getAttribute("id") || "";
  const m = rid.match(/^row[-_](.+)$/);
  if (m && m[1]) {
    row.dataset.id = m[1];
    return m[1];
  }
  return null;
}

function findSaveButton(row) {
  if (!row) return null;

  return (
    row.querySelector('button[onclick^="save("]') ||
    row.querySelector('button[data-action="save"]') ||
    row.querySelector(".save-btn") ||
    row.querySelector(".btn-save") ||
    [...row.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim().toLowerCase() === "save"
    ) ||
    null
  );
}

function wireRow(row) {
  // Ensure thumbnails remain constrained
  row.querySelectorAll("img").forEach((img) => {
    img.classList.add("admin-thumb");
    img.setAttribute("loading", "lazy");
  });

  // Normalise row id -> data-id so our JS can find it later
  const inferredId = ensureRowHasDataId(row);

  // Enable Save only once the user changes something
  const saveBtn = findSaveButton(row);
  if (!saveBtn) return;

  saveBtn.disabled = true;
  saveBtn.classList.remove("is-dirty");

  const markDirty = () => {
    saveBtn.disabled = false;
    saveBtn.classList.add("is-dirty");
  };

  row.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", markDirty, { passive: true });
    el.addEventListener("change", markDirty, { passive: true });
  });

  // If worker used inline onclick="save('recid')" but row id is row-recid,
  // we still rely on window.save; no further action needed.
}

function wireSaveButtons() {
  if (!tableBody) return;

  // Worker may return rows without wrapping tbody; we only wire actual TRs
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach(wireRow);
}

// ----- Authentication -----
async function loginCheck() {
  try {
    const res = await fetch(`${API_BASE}/login-check`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return !!data.loggedIn;
  } catch {
    return false;
  }
}

async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }

  return true;
}

// ----- Load cars -----
async function loadCars() {
  if (!tableBody) return;

  setStatus("Loading vehicles...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      tableBody.innerHTML = "";
      setStatus("Not authenticated — please log in.", "error");
      showLogin("Please log in.");
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
    console.error("Error loading vehicles:", err);
    setStatus("Failed loading vehicles.", "error");
  }
}

// ----- Save / Sold / New vehicle -----
function readFieldsFromRow(row) {
  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach((el) => {
    if (!el.name) return;

    // Skip Sort buttons' unnamed inputs etc.
    const name = el.name;

    // Dates
    if (el.type === "date") {
      fields[name] = el.value ? el.value : null;
      return;
    }

    // Numbers
    if (el.type === "number") {
      if (el.value === "" || el.value === null || typeof el.value === "undefined") {
        fields[name] = null;
      } else {
        const num = Number(el.value);
        fields[name] = Number.isNaN(num) ? null : num;
      }
      return;
    }

    // Everything else (including Airtable single selects)
    const val = (el.value ?? "").toString().trim();
    fields[name] = val === "" ? null : val;
  });

  return fields;
}

async function save(id) {
  const row = getRowById(id);
  if (!row) return;

  const fields = readFieldsFromRow(row);

  setStatus("Saving...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields }),
    });

    const text = await res.text();
    if (!res.ok) {
      // Surface Airtable error message if present
      try {
        const j = JSON.parse(text);
        setStatus(j?.error?.message || "Save failed.", "error");
      } catch {
        setStatus("Save failed.", "error");
      }
      return;
    }

    setStatus("Saved successfully.", "success");
    const saveBtn = findSaveButton(row);
    if (saveBtn) saveBtn.disabled = true;
  } catch (err) {
    console.error("Error saving vehicle:", err);
    setStatus("Save failed.", "error");
  }
}

async function sold(id) {
  const row = getRowById(id);
  if (!row) return;

  const fields = { Status: "Sold" };

  // Preserve Sort_Index if present
  const sortInput = row.querySelector('input[name="Sort_Index"]');
  if (sortInput && sortInput.value !== "") {
    const num = Number(sortInput.value);
    if (!Number.isNaN(num)) fields.Sort_Index = num;
  }

  setStatus("Updating status...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields }),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        setStatus(j?.error?.message || "Action failed.", "error");
      } catch {
        setStatus("Action failed.", "error");
      }
      return;
    }

    setStatus("Marked as sold.", "success");
    await loadCars();
  } catch (err) {
    console.error("Error marking sold:", err);
    setStatus("Action failed.", "error");
  }
}

async function createVehicle() {
  setStatus("Creating vehicle...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/create`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setStatus("Create failed.", "error");
      return;
    }

    setStatus("Vehicle created.", "success");
    await loadCars();
  } catch (err) {
    console.error("Error creating vehicle:", err);
    setStatus("Create failed.", "error");
  }
}

// ----- Logout -----
async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Error logging out:", err);
  } finally {
    window.location.href = "/";
  }
}

// ----- Row order helpers (Sort_Index) -----
function renumberSortIndex() {
  if (!tableBody) return;
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  rows.forEach((r, index) => {
    const input = r.querySelector('input[name="Sort_Index"]');
    if (input) input.value = index + 1;
  });
}

function moveRow(id, direction) {
  const row = getRowById(id);
  if (!row || !row.parentElement) return;

  const sibling =
    direction === "up" ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;

  if (direction === "up") {
    row.parentNode.insertBefore(row, sibling);
  } else {
    row.parentNode.insertBefore(sibling, row);
  }

  renumberSortIndex();

  // Mark row dirty so "Save" becomes available
  const saveBtn = findSaveButton(row);
  if (saveBtn) saveBtn.disabled = false;
}

// ----- Hide Sold/Hidden -----
let hideInactive = false;
function applyHideInactive() {
  if (!tableBody) return;
  tableBody.querySelectorAll("tr").forEach((row) => {
    const statusEl = row.querySelector('select[name="Status"], input[name="Status"]');
    if (!statusEl) return;
    const status = (statusEl.value || "").toString();
    const isInactive = status === "Sold" || status === "Hidden";
    row.style.display = hideInactive && isInactive ? "none" : "";
  });
}

// ----- Event wiring -----
if (refreshBtn) refreshBtn.addEventListener("click", () => loadCars());
if (newVehicleBtn) newVehicleBtn.addEventListener("click", () => createVehicle());
if (logoutBtn) logoutBtn.addEventListener("click", () => logout());

if (hideInactiveBtn) {
  hideInactiveBtn.addEventListener("click", () => {
    hideInactive = !hideInactive;
    hideInactiveBtn.textContent = hideInactive ? "Show Sold / Hidden" : "Hide Sold / Hidden";
    applyHideInactive();
  });
}

// Login form
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = (loginUsername?.value || "").trim();
    const password = (loginPassword?.value || "").trim();

    if (!username || !password) {
      showLogin("Enter username and password.");
      return;
    }

    try {
      if (loginError) loginError.textContent = "";
      await login(username, password);
      hideLogin();
      await loadCars();
    } catch (err) {
      showLogin(err?.message || "Login failed.");
    }
  });
}

// Global functions for inline onclick handlers produced by the Worker
window.save = save;
window.sold = sold;
window.createCar = createVehicle;
window.logout = logout;
window.moveUp = (id) => moveRow(id, "up");
window.moveDown = (id) => moveRow(id, "down");

// Initial: enforce auth before showing data
(async () => {
  const ok = await loginCheck();
  if (!ok) {
    showLogin("");
    if (tableBody) tableBody.innerHTML = "";
    setStatus("Please log in.", "info");
    return;
  }
  hideLogin();
  await loadCars();
})();
