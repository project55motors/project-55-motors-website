const API = "/api";

const loginModal = document.getElementById("login-modal");
const loginBtn   = document.getElementById("login-btn");
const loginUser  = document.getElementById("login-user");
const loginPass  = document.getElementById("login-pass");
const loginError = document.getElementById("login-error");
const app        = document.getElementById("app");
const tableBody  = document.getElementById("admin-table-body");
const logoutBtn  = document.getElementById("logout-btn");

// ----------------------
// AUTH CHECK
// ----------------------
async function checkLogin() {
  const res = await fetch(`${API}/login-check`, {
    credentials: "include"
  });

  const data = await res.json();

  if (data.loggedIn) {
    loginModal.style.display = "none";
    app.style.display = "block";
    loadInventory();
  } else {
    loginModal.style.display = "flex";
    app.style.display = "none";
  }
}

// ----------------------
// LOGIN
// ----------------------
loginBtn.onclick = async () => {
  loginError.style.display = "none";

  const res = await fetch(`${API}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: loginUser.value,
      password: loginPass.value
    })
  });

  if (!res.ok) {
    loginError.style.display = "block";
    return;
  }

  await checkLogin();
};

// ----------------------
// LOGOUT
// ----------------------
logoutBtn.onclick = async () => {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.reload();
};

// ----------------------
// LOAD INVENTORY
// ----------------------
async function loadInventory() {
  const res = await fetch(`${API}/admin/all`, {
    credentials: "include"
  });

  if (res.status === 401) {
    loginModal.style.display = "flex";
    app.style.display = "none";
    return;
  }

  const html = await res.text();
  tableBody.innerHTML = html;
}

// ----------------------
// SAVE RECORD
// ----------------------
window.save = async (id) => {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const inputs = row.querySelectorAll("input, select, textarea");

  const fields = {};
  inputs.forEach(el => {
    fields[el.name] = el.value;
  });

  await fetch(`${API}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });
};

// ----------------------
// SOLD
// ----------------------
window.sold = async (id) => {
  await fetch(`${API}/admin/update`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });
  loadInventory();
};

// ----------------------
checkLogin();
