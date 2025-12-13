// admin-dashboard.js — robust login gate + Airtable write support (matches current admin-worker)

const API_BASE = "/api";

// HTML elements (must match admin-dashboard.html)
const tableBody = document.getElementById("admin-table-body");
const statusBar = document.getElementById("admin-status");

const hideInactiveBtn = document.getElementById("btn-hide-inactive");
const refreshBtn = document.getElementById("btn-refresh");
const addVehicleBtn = document.getElementById("btn-add-vehicle");
const logoutBtn = document.getElementById("btn-logout");

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-message");
const loginUser = document.getElementById("login-username");
const loginPass = document.getElementById("login-password");

// ---------------- Status helper ----------------
function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `admin-status admin-status-${type}`;
}

// ---------------- Modal helpers ----------------
function showLogin(message = "") {
  if (loginMsg) loginMsg.textContent = message;
  if (loginModal) loginModal.style.display = "flex";
  setStatus("Not logged in — please sign in.", "error");
}

function hideLogin() {
  if (loginMsg) loginMsg.textContent = "";
  if (loginModal) loginModal.style.display = "none";
}

// ---------------- Auth ----------------
async function loginCheck() {
  const res = await fetch(`${API_BASE}/login-check`, { credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  return data.loggedIn === true;
}

async function doLogin(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    let msg = "Login failed.";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    return { ok: false, msg };
  }

  return { ok: true, msg: "" };
}

// ---------------- Load inventory ----------------
async function loadCars() {
  if (!tableBody) return;

  setStatus("Loading vehicles…", "info");

  const authed = await loginCheck();
  if (!authed) {
    tableBody.innerHTML = "";
    showLogin("");
    return;
  }

  hideLogin();

  const res = await fetch(`${API_BASE}/admin/all`, { credentials: "include" });

  // admin-worker returns 403 when cookie not present
  if (res.status === 403) {
    tableBody.innerHTML = "";
    showLogin("Session expired — please log in again.");
    return;
  }

  if (!res.ok) {
    tableBody.innerHTML = "";
    setStatus("Failed loading vehicles.", "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;

  wireRows();
  setStatus("Vehicles loaded.", "success");

  // Re-apply filter if user toggled it on
  if (hideInactiveState) applyHideInactive();
}

// ---------------- Row wiring (Save enablement + image sizing safety) ----------------
function findSaveButton(row) {
  return (
    row.querySelector('button[onclick^="save("]') ||
    row.querySelector(".btn-save") ||
    [...row.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim().toLowerCase() === "save"
    ) ||
    null
  );
}

function wireRows() {
  if (!tableBody) return;

  tableBody.querySelectorAll("tr[id^='row-']").forEach((row) => {
    const id = row.id.replace("row-", "");
    row.dataset.id = id;

    // Ensure images can never explode the row height
    row.querySelectorAll("img").forEach((img) => {
      img.style.width = "84px";
      img.style.height = "56px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "10px";
      img.style.display = "block";
      img.setAttribute("loading", "lazy");
    });

    const saveBtn = findSaveButton(row);
    if (!saveBtn) return;

    // Start disabled until edited
    saveBtn.disabled = true;

    const markDirty = () => {
      saveBtn.disabled = false;
    };

    row.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("input", markDirty, { passive: true });
      el.addEventListener("change", markDirty, { passive: true });
    });
  });
}

// ---------------- Save / Sold / Create ----------------
function extractRowFields(row) {
  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach((el) => {
    if (!el.name) return;

    // Numbers: empty -> null, otherwise parsed
    if (el.type === "number") {
      const num = el.value === "" ? null : Number(el.value);
      fields[el.name] = Number.isNaN(num) ? null : num;
      return;
    }

    // Dates: pass through as YYYY-MM-DD (or empty string)
    fields[el.name] = el.value;
  });

  return fields;
}

window.save = async function (id) {
  const row = document.querySelector(`#row-${id}`);
  if (!row) return;

  const fields = extractRowFields(row);
  setStatus("Saving…", "info");

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

  setStatus("Saved successfully.", "success");

  const saveBtn = findSaveButton(row);
  if (saveBtn) saveBtn.disabled = true;
};

window.sold = async function (id) {
  setStatus("Updating status…", "info");

  const res = await fetch(`${API_BASE}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });

  if (!res.ok) {
    setStatus("Action failed.", "error");
    return;
  }

  setStatus("Marked as sold.", "success");
  await loadCars();
};

async function createVehicle() {
  setStatus("Creating vehicle…", "info");

  const res = await fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    credentials: "include"
  });

  if (!res.ok) {
    setStatus("Create failed.", "error");
    return;
  }

  setStatus("Vehicle created.", "success");
  await loadCars();
}

// ---------------- Logout ----------------
async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  } catch {}
  window.location.href = "/";
}

// ---------------- Hide Sold/Hidden filter ----------------
let hideInactiveState = false;

function applyHideInactive() {
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll("tr[id^='row-']");
  rows.forEach((row) => {
    const statusSelect = row.querySelector('select[name="Status"]');
    const status = (statusSelect?.value || "").toLowerCase();

    const isInactive = status === "sold" || status === "hidden";
    row.style.display = hideInactiveState && isInactive ? "none" : "";
  });
}

// ---------------- Events ----------------
refreshBtn?.addEventListener("click", loadCars);
addVehicleBtn?.addEventListener("click", createVehicle);
logoutBtn?.addEventListener("click", logout);

hideInactiveBtn?.addEventListener("click", () => {
  hideInactiveState = !hideInactiveState;
  hideInactiveBtn.textContent = hideInactiveState ? "Show Sold / Hidden" : "Hide Sold / Hidden";
  applyHideInactive();
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = (loginUser?.value || "").trim();
  const password = loginPass?.value || "";

  if (!username || !password) {
    showLogin("Please enter username and password.");
    return;
  }

  if (loginMsg) loginMsg.textContent = "Signing in…";

  const result = await doLogin(username, password);
  if (!result.ok) {
    showLogin(result.msg || "Login failed.");
    return;
  }

  hideLogin();
  await loadCars();
});

// ---------------- Init ----------------
(async function init() {
  setStatus("Checking login…", "info");
  await loadCars();
})();
