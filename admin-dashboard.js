console.log("ADMIN DASHBOARD JS LOADED");

const API_BASE = "/admin";

/* ---------------------------
   AUTH
---------------------------- */

async function loginCheck() {
  const res = await fetch(`${API_BASE}/login-check`);
  const data = await res.json();
  return data.loggedIn === true;
}

function logout() {
  fetch(`${API_BASE}/logout`).then(() => {
    location.reload();
  });
}

/* ---------------------------
   LOAD STOCK (ALWAYS RUNS)
---------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  const loggedIn = await loginCheck();

  if (!loggedIn) {
    showLoginModal();
    return;
  }

  await loadStock(); // <-- THIS WAS MISSING / BLOCKED BEFORE
});

/* ---------------------------
   FETCH & RENDER
---------------------------- */

async function loadStock() {
  try {
    const res = await fetch(`${API_BASE}/all`);
    const cars = await res.json();

    const tbody = document.querySelector("#stock-body");
    tbody.innerHTML = "";

    cars.forEach((car, index) => {
      tbody.appendChild(renderRow(car, index));
    });

  } catch (err) {
    alert("Failed to load stock");
    console.error(err);
  }
}

function renderRow(car, index) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><img src="${car.photo || "/assets/placeholder.png"}" width="80"></td>
    <td><input value="${car.make_model || ""}"></td>
    <td><input value="${car.registration || ""}"></td>
    <td><input value="${car.price ?? ""}"></td>
    <td><input value="${car.mileage ?? ""}"></td>
    <td><input type="date" value="${car.mot_date || ""}"></td>
    <td><input value="${car.engine_size ?? ""}"></td>
    <td>
      <select>
        ${["Petrol","Diesel","Hybrid","Electric"].map(f =>
          `<option ${car.fuel_type === f ? "selected":""}>${f}</option>`
        ).join("")}
      </select>
    </td>
    <td><input value="${car.transmission || ""}"></td>
    <td>
      <select>
        ${["Available","Sold"].map(s =>
          `<option ${car.status === s ? "selected":""}>${s}</option>`
        ).join("")}
      </select>
    </td>
    <td><textarea>${car.short_description || ""}</textarea></td>
    <td><textarea>${car.full_description || ""}</textarea></td>
    <td>
      <button onclick="saveRow(${index}, this)">Save</button>
      <button onclick="markSold(${index})">Sold</button>
    </td>
  `;

  return tr;
}

/* ---------------------------
   SAVE (SANITISED)
---------------------------- */

function sanitiseNumber(val) {
  if (val === "" || val === null) return null;
  return Number(String(val).replace(/[£,]/g, ""));
}

function sanitiseString(val) {
  return val?.trim() || "";
}

async function saveRow(index, btn) {
  const tr = btn.closest("tr");
  const inputs = tr.querySelectorAll("input, textarea, select");

  const payload = {
    make_model: sanitiseString(inputs[1].value),
    registration: sanitiseString(inputs[2].value),
    price: sanitiseNumber(inputs[3].value),
    mileage: sanitiseNumber(inputs[4].value),
    mot_date: inputs[5].value || null,
    engine_size: sanitiseNumber(inputs[6].value),
    fuel_type: sanitiseString(inputs[7].value),
    transmission: sanitiseString(inputs[8].value),
    status: sanitiseString(inputs[9].value),
    short_description: sanitiseString(inputs[10].value),
    full_description: sanitiseString(inputs[11].value),
  };

  const res = await fetch(`${API_BASE}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, fields: payload })
  });

  if (!res.ok) {
    const err = await res.text();
    alert("Save failed — see console");
    console.error(err);
  } else {
    alert("Saved");
  }
}
