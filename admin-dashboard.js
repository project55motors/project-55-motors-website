async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const inputs = row.querySelectorAll("input, textarea, select");

  const fields = {};

  inputs.forEach(el => {
    if (!el.name) return;

    let key = el.name;
    let value = el.value;

    // ---- FIELD NAME FIXES ----
    if (key === "Fuel") key = "Fuel_type";

    // ---- EMPTY HANDLING ----
    if (value === "") {
      fields[key] = null;
      return;
    }

    // ---- NUMERIC FIELDS ----
    if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(key)) {
      const n = Number(value);
      fields[key] = isNaN(n) ? null : n;
      return;
    }

    // ---- SINGLE SELECTS (string only) ----
    if (["Fuel_type", "Transmission", "Status"].includes(key)) {
      fields[key] = value; // must match option exactly
      return;
    }

    // ---- EVERYTHING ELSE ----
    fields[key] = value;
  });

  try {
    const res = await fetch(`/api/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Save failed: " + (err.error || "Unknown error"));
      return;
    }

    alert("Saved");
  } catch (e) {
    alert("Save failed: Network error");
  }
}
