/*************************************************
 * Project 55 Motors – Admin Dashboard
 * FINAL, ROUTE-CORRECT VERSION
 *************************************************/

const API = "/api"; // ✅ MUST match Cloudflare Worker route

const table = document.getElementById("stockTable");
const loginModal = document.getElementById("loginModal");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

console.log("ADMIN DASHBOARD JS LOADED");

/* ---------- HELPERS ---------- */

const num = v => (v === "" || v === null ? null : Number(v));
const txt = v => (v || "").trim();

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric"];

/* ---------- AUTH ---------- */

async function checkLogin() {
  try {
    const r = await fetch(`${API}/login-check`, { credentials: "include" });
    if (!r.ok) throw new Error("Login check failed");

    const j = await r.json();
    j.loggedIn ? showDashboard() : showLogin();
  } catch (e) {
    console.error("Login check error:", e);
    showLogin();
  }
}

async function login() {
  const u = username.value.trim();
  const p = password.value.trim();

  const r = await fetch(`${API}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  });

  const j = await r.json();
  if (!j.ok) return alert("Login failed");

  showDashboard();
}

async function logout() {
  await fetch(`${API}/logout`, { credentials: "include" });
  location.reload();
}

logoutBtn.onclick = logout;

/* ---------- UI ---------- */

function showLogin() {
  loginModal.style.display = "block";
  dashboard.style.display = "none";
  logoutBtn.style.display = "none";
}

function showDashboard() {
  loginModal.style.display = "none";
  dashboard.style.display = "block";
  logoutBtn.style.display = "inline-block";
  loadStock();
}

/* ---------- LOAD STOCK ---------- */

async function loadStock() {
  table.innerHTML = "";

  const r = await fetch(`${API}/all`, { credentials: "include" });
  if (!r.ok) {
    alert("Failed to load stock (API unreachable)");
    return;
  }

  const cars = await r.json();

  cars.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.Photo ? `<img src="${c.Photo}" width="80">` : ""}</td>

      <td><input value="${c.Make_Model || ""}"></td>
      <td><input value="${c.Registration || ""}"></td>

      <td><input type="number" value="${c.Price ?? ""}"></td>
      <td><input type="number" value="${c.Mileage ?? ""}"></td>

      <td><input type="date" value="${c.MOT_Date || ""}"></td>

      <td>
        <input type="number" step="0.1" value="${c.Engine_size ?? ""}">
      </td>

      <td>
        <select>
          ${fuelOptions.map(f =>
            `<option value="${f}" ${c.Fuel_type === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td><input value="${c.Transmission || ""}"></td>
      <td><input value="${c.Status || ""}"></td>

      <td><textarea>${c.Short_Description || ""}</textarea></td>
      <td><textarea>${c.Full_Description || ""}</textarea></td>

      <td>
        <button onclick="save('${c.id}', this)">Save</button>
      </td>
    `;

    table.appendChild(tr);
  });
}

/* ---------- SAVE ---------- */

async function save(id, btn) {
  const tds = btn.closest("tr").querySelectorAll("td");

  const payload = {
    Make_Model: txt(tds[1].firstChild.value),
    Registration: txt(tds[2].firstChild.value),
    Price: num(tds[3].firstChild.value),
    Mileage: num(tds[4].firstChild.value),
    MOT_Date: tds[5].firstChild.value || null,
    Engine_size: num(tds[6].firstChild.value), // numeric, sortable
    Fuel_type: tds[7].firstChild.value,        // exact Airtable select
    Transmission: txt(tds[8].firstChild.value),
    Status: txt(tds[9].firstChild.value),
    Short_Description: txt(tds[10].firstChild.value),
    Full_Description: txt(tds[11].firstChild.value)
  };

  const r = await fetch(`${API}/update/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const e = await r.json();
    alert("Save failed: " + e.error);
  }
}

/* ---------- START ---------- */

checkLogin();
