// =====================================================
// PROJECT 55 MOTORS – ADMIN DASHBOARD JS (FIXED LOGIN)
// =====================================================

const API_BASE = "/api";

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const tableBody = document.getElementById("admin-table-body");
const statusBox = document.getElementById("admin-status");

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------
function setStatus(msg, type = "info") {
  if (!statusBox) return;
  statusBox.textContent = msg;
  statusBox.className = `admin-status ${type}`;
}

function showLogin() {
  loginModal.style.display = "flex";
}

function hideLogin() {
  loginModal.style.display = "none";
}

// -----------------------------------------------------
// LOGIN CHECK ON LOAD
// -----------------------------------------------------
async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, {
    credentials: "include"
  });

  const data = await res.json();

  if (!data.loggedIn) {
    showLogin();
    return false;
  }

  hideLogin();
  return true;
}

// -----------------------------------------------------
// LOGIN SUBMIT (🔥 THIS WAS BROKEN BEFORE)
// -----------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    loginError.textContent = "Invalid login";
    return;
  }

  hideLogin();
  await loadInventory();
});

// -----------------------------------------------------
// LOAD INVENTORY TABLE
// -----------------------------------------------------
async function loadInventory() {
  setStatus("Loading vehicles…");

  const res = await fetch(`${API_BASE}/admin/all`, {
    credentials: "include"
  });

  if (res.status === 401) {
    showLogin();
    setStatus("Please log in", "error");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;

  setStatus("Vehicles loaded", "success");
}

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
(async function init() {
  const ok = await checkLogin();
  if (ok) loadInventory();
})();
