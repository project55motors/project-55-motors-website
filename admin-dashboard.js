/*************************************************
 * Project 55 Motors – Admin Dashboard
 * STOCK + ANALYTICS (KV)
 *************************************************/

const API = "/api";

/* ---------- DOM ---------- */

const table = document.getElementById("stockTable");
const loginModal = document.getElementById("loginModal");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const adminTabs = document.getElementById("adminTabs");
const refreshStockBtn = document.getElementById("refreshStockBtn");

const stockView = document.getElementById("stockView");
const analyticsView = document.getElementById("analyticsView");

const analyticsRange = document.getElementById("analyticsRange");
const refreshAnalyticsBtn = document.getElementById("refreshAnalyticsBtn");

const kpiTotal = document.getElementById("kpiTotal");
const kpiMeta = document.getElementById("kpiMeta");
const topPagesEl = document.getElementById("topPages");
const topCountriesEl = document.getElementById("topCountries");
const dailyViewsEl = document.getElementById("dailyViews");

/* ---------- HELPERS ---------- */

const num = v => (v === "" || v === null ? null : Number(v));
const txt = v => (v === "" ? null : v.trim());

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric"];
const transmissionOptions = ["Manual", "Automatic", "Semi-automatic"];
const statusOptions = ["Available", "Sold", "Hidden"];

const fmt = new Intl.NumberFormat("en-GB");

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setActiveTab(view) {
  document.querySelectorAll(".admin-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.view === view);
  });

  stockView.style.display = view === "stock" ? "block" : "none";
  analyticsView.style.display = view === "analytics" ? "block" : "none";
}

/* ---------- AUTH ---------- */

async function checkLogin() {
  try {
    const r = await fetch(`${API}/login-check`, { credentials: "include" });
    const j = await r.json();
    j.loggedIn ? showDashboard() : showLogin();
  } catch {
    showLogin();
  }
}

