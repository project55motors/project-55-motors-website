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
const loginBtn = document.getElementById("loginBtn");

/* ---------- Helpers ---------- */

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function txt(v) {
  if (v === "" || v === null || v === undefined) return "";
  return String(v).trim();
}

/* ---------- Auth ---------- */

async function checkLogin() {
  try {
    const res = await fetch(`${API}/login-check`, {
      method: "GET",
      credentials: "include"
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.loggedIn) {
        loginModal.style.display = "none";
        dashboard.style.display = "block";
        await loadStock();
        return;
      }
    }
  } catch (e) {
    console.error("Login check failed", e);
  }

  loginModal.style.display = "block";
  dashboard.style.display = "none";
}

async function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) throw new Error("Unauthorized");

    await checkLogin();
  } catch (e) {
    alert("Login failed");
  }
}

async function logout() {
  try {
    await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (e) {
    // ignore
  }
  location.reload();
}

/* ---------- Stock ---------- */

async function loadStock() {
  try {
    const res = await fetch(`${API}/all`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("Failed to load stock:", res.status, t);
      throw new Error("Failed to load stock");
    }

    const cars = await res.json();

    table.innerHTML = "";

    for (const car of cars) {
      const tr = document.createElement("tr");

      const fuelOptions = ["", "Petrol", "Diesel", "Hybrid", "Electric"];
      const transOptions = ["", "Manual", "Automatic", "Semi-automatic"];
      const statusOptions = ["", "Available", "Sold"];

      tr.innerHTML = `
        <td>
          <img src="${(car.Photos && car.Photos[0] && car.Photos[0].url) ? car.Photos[0].url : "/placeholder.png"}" style="width:60px;height:40px;object-fit:cover;">
        </td>
        <td><input value="${car.Make_Model || ""}"></td>
        <td><input value="${car.Registration || ""}"></td>
        <td><input type="number" value="${car.Price ?? ""}"></td>
        <td><input type="number" value="${car.Mileage ?? ""}"></td>
        <td><input type="date" value="${car.MOT_Date || ""}"></td>
        <td><input type="number" step="0.1" value="${car.Engine_size ?? ""}"></td>

        <td>
          <select>
            ${fuelOptions.map(v => `<option value="${v}" ${car.Fuel_type === v ? "selected" : ""}>${v || "—"}</option>`).join("")}
          </select>
        </td>

        <td>
          <select>
            ${transOptions.map(v => `<option value="${v}" ${car.Transmission === v ? "selected" : ""}>${v || "—"}</option>`).join("")}
          </select>
        </td>

        <td>
          <select>
            ${statusOptions.map(v => `<option value="${v}" ${car.Status === v ? "selected" : ""}>${v || "—"}</option>`).join("")}
          </select>
        </td>

        <td><textarea rows="2" style="width:240px">${car.Short_Description || ""}</textarea></td>
        <td><textarea rows="2" style="width:260px">${car.Full_Description || ""}</textarea></td>
        <td><button onclick="save('${car.id}', this)">Save</button></td>
      `;

      table.appendChild(tr);
    }
  } catch (e) {
    alert("Failed to load stock");
    console.error(e);
  }
}

/* ---------- Save ---------- */

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

/* ---------- Wire up ---------- */

if (loginBtn) loginBtn.addEventListener("click", login);
if (logoutBtn) logoutBtn.addEventListener("click", logout);

/* ---------- START ---------- */

checkLogin();
