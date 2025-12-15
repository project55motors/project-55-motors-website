console.log("Admin dashboard JS loaded");

const overlay = document.getElementById("login-overlay");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const app = document.getElementById("admin-app");
const logoutBtn = document.getElementById("logout-btn");

/* ---------- AUTH ---------- */

async function checkLogin() {
  console.log("Checking login status…");
  const res = await fetch("/api/login-check");
  const data = await res.json();
  console.log("login-check response:", data);

  if (data.loggedIn) {
    showApp();
    await loadStock();
  }
}

async function login() {
  loginError.style.display = "none";

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  console.log("Attempting login…");

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  console.log("login response:", data);

  if (!data.success) {
    loginError.style.display = "block";
    return;
  }

  showApp();
  await loadStock();
}

function showApp() {
  overlay.style.display = "none";
  app.style.display = "block";
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
}

/* ---------- DATA ---------- */

async function loadStock() {
  console.log("Loading stock…");
  const res = await fetch("/api/all");
  const cars = await res.json();
  console.log("Stock data:", cars);

  const tbody = document.querySelector("#stock-table tbody");
  tbody.innerHTML = "";

  cars.forEach(car => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${car.Registration || ""}</td>
      <td>${car.Make_Model || ""}</td>
      <td>${car.Price || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- EVENTS ---------- */

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

/* ---------- INIT ---------- */

checkLogin();
