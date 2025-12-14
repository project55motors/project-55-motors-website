// ======================================================================
// PROJECT 55 MOTORS – ADMIN DASHBOARD JS (FIXED LOGIN PIPELINE)
// ======================================================================

const API_BASE = "/api";

const loginModal = document.getElementById("login-modal");
const loginForm  = document.getElementById("login-form");
const statusEl   = document.getElementById("login-status");

const tableBody  = document.getElementById("admin-table-body");

// ----------------------------------------------------------------------
// Utility
// ----------------------------------------------------------------------
function showLogin(msg = "") {
  loginModal.style.display = "flex";
  if (statusEl) statusEl.textContent = msg;
}

function hideLogin() {
  loginModal.style.display = "none";
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ----------------------------------------------------------------------
// LOGIN CHECK ON LOAD
// ----------------------------------------------------------------------
async function checkLogin() {
  const res = await fetch(`${API_BASE}/login-check`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const data = await res.json();

  if (!data.loggedIn) {
    showLogin("Please log in");
    return false;
  }

  hideLogin();
  return true;
}

// ----------------------------------------------------------------------
// LOGIN HANDLER (FIXED)
// ----------------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // 🚨 CRITICAL

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!username || !password) {
    setStatus("Enter username and password");
    return;
  }

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    setStatus("Invalid login");
    return;
  }

  setStatus("");
  hideLogin();
  loadInventory();
});

// ----------------------------------------------------------------------
// LOAD INVENTORY
// ----------------------------------------------------------------------
async function loadInventory() {
  const res = await fetch(`${API_BASE}/admin/all`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 401) {
    showLogin("Session expired. Please log in.");
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
}

// ----------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------
(async () => {
  const ok = await checkLogin();
  if (ok) {
    loadInventory();
  }
})();
