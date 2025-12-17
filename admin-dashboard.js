const API_BASE = "/api";

async function loadStock() {
  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Failed to load stock");

    const html = await res.text();
    document.querySelector("#stock-body").innerHTML = html;
  } catch (err) {
    alert("Failed to load stock");
    console.error(err);
  }
}

function sanitiseValue(name, value) {
  if (value === undefined || value === null) return null;

  value = value.toString().trim();

  if (value === "") return null;

  // Numeric fields
  if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(name)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  // Date field (ISO required)
  if (name === "MOT_Date") {
    return value; // already yyyy-mm-dd from <input type="date">
  }

  // Selects / text
  return value;
}

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};

  row.querySelectorAll("input, textarea, select").forEach(el => {
    const name = el.name;
    if (!name) return;

    fields[name] = sanitiseValue(name, el.value);
  });

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
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

async function sold(id) {
  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    if (!res.ok) throw new Error("Failed");

    alert("Marked as sold");
    loadStock();
  } catch (err) {
    console.error(err);
    alert("Failed to mark as sold");
  }
}

async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.reload();
}

// Initial load
loadStock();