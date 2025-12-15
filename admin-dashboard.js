const API = "/api";

/* ---------------------------------------------------
   LOGIN CHECK
--------------------------------------------------- */
async function checkLogin() {
  const res = await fetch(`${API}/login-check`, {
    credentials: "include"
  });
  const data = await res.json();

  if (!data.loggedIn) {
    document.getElementById("login-modal").style.display = "flex";
  } else {
    document.getElementById("login-modal").style.display = "none";
    loadInventory();
  }
}

/* ---------------------------------------------------
   LOGIN
--------------------------------------------------- */
async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    document.getElementById("login-error").textContent = "Invalid login";
    return;
  }

  document.getElementById("login-modal").style.display = "none";
  loadInventory();
}

/* ---------------------------------------------------
   LOAD INVENTORY
--------------------------------------------------- */
async function loadInventory() {
  const res = await fetch(`${API}/admin/all`, {
    credentials: "include"
  });

  if (!res.ok) {
    console.error("Failed to load inventory");
    return;
  }

  const html = await res.text();
  document.getElementById("admin-table-body").innerHTML = html;
}

/* ---------------------------------------------------
   SAVE RECORD
--------------------------------------------------- */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach(el => {
    const name = el.name;
    let value = el.value;

    // --- Sanitize numeric fields ---
    if (["Price", "Mileage", "Sort_Index"].includes(name)) {
      value = value === "" ? null : Number(value);
      if (Number.isNaN(value)) value = null;
    }

    fields[name] = value;
  });

  const res = await fetch(`${API}/admin/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, fields })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Update failed:", err);
    alert("Save failed – check numeric fields");
    return;
  }

  console.log("Saved", id);
}

/* ---------------------------------------------------
   MARK SOLD
--------------------------------------------------- */
async function sold(id) {
  await fetch(`${API}/admin/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  loadInventory();
}

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */
document.addEventListener("DOMContentLoaded", checkLogin);
