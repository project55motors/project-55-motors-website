/* =========================================================
   PROJECT 55 MOTORS – ADMIN DASHBOARD JS (FIXED)
   - Correct Airtable update payload
   - Single-select fields now update correctly
   ========================================================= */

console.log("ADMIN DASHBOARD JS LOADED");

const API = "/api";

/* ---------- AUTH ---------- */

async function checkLogin() {
  const r = await fetch(`${API}/login-check`, {
    credentials: "include"
  });

  if (!r.ok) return false;
  const j = await r.json();
  return j.loggedIn === true;
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const r = await fetch(`${API}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!r.ok) {
    alert("Login failed");
    return;
  }

  location.reload();
}

async function logout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  });

  location.reload();
}

/* ---------- LOAD STOCK ---------- */

async function loadStock() {
  const r = await fetch(`${API}/all`, {
    credentials: "include"
  });

  if (!r.ok) {
    alert("Failed to load stock");
    return;
  }

  const records = await r.json();
  document.getElementById("stock-body").innerHTML = records
    .map(renderRow)
    .join("");
}

/* ---------- SAVE VEHICLE ---------- */

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const inputs = row.querySelectorAll("input, select, textarea");

  const fields = {};

  inputs.forEach(el => {
    const name = el.name;
    if (!name) return;

    let value = el.value;

    // Normalize empty → null
    if (value === "") {
      fields[name] = null;
      return;
    }

    // Numeric fields
    if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(name)) {
      const n = Number(value);
      fields[name] = isNaN(n) ? null : n;
      return;
    }

    // Everything else (INCLUDING single-selects)
    fields[name] = value;
  });

  const r = await fetch(`${API}/update/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields) // <-- CRITICAL FIX
  });

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    alert("Save failed: " + (j.error || "Unknown error"));
    return;
  }

  console.log("Saved", id);
}

/* ---------- RENDER ---------- */

function renderRow(r) {
  return `
<tr data-id="${r.id}">
  <td>${r.Make_Model || ""}</td>

  <td><input name="Registration" value="${r.Registration || ""}"></td>
  <td><input name="Price" type="number" value="${r.Price ?? ""}"></td>
  <td><input name="Mileage" type="number" value="${r.Mileage ?? ""}"></td>
  <td><input name="MOT_Date" type="date" value="${r.MOT_Date || ""}"></td>
  <td><input name="Engine_size" value="${r.Engine_size ?? ""}"></td>

  <td>
    <select name="Fuel_type">
      ${selectOption("Petrol", r.Fuel_type)}
      ${selectOption("Diesel", r.Fuel_type)}
      ${selectOption("Hybrid", r.Fuel_type)}
      ${selectOption("Electric", r.Fuel_type)}
    </select>
  </td>

  <td>
    <select name="Transmission">
      ${selectOption("Manual", r.Transmission)}
      ${selectOption("Automatic", r.Transmission)}
      ${selectOption("Semi-automatic", r.Transmission)}
    </select>
  </td>

  <td>
    <select name="Status">
      ${selectOption("Available", r.Status)}
      ${selectOption("Sold", r.Status)}
    </select>
  </td>

  <td><textarea name="Short_Description">${r.Short_Description || ""}</textarea></td>
  <td><textarea name="Full_Description">${r.Full_Description || ""}</textarea></td>

  <td>
    <button onclick="save('${r.id}')">Save</button>
  </td>
</tr>`;
}

function selectOption(value, current) {
  return `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`;
}

/* ---------- INIT ---------- */

(async () => {
  if (await checkLogin()) {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadStock();
  }
})();