async function login() {
  const r = await fetch(`${API}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value.trim(),
      password: passwordInput.value
    })
  });

  if (!r.ok) return alert("Login failed");
  showDashboard();
}

async function logout() {
  await fetch(`${API}/logout`, {
    method: "POST",
    credentials: "include"
  });
  location.reload();
}

logoutBtn.onclick = logout;
loginBtn.onclick = login;

/* ---------- UI ---------- */

function showLogin() {
  loginModal.style.display = "block";
  dashboard.style.display = "none";
  logoutBtn.style.display = "none";
  adminTabs.style.display = "none";
}

function showDashboard() {
  loginModal.style.display = "none";
  dashboard.style.display = "block";
  logoutBtn.style.display = "inline-block";
  adminTabs.style.display = "flex";

  setActiveTab("stock");
  loadStock();
}

/* ---------- NAV (TABS) ---------- */

adminTabs?.addEventListener("click", (e) => {
  const btn = e.target.closest(".admin-tab");
  if (!btn) return;

  const view = btn.dataset.view;
  setActiveTab(view);

  if (view === "analytics") loadAnalytics();
});

refreshStockBtn?.addEventListener("click", () => loadStock());
refreshAnalyticsBtn?.addEventListener("click", () => loadAnalytics());
analyticsRange?.addEventListener("change", () => loadAnalytics());

/* ---------- LOAD STOCK ---------- */

async function loadStock() {
  table.innerHTML = "";

  const r = await fetch(`${API}/all`, { credentials: "include" });
  if (!r.ok) return alert("Failed to load stock");

  const cars = await r.json();

  cars.forEach(c => {
    const img = c.Photos?.[0]?.url || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${img ? `<img class="admin-thumb" src="${escapeHtml(img)}" alt="">` : ""}</td>

      <td><input class="admin-cell-input" value="${escapeHtml(c.Make_Model || "")}"></td>
      <td><input class="admin-cell-input" value="${escapeHtml(c.Registration || "")}"></td>
      <td><input class="admin-cell-input" type="number" value="${c.Price ?? ""}"></td>
      <td><input class="admin-cell-input" type="number" value="${c.Mileage ?? ""}"></td>
      <td><input class="admin-cell-input" type="date" value="${escapeHtml(c.MOT_Date || "")}"></td>
      <td><input class="admin-cell-input" type="number" step="0.1" value="${c.Engine_size ?? ""}"></td>

      <td>
        <select class="admin-cell-select">
          ${fuelOptions.map(f =>
            `<option value="${f}" ${c.Fuel_type === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select class="admin-cell-select">
          ${transmissionOptions.map(t =>
            `<option value="${t}" ${c.Transmission === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select class="admin-cell-select">
          ${statusOptions.map(s =>
            `<option value="${s}" ${c.Status === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>

      <td><textarea class="admin-cell-textarea">${escapeHtml(c.Short_Description || "")}</textarea></td>
      <td><textarea class="admin-cell-textarea">${escapeHtml(c.Full_Description || "")}</textarea></td>

      <td><button class="admin-btn tiny primary" onclick="save('${c.id}', this)">Save</button></td>
    `;

    table.appendChild(tr);
  });
}

/* ---------- SAVE ---------- */

async function save(id, btn) {
  const tds = btn.closest("tr").querySelectorAll("td");

  const cellValue = (td) => {
    const el = td.querySelector("input, textarea, select");
    return el ? el.value : "";
  };

  const fields = {
    Make_Model: txt(cellValue(tds[1])),
    Registration: txt(cellValue(tds[2])),
    Price: num(cellValue(tds[3])),
    Mileage: num(cellValue(tds[4])),
    MOT_Date: txt(cellValue(tds[5])),
    Engine_size: num(cellValue(tds[6])),
    Fuel_type: txt(cellValue(tds[7])),
    Transmission: txt(cellValue(tds[8])),
    Status: txt(cellValue(tds[9])),
    Short_Description: txt(cellValue(tds[10])),
    Full_Description: txt(cellValue(tds[11]))
  };

  for (const k of ["Fuel_type", "Transmission", "Status", "Short_Description", "Full_Description", "Make_Model", "Registration", "MOT_Date"]) {
    if (fields[k] === "") fields[k] = null;
  }

  const res = await fetch(`/api/update/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(fields)
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(`Save failed: ${out.error || "Unknown error"}`);
  } else {
    console.log("Saved", id);
  }
}

/* ---------- ANALYTICS ---------- */

function renderKeyValueList(items) {
  if (!items || items.length === 0) return `<div class="admin-muted">No data yet.</div>`;

  return items.map(i => `
    <div class="admin-mini-row">
      <div class="admin-mini-key">${escapeHtml(i.key)}</div>
      <div class="admin-mini-val">${fmt.format(i.count || 0)}</div>
    </div>
  `).join("");
}

async function loadAnalytics() {
  kpiTotal.textContent = "—";
  kpiMeta.textContent = "Loading…";
  topPagesEl.innerHTML = "";
  topCountriesEl.innerHTML = "";
  dailyViewsEl.innerHTML = "";

  const days = Number(analyticsRange?.value || 30);

  const r = await fetch(`${API}/analytics?days=${days}`, { credentials: "include" });
  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    kpiMeta.textContent = j?.error ? `Error: ${j.error}` : "Failed to load analytics.";
    return;
  }

  kpiTotal.textContent = fmt.format(j.total || 0);

  const generated = new Date(j.generatedAt || Date.now());
  kpiMeta.textContent = `${days} day window • Generated ${generated.toUTCString()}`;

  topPagesEl.innerHTML = renderKeyValueList(j.topPages);
  topCountriesEl.innerHTML = renderKeyValueList(j.topCountries);

  (j.series || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.day)}</td>
      <td style="text-align:right">${fmt.format(row.total || 0)}</td>
    `;
    dailyViewsEl.appendChild(tr);
  });
}

/* ---------- START ---------- */

checkLogin();
