console.log("Admin dashboard JS loaded");

const overlay  = document.getElementById("loginOverlay");
const app      = document.getElementById("app");
const errorBox = document.getElementById("loginError");
const tbody    = document.getElementById("stockBody");

// -----------------------------------------------------
// AUTH
// -----------------------------------------------------
async function checkLogin() {
  console.log("Checking login status…");

  const res = await fetch("/api/login-check", {
    credentials: "include"
  });

  const data = await res.json();
  console.log("login-check response:", data);

  if (data.loggedIn) {
    showApp();
    loadAdminTable();
  } else {
    showLogin();
  }
}

function showLogin() {
  overlay.style.display = "flex";
  app.style.display = "none";
}

function showApp() {
  overlay.style.display = "none";
  app.style.display = "block";
}

// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------
document.getElementById("loginBtn").onclick = async () => {
  errorBox.style.display = "none";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  console.log("login response:", data);

  if (data.success) {
    showApp();
    loadAdminTable();
  } else {
    errorBox.textContent = data.error || "Login failed";
    errorBox.style.display = "block";
  }
};

// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------
document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });
  location.reload();
};

// -----------------------------------------------------
// ADMIN TABLE (THIS WAS THE BUG)
// -----------------------------------------------------
async function loadAdminTable() {
  console.log("Loading admin table…");

  const res = await fetch("/api/admin/all", {
    credentials: "include"
  });

  if (res.status === 401) {
    console.warn("Session expired");
    showLogin();
    return;
  }

  const html = await res.text();
  console.log("Admin table HTML received");

  tbody.innerHTML = html;
}

// -----------------------------------------------------
// SAVE / SOLD (USED BY WORKER-GENERATED HTML)
// -----------------------------------------------------
window.save = async function (id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("input, textarea, select").forEach(el => {
    fields[el.name] = el.value;
  });

  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  console.log("Saved", id);
};

window.sold = async function (id) {
  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  loadAdminTable();
};

// -----------------------------------------------------
// BOOT
// -----------------------------------------------------
checkLogin();
