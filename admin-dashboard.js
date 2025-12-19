/*************************************************
 * Project 55 Motors – Admin Dashboard
 * FINAL STABLE BUILD (PATCHED – SINGLE SELECT FIX)
 *************************************************/

const API = "/api";

/* ---------- DOM ---------- */

const table = document.getElementById("stockTable");
const loginModal = document.getElementById("loginModal");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

/* ---------- HELPERS ---------- */

const num = v => (v === "" || v === null ? null : Number(v));
const txt = v => (v === "" ? null : v.trim());

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric"];
const transmissionOptions = ["Manual", "Automatic", "Semi-automatic"];
const statusOptions = ["Available", "Sold", "Hidden"];

/* ---------- AUTH ---------- */

async function checkLogin() {
  try {
    const r = await fetch(`${API}/login-check`, { credentials: "include" });
    const j = await r.json();
    j.loggedIn ? showDashboard() : showLogin();
  } catch {
    showLogin();
  }
}

async function login() {
  const r = await fetch(`${API}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value.trim(),
      password: passwordInput.value
    })
  });

  if (!r.ok) return alert("Login failed");
  showDashboard();
}

async function logout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  });
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
  if (!r.ok) return alert("Failed to load stock");

  const cars = await r.json();

  cars.forEach(c => {
    const img = c.Photos?.[0]?.url || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${img ? `<img src="${img}" width="80">` : ""}</td>

      <td><input value="${c.Make_Model || ""}"></td>
      <td><input value="${c.Registration || ""}"></td>
      <td><input type="number" value="${c.Price ?? ""}"></td>
      <td><input type="number" value="${c.Mileage ?? ""}"></td>
      <td><input type="date" value="${c.MOT_Date || ""}"></td>
      <td><input type="number" step="0.1" value="${c.Engine_size ?? ""}"></td>

      <td>
        <select>
          ${fuelOptions.map(f =>
            `<option value="${f}" ${c.Fuel_type === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select>
          ${transmissionOptions.map(t =>
            `<option value="${t}" ${c.Transmission === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select>
          ${statusOptions.map(s =>
            `<option value="${s}" ${c.Status === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>

      <td><textarea>${c.Short_Description || ""}</textarea></td>
      <td><textarea>${c.Full_Description || ""}</textarea></td>

      <td><button onclick="save('${c.id}', this)">Save</button></td>
    `;

    table.appendChild(tr);
  });
}

/* ---------- SAVE (FIXED) ---------- */

async function save(id, btn) {
  const tds = btn.closest("tr").querySelectorAll("td");

  // Helper: return the value from the first form control inside a cell
  const cellValue = (td) => {
    const el = td.querySelector("input, textarea, select");
    return el ? el.value : "";
  };

  const fields = {
    Make_Model: txt(cellValue(tds[1])),
    Registration: txt(cellValue(tds[2])),
    Price: num(cellValue(tds[3])),
    Mileage: num(cellValue(tds[4])),
    MOT_Date: txt(cellValue(tds[5])),
    Engine_size: num(cellValue(tds[6])),
    Fuel_type: txt(cellValue(tds[7])),          // single select
    Transmission: txt(cellValue(tds[8])),       // single select
    Status: txt(cellValue(tds[9])),             // single select
    Short_Description: txt(cellValue(tds[10])),
    Full_Description: txt(cellValue(tds[11]))
  };

  // Normalise empty strings for select/text fields to null (Airtable clears field)
  for (const k of ["Fuel_type", "Transmission", "Status", "Short_Description", "Full_Description", "Make_Model", "Registration", "MOT_Date"]) {
    if (fields[k] === "") fields[k] = null;
  }

  const res = await fetch(`/api/update/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    // IMPORTANT: Worker expects the fields object directly (not wrapped in {fields: ...})
    body: JSON.stringify(fields)
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(`Save failed: ${out.error || "Unknown error"}`);
  } else {
    // Soft-confirm; keep it minimal to avoid UI noise
    console.log("Saved", id);
  }
}

/* ---------- START ---------- */

checkLogin();
