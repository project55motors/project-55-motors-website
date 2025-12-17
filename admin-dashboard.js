const API_BASE = "/api";

/* -------------------------------------------------------
   Load stock into table
------------------------------------------------------- */
async function loadStock() {
  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Stock fetch failed");
    }

    const html = await res.text();

    const tbody = document.querySelector("table tbody");
    if (!tbody) {
      console.error("TABLE <tbody> not found");
      return;
    }

    tbody.innerHTML = html;
  } catch (err) {
    console.error(err);
    alert("Failed to load stock");
  }
}

/* -------------------------------------------------------
   Sanitisation for Airtable
------------------------------------------------------- */
function sanitise(name, value) {
  if (value === undefined || value === null) return null;

  value = value.toString().trim();
  if (value === "") return null;

  if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(name)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (name === "MOT_Date") {
    return value; // yyyy-mm-dd from input[type=date]
  }

  return value;
}

/* -------------------------------------------------------
   Save row
------------------------------------------------------- */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach(el => {
    if (!el.name) return;
    fields[el.name] = sanitise(el.name, el.value);
  });

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(txt);
      alert("Save failed — see console");
      return;
    }

    alert("Saved");
  } catch (err) {
    console.error(err);
    alert("Save failed — see console");
  }
}

/* -------------------------------------------------------
   Mark sold
------------------------------------------------------- */
async function sold(id) {
  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    if (!res.ok) throw new Error();

    loadStock();
  } catch (err) {
    console.error(err);
    alert("Failed to mark sold");
  }
}

/* -------------------------------------------------------
   Logout
------------------------------------------------------- */
async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.reload();
}

/* -------------------------------------------------------
   Init
------------------------------------------------------- */
loadStock();
