console.log("ADMIN DASHBOARD JS LOADED");

const API = "/admin";

/* ---------------- AUTH ---------------- */

async function loginCheck() {
  const res = await fetch(`${API}/login-check`);
  const data = await res.json();
  return data.loggedIn === true;
}

function logout() {
  fetch(`${API}/logout`, { method: "POST" }).then(() => location.reload());
}

/* ---------------- LOAD ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await loginCheck())) return;
  loadStock();
});

async function loadStock() {
  const res = await fetch(`${API}/all`);
  if (!res.ok) {
    console.error("Load failed");
    return;
  }

  const cars = await res.json();
  const tbody = document.getElementById("stock-body");
  tbody.innerHTML = "";

  cars.forEach(car => tbody.appendChild(renderRow(car)));
}

/* ---------------- RENDER ---------------- */

function renderRow(car) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><img src="${car.photo || "/assets/placeholder.png"}" width="80"></td>
    <td><input value="${car.Make_Model || ""}"></td>
    <td><input value="${car.Registration || ""}"></td>
    <td><input type="number" step="1" value="${car.Price ?? ""}"></td>
    <td><input type="number" step="1" value="${car.Mileage ?? ""}"></td>
    <td><input type="date" value="${car.MOT_Date || ""}"></td>
    <td><input type="number" step="0.1" value="${car.Engine_size ?? ""}"></td>
    <td>
      <select>
        ${["Petrol","Diesel","Hybrid","Electric"].map(f =>
          `<option ${car.Fuel_type === f ? "selected":""}>${f}</option>`
        ).join("")}
      </select>
    </td>
    <td><input value="${car.Transmission || ""}"></td>
    <td>
      <select>
        ${["Available","Sold","Hidden"].map(s =>
          `<option ${car.Status === s ? "selected":""}>${s}</option>`
        ).join("")}
      </select>
    </td>
    <td><textarea>${car.Short_Description || ""}</textarea></td>
    <td><textarea>${car.Full_Description || ""}</textarea></td>
    <td>
      <button onclick="saveRow('${car.id}', this)">Save</button>
    </td>
  `;

  return tr;
}

/* ---------------- SAVE ---------------- */

function num(v) {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function saveRow(id, btn) {
  const tr = btn.closest("tr");
  const i = tr.querySelectorAll("input, textarea, select");

  const fields = {
    Make_Model: i[1].value.trim(),
    Registration: i[2].value.trim(),
    Price: num(i[3].value),
    Mileage: num(i[4].value),
    MOT_Date: i[5].value || null,
    Engine_size: num(i[6].value),
    Fuel_type: i[7].value,
    Transmission: i[8].value.trim(),
    Status: i[9].value,
    Short_Description: i[10].value.trim(),
    Full_Description: i[11].value.trim()
  };

  const res = await fetch(`${API}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields })
  });

  if (!res.ok) {
    console.error(await res.text());
    alert("Save failed");
  } else {
    alert("Saved");
  }
}
