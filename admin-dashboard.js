/* =========================================================
   PROJECT 55 MOTORS – ADMIN DASHBOARD (FINAL STABLE BUILD)
   ========================================================= */

/* ---------------------------------------------------------
   Utilities
--------------------------------------------------------- */

function qs(sel) {
  return document.querySelector(sel);
}

function alertError(msg) {
  alert(msg);
}

/* ---------------------------------------------------------
   Airtable-safe sanitisation
--------------------------------------------------------- */

function sanitiseField(name, value) {
  if (value === undefined || value === null) return null;

  if (typeof value === "string") {
    value = value
      .replace(/£/g, "")
      .replace(/,/g, "")
      .trim();
  }

  if (value === "") return null;

  // Numeric Airtable fields
  if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(name)) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  // Date field (yyyy-mm-dd)
  if (name === "MOT_Date") {
    return value;
  }

  return value;
}

/* ---------------------------------------------------------
   Airtable attachment compatibility (OLD + NEW formats)
--------------------------------------------------------- */

function getPhotoURL(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return null;

  const p = photos[0];

  if (p.thumbnails?.large?.url) return p.thumbnails.large.url;
  if (p.thumbnails?.small?.url) return p.thumbnails.small.url;
  if (p.url) return p.url;

  return null;
}

/* ---------------------------------------------------------
   Login / Logout
--------------------------------------------------------- */

async function logout() {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });
  location.reload();
}

qs("#logoutBtn")?.addEventListener("click", logout);

/* ---------------------------------------------------------
   Load inventory
--------------------------------------------------------- */

async function loadStock() {
  try {
    const res = await fetch("/api/admin/all", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Stock fetch failed");

    const html = await res.text();
    qs("#stockBody").innerHTML = html;
  } catch (err) {
    console.error(err);
    alertError("Failed to load stock");
  }
}

/* ---------------------------------------------------------
   Save record
--------------------------------------------------------- */

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("[name]").forEach(el => {
    fields[el.name] = sanitiseField(el.name, el.value);
  });

  try {
    const res = await fetch("/api/admin/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Update failed:", txt);
      throw new Error("Update failed");
    }

    alert("Saved");
  } catch (err) {
    console.error(err);
    alertError("Save failed — see console");
  }
}

/* ---------------------------------------------------------
   Mark sold
--------------------------------------------------------- */

async function sold(id) {
  try {
    const res = await fetch("/api/admin/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id,
        fields: { Status: "Sold" }
      })
    });

    if (!res.ok) throw new Error("Sold update failed");

    alert("Marked as sold");
    loadStock();
  } catch (err) {
    console.error(err);
    alertError("Failed to mark sold");
  }
}

/* ---------------------------------------------------------
   Boot
--------------------------------------------------------- */

(async function init() {
  try {
    const res = await fetch("/api/login-check", {
      credentials: "include"
    });
    const data = await res.json();

    if (!data.loggedIn) return;

    await loadStock();
  } catch (err) {
    console.error(err);
    alertError("Initialisation failed");
  }
})();
