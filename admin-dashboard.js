// admin-dashboard.js — FINAL STABLE VERSION (Airtable-safe)
console.log("ADMIN DASHBOARD JS LOADED");

const API_BASE = "/admin-worker";

/* -------------------------
   Helpers: sanitisation
-------------------------- */

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function toText(value) {
  if (value === undefined || value === null) return null;
  const v = value.trim();
  return v === "" ? null : v;
}

function normaliseEngineSize(value) {
  const n = toNumber(value);
  return n === null ? null : Number(n.toFixed(1));
}

function normaliseFuelType(value) {
  if (!value) return null;

  const map = {
    petrol: "Petrol",
    diesel: "Diesel",
    hybrid: "Hybrid",
    electric: "Electric"
  };

  const key = value.toLowerCase();
  return map[key] || null;
}

function normaliseStatus(value) {
  if (!value) return null;
  return value === "Sold" ? "Sold" : "Available";
}

/* -------------------------
   Load stock
-------------------------- */

async function loadStock() {
  const res = await fetch(`${API_BASE}/all`);
  if (!res.ok) throw new Error("Failed to load stock");
  return res.json();
}

/* -------------------------
   Save row
-------------------------- */

async function saveRow(recordId, row) {
  const payload = {
    id: recordId,
    fields: {
      Registration: toText(row.registration),
      Make_Model: toText(row.makeModel),
      Price: toNumber(row.price),
      Mileage: toNumber(row.mileage),
      MOT_Date: row.motDate || null,
      Engine_size: normaliseEngineSize(row.engine),
      Fuel_type: normaliseFuelType(row.fuel),
      Transmission: toText(row.transmission),
      Status: normaliseStatus(row.status),
      Short_Description: toText(row.shortDesc),
      Full_Description: toText(row.fullDesc)
    }
  };

  const res = await fetch(`${API_BASE}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Update failed");
  }
}

/* -------------------------
   UI wiring (simplified)
-------------------------- */

document.addEventListener("click", async (e) => {
  if (!e.target.matches(".save-btn")) return;

  const rowEl = e.target.closest("tr");

  const row = {
    makeModel: rowEl.querySelector(".make-model").value,
    registration: rowEl.querySelector(".registration").value,
    price: rowEl.querySelector(".price").value,
    mileage: rowEl.querySelector(".mileage").value,
    motDate: rowEl.querySelector(".mot-date").value,
    engine: rowEl.querySelector(".engine").value,
    fuel: rowEl.querySelector(".fuel").value,
    transmission: rowEl.querySelector(".transmission").value,
    status: rowEl.querySelector(".status").value,
    shortDesc: rowEl.querySelector(".short-desc").value,
    fullDesc: rowEl.querySelector(".full-desc").value
  };

  const recordId = rowEl.dataset.id;

  try {
    await saveRow(recordId, row);
    alert("Saved");
  } catch (err) {
    alert(`Save failed — ${err.message}`);
    console.error(err);
  }
});
