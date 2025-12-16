console.log("Admin dashboard JS loaded");

const overlay = document.getElementById("loginOverlay");
const stockBody = document.getElementById("stockBody");

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
  const res = await fetch("/api/admin/all", { credentials: "include" });
  if (!res.ok) {
    console.error("Failed to load stock");
    return;
  }
  stockBody.innerHTML = await res.text();
}

/* =========================
   SAVE VEHICLE (SANITISED)
========================= */
async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return alert("Row not found");

  const fields = {};

  row.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.name) return;

    let value = el.value.trim();

    // ---- NUMERIC FIELDS ----
    if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(el.name)) {
      if (value === "") return;

      const cleaned = value.replace(/[^0-9.]/g, "");
      const num = Number(cleaned);

      if (Number.isNaN(num)) return;
      fields[el.name] = num;
      return;
    }

    // ---- DATE ----
    if (el.type === "date") {
      fields[el.name] = value || null;
      return;
    }

    // ---- SELECT ----
    if (el.tagName === "SELECT") {
      fields[el.name] = value || null;
      return;
    }

    // ---- TEXT ----
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
