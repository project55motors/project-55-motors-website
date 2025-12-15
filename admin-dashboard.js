console.log("Admin dashboard JS loaded");

const overlay = document.getElementById("loginOverlay");
const app = document.getElementById("app");
const errorBox = document.getElementById("loginError");

async function checkLogin() {
  console.log("Checking login status…");

  const res = await fetch("/api/login-check", {
    credentials: "include"
  });

  const data = await res.json();
  console.log("login-check response:", data);

  if (data.loggedIn) {
    showApp();
    loadStock();
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
    loadStock();
  } else {
    errorBox.textContent = data.error || "Login failed";
    errorBox.style.display = "block";
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });
  location.reload();
};

async function loadStock() {
  console.log("Loading stock…");

  // ✅ CORRECT cars-api ENDPOINT
  const res = await fetch("/cars-api/");
  const data = await res.json();

  console.log("Stock data:", data);

  if (!Array.isArray(data.records)) {
    console.error("Invalid stock payload", data);
    return;
  }

  const tbody = document.getElementById("stockBody");
  tbody.innerHTML = "";

  data.records.forEach(rec => {
    const f = rec.fields || {};

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.Registration || ""}</td>
      <td>${f.Make_Model || ""}</td>
      <td>${f.Price ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

// boot
checkLogin();
