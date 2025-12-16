console.log("Admin dashboard JS loaded");

const overlay = document.getElementById("loginOverlay");
const stockBody = document.getElementById("stockBody");

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const res = await fetch("/api/login-check", {
    credentials: "include"
  });

  const data = await res.json();

  if (data.loggedIn) {
    overlay.style.display = "none";
    await loadStock();
  } else {
    overlay.style.display = "flex";
  }
}

/* =========================
   LOGIN / LOGOUT
========================= */
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    alert("Login failed");
    return;
  }

  location.reload(); // REQUIRED for HttpOnly cookies
}

async function logout() {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });

  location.reload();
}

/* =========================
   LOAD STOCK (THIS IS THE
   CAR DATA DOWNLOAD)
========================= */
async function loadStock() {
  console.log("Loading admin stock…");

  const res = await fetch("/api/admin/all", {
    credentials: "include"
  });

  if (!res.ok) {
    console.error("Failed to load stock");
    return;
  }

  const html = await res.text();
  stockBody.innerHTML = html;
}

/* =========================
   ACTIONS
========================= */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const fields = {};

  row.querySelectorAll("input, select, textarea").forEach(el => {
    fields[el.name] = el.value;
  });

  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  alert("Saved");
}

async function sold(id) {
  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  location.reload();
}
