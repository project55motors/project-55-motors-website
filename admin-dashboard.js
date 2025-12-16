// ======================================================================
// PROJECT 55 MOTORS – ADMIN DASHBOARD JS (COMPATIBLE + SANITISED BUILD)
// Works with admin-dashboard.html ids: loginOverlay, username, password, stockBody
// Expects admin-worker endpoints:
//   GET  /api/login-check
//   POST /api/login
//   POST /api/logout
//   GET  /api/admin/all        -> returns <tr ...> rows (HTML)
//   POST /api/admin/update     -> Airtable PATCH wrapper
// ======================================================================

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const loginOverlay = $("#loginOverlay");
  const usernameEl = $("#username");
  const passwordEl = $("#password");
  const stockBody = $("#stockBody");

  function showLogin() {
    if (loginOverlay) loginOverlay.style.display = "flex";
  }

  function hideLogin() {
    if (loginOverlay) loginOverlay.style.display = "none";
  }

  async function apiFetch(path, options = {}) {
    return fetch(path, { credentials: "include", ...options });
  }

  async function checkLogin() {
    try {
      const res = await apiFetch("/api/login-check");
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.loggedIn) {
        hideLogin();
        await loadStock();
      } else {
        showLogin();
      }
    } catch (err) {
      console.error("Login check failed:", err);
      showLogin();
    }
  }

  async function login() {
    const username = (usernameEl?.value || "").trim();
    const password = (passwordEl?.value ?? "").toString();

    if (!username || !password) {
      alert("Enter username and password");
      return;
    }

    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      hideLogin();
      await loadStock();
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error — see console");
    }
  }

  async function logout() {
    try {
      await apiFetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed (continuing):", err);
    }

    if (passwordEl) passwordEl.value = "";
    if (stockBody) stockBody.innerHTML = "";
    showLogin();
  }

  // Expose for inline onclick in admin-dashboard.html
  window.login = login;
  window.logout = logout;

  async function loadStock() {
    try {
      const res = await apiFetch("/api/admin/all");
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      const html = await res.text();
      if (!stockBody) throw new Error("Missing #stockBody element");
      stockBody.innerHTML = html;
    } catch (err) {
      console.error("Failed to load stock:", err);
      alert("Failed to load stock");
    }
  }

  // -----------------------------
  // Sanitisation helpers (Airtable-friendly)
  // -----------------------------
  function toNullIfEmpty(v) {
    const s = (v ?? "").toString().trim();
    return s === "" ? null : s;
  }

  // Accepts: "5995", "5,995", "£5,995.00", "5995.0"
  function parseNumberLoose(v) {
    const s = (v ?? "").toString().trim();
    if (!s) return null;

    // Remove currency symbols, spaces, commas etc. Keep digits, dot, minus.
    const cleaned = s.replace(/[^0-9.\-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function parseIntLoose(v) {
    const n = parseNumberLoose(v);
    if (n === null) return null;
    const i = Math.trunc(n);
    return Number.isFinite(i) ? i : null;
  }

  function sanitizeField(name, el) {
    const raw = (el?.value ?? "").toString();

    // Dates (Airtable date expects ISO string like YYYY-MM-DD)
    if (el?.type === "date") {
      const s = raw.trim();
      return s ? s : null;
    }

    // Select empty -> null
    if (el?.tagName === "SELECT") {
      const s = raw.trim();
      return s ? s : null;
    }

    // Numeric fields based on your Airtable
    if (name === "Price") return parseNumberLoose(raw);
    if (name === "Mileage") return parseIntLoose(raw);
    if (name === "Engine_size") return parseNumberLoose(raw);
    if (name === "Sort_Index") return parseIntLoose(raw);

    // Everything else: text
    return toNullIfEmpty(raw);
  }

  // -----------------------------
  // Save / Sold (called by row buttons injected from admin-worker)
  // -----------------------------
  async function save(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
      alert("Row not found");
      return;
    }

    const fields = {};
    row.querySelectorAll("input, select, textarea").forEach((el) => {
      if (!el.name) return;
      fields[el.name] = sanitizeField(el.name, el);
    });

    try {
      const res = await apiFetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fields })
      });

      const text = await res.text().catch(() => "");

      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.error?.message || j?.error || text;
        } catch {}
        console.error("Update failed:", text);
        alert(`Save failed — ${msg}`);
        return;
      }

      alert("Saved");

      // Reload from Airtable to keep UI consistent.
      await loadStock();

    } catch (err) {
      console.error("Save error:", err);
      alert("Save error — see console");
    }
  }

  async function sold(id) {
    try {
      const res = await apiFetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fields: { Status: "Sold" } })
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        console.error("Sold failed:", text);
        alert("Failed to mark as sold — see console");
        return;
      }

      await loadStock();
    } catch (err) {
      console.error("Sold error:", err);
      alert("Failed to mark as sold");
    }
  }

  window.save = save;
  window.sold = sold;

  // Press Enter on password field to login
  if (passwordEl) {
    passwordEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  }

  document.addEventListener("DOMContentLoaded", checkLogin);
})();
