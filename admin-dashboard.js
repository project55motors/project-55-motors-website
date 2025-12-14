/* =========================================================
   PROJECT 55 MOTORS – ADMIN DASHBOARD JS (STABLE)
   - Login modal control
   - Inventory load
   - Save / Sold actions (GLOBAL)
   ========================================================= */

const API_BASE = "/api";

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const tableBody = document.getElementById("admin-table-body");
const statusBox = document.getElementById("admin-status");

/* ------------------------------
   Utility
-------------------------------- */
function setStatus(msg, type = "") {
  statusBox.textContent = msg || "";
  statusBox.className = `admin-status ${type}`;
}

/* ------------------------------
   LOGIN CHECK ON LOAD
-------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await checkLogin();
});

async function checkLogin() {
  try {
    const res = await fetch(`${API_BASE}/login-check`, {
      credentials: "include"
    });

    const data = await res.json();

    if (!data.loggedIn) {
      loginModal.style.display = "flex";
      return;
    }

    loginModal.style.display = "none";
    await loadCars();

  } catch (err) {
    console.error("Login check failed", err);
    loginModal.style.display = "flex";
  }
}

/* ------------------------------
   LOGIN SUBMIT
-------------------------------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      loginError.textContent = "Invalid login";
      return;
    }

    loginModal.style.display = "none";
    await loadCars();

  } catch (err) {
    console.error(err);
    loginError.textContent = "Login failed";
  }
});

/* ------------------------------
   LOAD INVENTORY
-------------------------------- */
async function loadCars() {
  setStatus("Loading vehicles…");

  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (res.status === 401) {
      loginModal.style.display = "flex";
      setStatus("");
      return;
    }

    const html = await res.text();
    tableBody.innerHTML = html;

    setStatus("Vehicles loaded", "success");

  } catch (err) {
    console.error(err);
    setStatus("Failed to load vehicles", "error");
  }
}

/* =========================================================
   GLOBAL ACTIONS (REQUIRED FOR INLINE onclick)
   ========================================================= */

/* ------------------------------
   SAVE VEHICLE
-------------------------------- */
window.save = async function (id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const inputs = row.querySelectorAll("input, select, textarea");
  const fields = {};

  inputs.forEach(el => {
    if (!el.name) return;
    fields[el.name] = el.value;
  });

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      alert("Save failed");
      return;
    }

    setStatus("Saved", "success");

  } catch (err) {
    console.error(err);
    alert("Save error");
  }
};

/* ------------------------------
   MARK SOLD
-------------------------------- */
window.sold = async function (id) {
  if (!confirm("Mark this vehicle as Sold?")) return;

  try {
    await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    await loadCars();

  } catch (err) {
    console.error(err);
    alert("Failed to mark sold");
  }
};
