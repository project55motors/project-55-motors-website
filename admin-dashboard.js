// admin-dashboard.js — Project 55 Motors
// - Loads inventory rows from admin-worker (/api/admin/all)
// - Enforces login modal if not authenticated
// - Enables Save button only after edits (prevents "click save does nothing")
// - Adds cache-busting + no-store to prevent stale/empty admin tables

const API_BASE = "/api";

// ---------- DOM ----------
const tableBody = document.getElementById("admin-table-body");
const statusBar = document.getElementById("admin-status");

const hideInactiveBtn = document.getElementById("btn-hide-inactive");
const refreshBtn = document.getElementById("btn-refresh");
const addVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

// Login modal (must exist in admin-dashboard.html)
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-message");

// ---------- Status ----------
function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------- Login modal helpers ----------
function showLogin(message = "") {
  if (loginMsg) loginMsg.textContent = message;
  if (loginModal) loginModal.style.display = "flex";
}

function hideLogin() {
  if (loginMsg) loginMsg.textContent = "";
  if (loginModal) loginModal.style.display = "none";
}

// ---------- Utility ----------
function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function findRow(id) {
  return document.querySelector(`tr[data-id="${id}"]`);
}

function findSaveButton(row) {
  if (!row) return null;
  return (
    row.querySelector('button[onclick^="save("]') ||
    row.querySelector(".btn-save") ||
    row.querySelector(".save-btn") ||
    qsa("button", row).find((b) => (b.textContent || "").trim().toLowerCase() === "save") ||
    null
  );
}

// Ensure images in the admin table never explode in size (some Worker HTML variants omit classes)
function normalizeRowImages(row) {
  qsa("img", row).forEach((img) => {
    img.classList.add("admin-thumb");
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  });
}

// Enable Save only after edit (prevents “Save inactive / no network request”)
function wireRowsForDirtyState() {
  if (!tableBody) return;

  const rows = qsa('tr[data-id]', tableBody);

  rows.forEach((row) => {
    normalizeRowImages(row);

    const saveBtn = findSaveButton(row);
    if (!saveBtn) return;

    // default to disabled until something changes
    saveBtn.disabled = true;
    saveBtn.classList.remove("is-dirty");

    const markDirty = () => {
      saveBtn.disabled = false;
      saveBtn.classList.add("is-dirty");
    };

    qsa("input, textarea, select", row).forEach((el) => {
      el.addEventListener("input", markDirty, { passive: true });
      el.addEventListener("change", markDirty, { passive: true });
    });
  });
}

// ---------- Auth / Session ----------
async function loginCheck() {
  try {
    const res = await fetch(`${API_BASE}/login-check?ts=${Date.now()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return false;

    const data = await res.json().catch(() => ({}));
    return !!data.loggedIn;
  } catch {
    return false;
  }
}

// ---------- Load cars ----------
async function loadCars() {
  setStatus("Loading vehicles…", "info");

  // First check auth; if not logged in, show modal and stop
  const ok = await loginCheck();
  if (!ok) {
    if (tableBody) tableBody.innerHTML = "";
    showLogin("Please log in to access the admin dashboard.");
    setStatus("Not authenticated.", "error");
    return;
  }

  hideLogin();

  try {
    // cache-bust + no-store to kill stale empty-table responses
    const res = await fetch(`${API_BASE}/admin/all?ts=${Date.now()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      if (tableBody) tableBody.innerHTML = "";
      showLogin("Session expired. Please log in again.");
      setStatus("Not authenticated.", "error");
      return;
    }

    if (res.status === 404) {
      // This is almost always a ROUTE issue in Cloudflare
      setStatus("Admin API returned 404. Check Worker route is bound to project55motors.co.uk/api/*", "error");
      return;
    }

    if (!res.ok) {
      setStatus(`Failed loading vehicles. (${res.status})`, "error");
      return;
    }

    const html = await res.text();

    if (tableBody) {
      tableBody.innerHTML = html;
      wireRowsForDirtyState();
    }

    setStatus("Vehicles loaded.", "success");
  } catch (err) {
    console.error("Load error:", err);
    setStatus("Failed loading vehicles (network error).", "error");
  }
}

// ---------- Save / Sold / Create ----------
async function save(id) {
  const row = findRow(id);
  if (!row) return;

  const fields = {};
  qsa("input, textarea, select", row).forEach((el) => {
    if (!el.name) return;

    // numbers → number or null
    if (el.type === "number") {
      const num = el.value === "" ? null : Number(el.value);
      fields[el.name] = Number.isNaN(num) ? null : num;
      return;
    }

    // dates → "" to null (Airtable likes null to clear)
    if (el.type === "date") {
      fields[el.name] = el.value === "" ? null : el.value;
      return;
    }

    // default
    fields[el.name] = el.value === "" ? null : el.value;
  });

  setStatus("Saving…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields }),
    });

    if (res.status === 401 || res.status === 403) {
      showLogin("Session expired. Please log in again.");
      setStatus("Not authenticated.", "error");
      return;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Save failed:", res.status, txt);
      setStatus(`Save failed. (${res.status})`, "error");
      return;
    }

    setStatus("Saved successfully.", "success");

    const saveBtn = findSaveButton(row);
    if (saveBtn) saveBtn.disabled = true;
  } catch (err) {
    console.error("Save error:", err);
    setStatus("Save failed (network error).", "error");
  }
}

