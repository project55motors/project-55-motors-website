/* =========================================================
   PROJECT 55 MOTORS – ADMIN DASHBOARD (FINAL STABLE BUILD)
   ========================================================= */

function qs(sel) { return document.querySelector(sel); }

/* -------------------- SANITISATION -------------------- */

function sanitiseField(name, value) {
  if (value === undefined || value === null) return null;

  // Normalise strings
  if (typeof value === "string") {
    value = value.replace(/£/g, "").replace(/,/g, "").trim();
  }

  if (value === "") return null;

  // Airtable numeric fields
  if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(name)) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  // Date field (yyyy-mm-dd)
  if (name === "MOT_Date") return value;

  return value;
}

/* -------------------- LOGIN FLOW -------------------- */

async function checkLogin() {
  const res = await fetch("/api/login-check", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return !!data.loggedIn;
}

async function login(username, password) {
  const res = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Login failed");
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  location.reload();
}

/* -------------------- STOCK LOAD -------------------- */

async function loadStock() {
  try {
    const res = await fetch("/api/admin/all", { credentials: "include" });
    if (res.status === 401) {
      alert("Session expired — please log in again");
      location.reload();
      return;
    }
    if (!res.ok) throw new Error("Stock load failed");

    const html = await res.text();
    qs("#stockBody").innerHTML = html;
  } catch (err) {
    console.error(err);
    alert("Failed to load stock");
  }
}

/* -------------------- SAVE / SOLD -------------------- */

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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    const text = await res.text();
    if (!res.ok) {
      const msg = JSON.parse(text)?.error?.message || "Save failed";
      console.error("Update failed:", text);
      alert(`Save failed — ${msg}`);
      return;
    }

    alert("Saved");
  } catch (err) {
    console.error(err);
    alert("Save failed — see console");
  }
}

async function sold(id) {
  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fields: { Status: "Sold" } })
  });
  await loadStock();
}

/* -------------------- BOOT -------------------- */

window.save = save;
window.sold = sold;
window.logout = logout;

(async function init() {
  try {
    if (!(await checkLogin())) return;
    await loadStock();
  } catch (err) {
    console.error("Init error:", err);
  }
})();
