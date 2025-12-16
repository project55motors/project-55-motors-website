// ======================================================================
// PROJECT 55 MOTORS – ADMIN DASHBOARD JS (FINAL STABLE BUILD)
// ======================================================================

console.log("Admin dashboard JS loaded");

// ----------------------------------------------------------------------
// DOM helpers
// ----------------------------------------------------------------------

const loginModal = document.getElementById("login-modal");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const tableBody = document.getElementById("admin-table-body");

// ----------------------------------------------------------------------
// LOGIN CHECK ON LOAD
// ----------------------------------------------------------------------

async function checkLogin() {
  try {
    const res = await fetch("/api/login-check", {
      credentials: "include"
    });

    const data = await res.json();
    console.log("login-check:", data);

    if (data.loggedIn) {
      showDashboard();
      loadStock();
    } else {
      showLogin();
    }
  } catch (err) {
    console.error("Login check failed:", err);
    showLogin();
  }
}

// ----------------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------------

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      showDashboard();
      loadStock();
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error");
    }
  });
}

// ----------------------------------------------------------------------
// LOGOUT
// ----------------------------------------------------------------------

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });
    location.reload();
  });
}

// ----------------------------------------------------------------------
// UI STATE
// ----------------------------------------------------------------------

function showLogin() {
  if (loginModal) loginModal.style.display = "block";
  if (dashboard) dashboard.style.display = "none";
}

function showDashboard() {
  if (loginModal) loginModal.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
}

// ----------------------------------------------------------------------
// LOAD STOCK TABLE
// ----------------------------------------------------------------------

async function loadStock() {
  try {
    const res = await fetch("/api/admin/all", {
      credentials: "include"
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t);
    }

    const html = await res.text();
    tableBody.innerHTML = html;

  } catch (err) {
    console.error("Failed to load stock:", err);
    alert("Failed to load stock");
  }
}

// ----------------------------------------------------------------------
// SAVE VEHICLE (STRICT SANITISATION)
// ----------------------------------------------------------------------

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return alert("Row not found");

  const fields = {};

  row.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.name) return;

    let raw = el.value.trim();

    // -------- NUMERIC FIELDS (Airtable Numbers) --------
    if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(el.name)) {
      if (raw === "") {
        fields[el.name] = null;
        return;
      }

      const num = Number(raw);
      if (!Number.isFinite(num)) {
        console.warn(`Invalid number for ${el.name}:`, raw);
        return;
      }

      fields[el.name] = num;
      return;
    }

    // -------- DATE FIELD --------
    if (el.type === "date") {
      fields[el.name] = raw || null;
      return;
    }

    // -------- SELECT FIELDS --------
    if (el.tagName === "SELECT") {
      fields[el.name] = raw || null;
      return;
    }

    // -------- TEXT FIELDS --------
    fields[el.name] = raw === "" ? null : raw;
  });

  try {
    const res = await fetch("/api/admin/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("Update failed:", text);
      alert("Save failed — see console");
      return;
    }

    alert("Saved");
  } catch (err) {
    console.error("Save error:", err);
    alert("Save error");
  }
}

// ----------------------------------------------------------------------
// MARK AS SOLD
// ----------------------------------------------------------------------

async function sold(id) {
  try {
    const res = await fetch("/api/admin/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t);
    }

    loadStock();
  } catch (err) {
    console.error("Sold error:", err);
    alert("Failed to mark as sold");
  }
}

// ----------------------------------------------------------------------
// INITIALISE
// ----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", checkLogin);