async function sold(id) {
  const row = findRow(id);
  if (!row) return;

  setStatus("Updating status…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields: { Status: "Sold" } }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Sold failed:", res.status, txt);
      setStatus(`Action failed. (${res.status})`, "error");
      return;
    }

    setStatus("Marked as sold.", "success");
    await loadCars();
  } catch (err) {
    console.error("Sold error:", err);
    setStatus("Action failed (network error).", "error");
  }
}

async function createVehicle() {
  setStatus("Creating vehicle…", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/create`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Create failed:", res.status, txt);
      setStatus(`Create failed. (${res.status})`, "error");
      return;
    }

    setStatus("Vehicle created.", "success");
    await loadCars();
  } catch (err) {
    console.error("Create error:", err);
    setStatus("Create failed (network error).", "error");
  }
}

// ---------- Logout ----------
async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    window.location.href = "/";
  }
}

// ---------- Buttons ----------
if (refreshBtn) refreshBtn.addEventListener("click", () => loadCars());
if (addVehicleBtn) addVehicleBtn.addEventListener("click", () => createVehicle());
if (logoutBtn) logoutBtn.addEventListener("click", () => logout());

if (hideInactiveBtn) {
  hideInactiveBtn.addEventListener("click", () => {
    if (!tableBody) return;
    const hiding = hideInactiveBtn.dataset.hiding === "1";
    const next = !hiding;

    qsa('tr[data-id]', tableBody).forEach((row) => {
      const status = (qs('select[name="Status"]', row)?.value || "").toLowerCase();
      const isInactive = status === "sold" || status === "hidden";
      row.style.display = next && isInactive ? "none" : "";
    });

    hideInactiveBtn.dataset.hiding = next ? "1" : "0";
    hideInactiveBtn.textContent = next ? "Show Sold / Hidden" : "Hide Sold / Hidden";
  });
}

// ---------- Login submit ----------
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = qs('input[name="username"]', loginForm)?.value || "";
    const password = qs('input[name="password"]', loginForm)?.value || "";

    if (!username || !password) {
      showLogin("Enter username and password.");
      return;
    }

    setStatus("Logging in…", "info");

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        showLogin("Login failed. Check credentials.");
        setStatus("Login failed.", "error");
        return;
      }

      hideLogin();
      await loadCars();
    } catch (err) {
      console.error("Login error:", err);
      showLogin("Login failed (network error).");
      setStatus("Login failed.", "error");
    }
  });
}

// ---------- Expose for Worker inline onclick ----------
window.save = save;
window.sold = sold;

// ---------- Init ----------
(async function init() {
  await loadCars();
})();
