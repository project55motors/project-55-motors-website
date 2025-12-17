/* =========================================================
   PROJECT 55 MOTORS – ADMIN DASHBOARD (RESTORED LOGIN FLOW)
   - Always shows login modal when not logged in
   - Logout returns you to login modal (no dead-end screen)
   - Loads stock when logged in
   - Keeps inline onclick="save('...')" compatibility
   ========================================================= */

function qs(sel) { return document.querySelector(sel); }

function setStatus(msg) {
  const el = qs("#status");
  if (el) el.textContent = msg;
}

function sanitiseField(name, value) {
  if (value === undefined || value === null) return null;

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

/* ---------------------------------------------------------
   Login modal (auto-injected; no HTML changes required)
--------------------------------------------------------- */

function ensureLoginModal() {
  if (qs("#p55LoginOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "p55LoginOverlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.55);
    display: none; align-items: center; justify-content: center;
    z-index: 99999; padding: 24px;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width: 100%; max-width: 520px; background: #fff; border-radius: 16px;
    padding: 22px; box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  `;

  card.innerHTML = `
    <h2 style="margin:0 0 14px; font-size: 22px;">Staff Login</h2>

    <div style="display:grid; gap:10px;">
      <label style="font-size:13px;">Username</label>
      <input id="p55User" autocomplete="username"
             style="padding:10px 12px; border:1px solid #ccc; border-radius:10px; font-size:14px;" />

      <label style="font-size:13px; margin-top:6px;">Password</label>
      <input id="p55Pass" type="password" autocomplete="current-password"
             style="padding:10px 12px; border:1px solid #ccc; border-radius:10px; font-size:14px;" />

      <button id="p55LoginBtn"
              style="margin-top:14px; padding:10px 12px; border:1px solid #111;
                     border-radius:10px; background:#111; color:#fff; font-size:14px; cursor:pointer;">
        Log in
      </button>

      <div id="p55LoginMsg" style="margin-top:6px; font-size:13px; color:#b00020;"></div>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Enter key submits
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") qs("#p55LoginBtn")?.click();
  });

  qs("#p55LoginBtn").addEventListener("click", login);
}

function showLogin(msg = "") {
  ensureLoginModal();
  const overlay = qs("#p55LoginOverlay");
  const m = qs("#p55LoginMsg");
  if (m) m.textContent = msg;
  overlay.style.display = "flex";
  setTimeout(() => qs("#p55User")?.focus(), 50);

  // Clear table so you can visually see you’re logged out
  const tbody = qs("#stockBody");
  if (tbody) tbody.innerHTML = "";
}

function hideLogin() {
  const overlay = qs("#p55LoginOverlay");
  if (overlay) overlay.style.display = "none";
  const m = qs("#p55LoginMsg");
  if (m) m.textContent = "";
}

/* ---------------------------------------------------------
   API calls
--------------------------------------------------------- */

async function login() {
  const user = (qs("#p55User")?.value || "").trim();
  const pass = (qs("#p55Pass")?.value || "");

  const msg = qs("#p55LoginMsg");
  if (msg) msg.textContent = "";

  if (!user || !pass) {
    if (msg) msg.textContent = "Please enter username and password.";
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: user, password: pass })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (msg) msg.textContent = data.error || "Login failed.";
      return;
    }

    hideLogin();
    await loadStock();
  } catch (err) {
    console.error("Login error:", err);
    if (msg) msg.textContent = "Login error — see console.";
  }
}

async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Logout error:", err);
  }

  // Don’t leave user stranded — show login immediately
  showLogin("Logged out.");
}

async function checkLogin() {
  const res = await fetch("/api/login-check", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return !!data.loggedIn;
}

async function loadStock() {
  try {
    setStatus("Loading stock…");

    const res = await fetch("/api/admin/all", {
      credentials: "include"
    });

    // If we got logged out / cookie missing, worker returns 401
    if (res.status === 401) {
      showLogin("Session expired. Please log in again.");
      setStatus("");
      return;
    }

    if (!res.ok) throw new Error(`Stock fetch failed: ${res.status}`);

    const html = await res.text();
    const tbody = qs("#stockBody");
    if (!tbody) throw new Error("Missing #stockBody element");

    tbody.innerHTML = html;
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("");
    alert("Failed to load stock");
  }
}

/* ---------------------------------------------------------
   Save / Sold (must be on window for inline onclick)
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

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      // Try to surface Airtable’s error message if present
      let msg = "Save failed — see console";
      try {
        const j = JSON.parse(text);
        const em = j?.error?.message;
        if (em) msg = `Save failed — ${em}`;
      } catch {}
      console.error("Update failed:", res.status, text);
      alert(msg);
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
    const res = await fetch("/api/admin/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, fields: { Status: "Sold" } })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Sold update failed:", res.status, text);
      alert("Failed to mark sold — see console");
      return;
    }

    alert("Marked as sold");
    await loadStock();
  } catch (err) {
    console.error(err);
    alert("Failed to mark sold — see console");
  }
}

window.save = save;
window.sold = sold;
window.logout = logout;

/* ---------------------------------------------------------
   Wire logout button + boot
--------------------------------------------------------- */

function wireLogoutButton() {
  // Support either an element with id="logoutBtn" OR a button with text "LOG OUT"
  const byId = qs("#logoutBtn");
  if (byId) {
    byId.addEventListener("click", (e) => { e.preventDefault(); logout(); });
    return;
  }

  const candidates = Array.from(document.querySelectorAll("button, a, input[type='button'], input[type='submit']"));
  const btn = candidates.find(el => (el.textContent || el.value || "").trim().toUpperCase() === "LOG OUT");
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); logout(); });
}

(async function init() {
  ensureLoginModal();
  wireLogoutButton();

  try {
    const loggedIn = await checkLogin();
    if (!loggedIn) {
      showLogin();
      return;
    }
    await loadStock();
  } catch (err) {
    console.error("Init error:", err);
    showLogin("Session check failed. Please log in.");
  }
})();
