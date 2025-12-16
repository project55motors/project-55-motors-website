console.log("Admin dashboard JS loaded");

const overlay = document.getElementById("loginOverlay");
const stockBody = document.getElementById("stockBody");

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const res = await fetch("/api/login-check", { credentials: "include" });
  const data = await res.json();

  if (data.loggedIn) {
    overlay.style.display = "none";
    await loadStock();
  } else {
    overlay.style.display = "flex";
  }
}

/* =========================
   LOGIN / LOGOUT
========================= */
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    alert("Login failed");
    return;
  }

  location.reload();
}

async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  location.reload();
}

/* =========================
   LOAD STOCK
========================= */
async function loadStock() {
  console.log("Loading admin stock…");

  const res = await fetch("/api/admin/all", { credentials: "include" });
  if (!res.ok) {
    console.error("Failed to load stock");
    return;
  }

  stockBody.innerHTML = await res.text();
}

/* =========================
   SAVE VEHICLE
========================= */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return alert("Row not found");

  const fields = {};

  row.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.name) return;

    let value = el.value.trim();

    // NUMBER fields (Price, Mileage, Engine_size, Sort_Index)
    if (el.type === "number") {
      if (value === "") return;            // ❗ DO NOT SEND
      const num = Number(value);
      if (Number.isNaN(num)) return;        // ❗ DO NOT SEND
      fields[el.name] = num;
      return;
    }

    // DATE fields
    if (el.type === "date") {
      if (value === "") {
        fields[el.name] = null;
      } else {
        fields[el.name] = value; // YYYY-MM-DD
      }
      return;
    }

    // SELECTS
    if (el.tagName === "SELECT") {
      fields[el.name] = value || null;
      return;
    }

    // TEXT / TEXTAREA
    fields[el.name] = value === "" ? null : value;
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
      console.error("Update failed:", text);
      alert("Save failed — see console");
      return;
    }

    alert("Saved");
  } catch (err) {
    console.error("Save error:", err);
    alert("Save error");
  }
}

/* =========================
   SOLD
========================= */
async function sold(id) {
  await fetch("/api/admin/update", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      fields: { Status: "Sold" }
    })
  });

  alert("Marked as sold");
}
