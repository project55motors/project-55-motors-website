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
const adminHomeLogo = document.getElementById("adminHomeLogo");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const adminTabs = document.getElementById("adminTabs");
const refreshStockBtn = document.getElementById("refreshStockBtn");

const stockFilters = document.getElementById("stockFilters");

const stockView = document.getElementById("stockView");
const analyticsView = document.getElementById("analyticsView");

const analyticsRange = document.getElementById("analyticsRange");
const refreshAnalyticsBtn = document.getElementById("refreshAnalyticsBtn");

// Settings (Sold vehicles)
const settingsView = document.getElementById("settingsView");
const reloadSettingsBtn = document.getElementById("reloadSettingsBtn");
const soldShowToggle = document.getElementById("soldShowToggle");
const soldKeepDays = document.getElementById("soldKeepDays");
const saveSoldSettingsBtn = document.getElementById("saveSoldSettingsBtn");
const soldSettingsNote = document.getElementById("soldSettingsNote");

const kpiTotal = document.getElementById("kpiTotal");
const kpiMeta = document.getElementById("kpiMeta");
const topPagesEl = document.getElementById("topPages");
const topCountriesEl = document.getElementById("topCountries");
const dailyViewsEl = document.getElementById("dailyViews");

const topCarsEl = document.getElementById("topCars");
const topReferrersEl = document.getElementById("topReferrers");

const viewsChart = document.getElementById("viewsChart");
const viewsChartMeta = document.getElementById("viewsChartMeta");
const topPagesChart = document.getElementById("topPagesChart");
const topCountriesChart = document.getElementById("topCountriesChart");

/* Expandable editor overlay (admin-only) */
const descOverlay = document.getElementById("descOverlay");
const descTitle = document.getElementById("descTitle");
const descTextarea = document.getElementById("descTextarea");
const descCount = document.getElementById("descCount");
const descCloseBtn = document.getElementById("descCloseBtn");
const descCancelBtn = document.getElementById("descCancelBtn");
const descSaveBtn = document.getElementById("descSaveBtn");

let activeDescTarget = null; // table textarea currently being edited


let lastCars = [];
let lastAnalytics = null;

let stockFilter = localStorage.getItem("p55_admin_stockFilter") || "All";

/* ---------- HELPERS ---------- */

/* ---------- Expandable editor overlay ---------- */

function setDescOverlayOpen(open) {
  if (!descOverlay) return;
  descOverlay.style.display = open ? "flex" : "none";
  descOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("admin-modal-open", !!open);
}

function updateDescCount() {
  if (!descTextarea || !descCount) return;
  const n = descTextarea.value.length;
  descCount.textContent = `${fmt.format(n)} character${n === 1 ? "" : "s"}`;
}

function openDescEditor(targetTextarea, title) {
  if (!descOverlay || !descTextarea) return;

  activeDescTarget = targetTextarea;
  if (descTitle) descTitle.textContent = title || "Edit description";

  descTextarea.value = targetTextarea?.value ?? "";
  updateDescCount();

  setDescOverlayOpen(true);

  setTimeout(() => {
    descTextarea.focus();
    const end = descTextarea.value.length;
    descTextarea.setSelectionRange(end, end);
  }, 0);
}

function closeDescEditor(apply) {
  if (!descOverlay) return;

  if (apply && activeDescTarget && descTextarea) {
    activeDescTarget.value = descTextarea.value;
    activeDescTarget.dispatchEvent(new Event("input", { bubbles: true }));
  }

  activeDescTarget = null;
  setDescOverlayOpen(false);
}

descTextarea?.addEventListener("input", updateDescCount);
descSaveBtn?.addEventListener("click", () => closeDescEditor(true));
descCancelBtn?.addEventListener("click", () => closeDescEditor(false));
descCloseBtn?.addEventListener("click", () => closeDescEditor(false));

descOverlay?.addEventListener("click", (e) => {
  if (e.target === descOverlay) closeDescEditor(false);
});

document.addEventListener("keydown", (e) => {
  if (!descOverlay || descOverlay.style.display !== "flex") return;

  if (e.key === "Escape") {
    e.preventDefault();
    closeDescEditor(false);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    closeDescEditor(true);
  }
});


const num = v => (v === "" || v === null ? null : Number(v));
const txt = v => (v === "" ? null : v.trim());

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric"];
const transmissionOptions = ["Manual", "Automatic", "Semi-automatic"];
const statusOptions = [
  { value: "Available", label: "Available" },
  { value: "In_prep", label: "In Prep" },
  { value: "Arriving_soon", label: "Arriving Soon" },
  { value: "Sold", label: "Sold" },
  { value: "Hidden", label: "Hidden" }
];

const fmt = new Intl.NumberFormat("en-GB");

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toISODate(val) {
  const s = String(val || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}


/* ---------- CHART HELPERS (NO LIBS) ---------- */

function debounce(fn, ms = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function bodyColor(alpha = 1) {
  const c = getComputedStyle(document.body).color || "rgb(255,255,255)";
  if (alpha >= 0.999) return c;
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return c;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})`;
}

function prepareCanvas(canvas) {
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, canvas.clientWidth || canvas.width || 1);
  const h = Math.max(1, canvas.clientHeight || canvas.height || 1);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  return { ctx, w, h };
}

function drawEmpty(canvas, message) {
  const p = prepareCanvas(canvas);
  if (!p) return;

  const { ctx, w, h } = p;
  ctx.fillStyle = bodyColor(0.65);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, w / 2, h / 2);
}

function drawLineChart(canvas, series, opts = {}) {
  if (!canvas) return;

  const p = prepareCanvas(canvas);
  if (!p) return;

  const { ctx, w, h } = p;
  const data = Array.isArray(series) ? series : [];
  if (data.length < 2) return drawEmpty(canvas, "Not enough data yet.");

  const padL = 42, padR = 12, padT = 10, padB = 26;
  const iw = Math.max(1, w - padL - padR);
  const ih = Math.max(1, h - padT - padB);

  const vals = data.map(d => Number(d.value || 0));
  const maxV = Math.max(...vals, 1);

  // Grid
  ctx.strokeStyle = bodyColor(0.18);
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (ih * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + iw, y);
    ctx.stroke();

    const v = Math.round(maxV * (1 - i / gridLines));
    ctx.fillStyle = bodyColor(0.65);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(v), padL - 8, y);
  }

  // Line
  ctx.strokeStyle = bodyColor(0.95);
  ctx.lineWidth = 2;

  data.forEach((d, i) => {
    const x = padL + (iw * i) / (data.length - 1);
    const y = padT + ih - (ih * (Number(d.value || 0) / maxV));

    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = bodyColor(0.95);
  data.forEach((d, i) => {
    const x = padL + (iw * i) / (data.length - 1);
    const y = padT + ih - (ih * (Number(d.value || 0) / maxV));
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels (start + end)
  const first = data[0]?.label || "";
  const last = data[data.length - 1]?.label || "";

  ctx.fillStyle = bodyColor(0.65);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(first, padL, h - 6);

  ctx.textAlign = "right";
  ctx.fillText(last, padL + iw, h - 6);

  if (opts.title) {
    ctx.fillStyle = bodyColor(0.8);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.title, padL, 2);
  }
}

function drawBarChart(canvas, items, opts = {}) {
  if (!canvas) return;

  const p = prepareCanvas(canvas);
  if (!p) return;

  const { ctx, w, h } = p;
  const data = (Array.isArray(items) ? items : []).slice(0, opts.maxBars || 6);

  if (data.length === 0) return drawEmpty(canvas, "No data yet.");

  const padL = 10, padR = 10, padT = 10, padB = 10;
  const iw = Math.max(1, w - padL - padR);
  const ih = Math.max(1, h - padT - padB);

  const maxV = Math.max(...data.map(d => Number(d.count || 0)), 1);
  const gap = 6;
  const barW = Math.max(2, (iw - gap * (data.length - 1)) / data.length);

  data.forEach((d, i) => {
    const v = Number(d.count || 0);
    const bh = (ih * v) / maxV;

    const x = padL + i * (barW + gap);
    const y = padT + (ih - bh);

    ctx.fillStyle = bodyColor(0.25);
    ctx.fillRect(x, padT, barW, ih);

    ctx.fillStyle = bodyColor(0.85);
    ctx.fillRect(x, y, barW, bh);
  });

  if (opts.title) {
    ctx.fillStyle = bodyColor(0.8);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.title, padL, 2);
  }
}

/* ---------- DERIVATIONS (FRONT-END ONLY) ---------- */

function deriveTopCarsFromPages(topPages, cars) {
  const pages = Array.isArray(topPages) ? topPages : [];
  const stock = Array.isArray(cars) ? cars : [];
  const map = new Map();

  for (const p of pages) {
    const raw = String(p?.key || "");
    let u;

    try {
      u = new URL(raw, location.origin);
    } catch {
      continue;
    }

    const path = (u.pathname || "").toLowerCase();

    const looksLikeVehicle =
      path.includes("vehicle") ||
      path.includes("car") ||
      path.includes("stock");

    if (!looksLikeVehicle) continue;

    const id =
      u.searchParams.get("id") ||
      u.searchParams.get("car") ||
      u.searchParams.get("record") ||
      "";

    if (!id) continue;

    const car = stock.find(c => c.id === id);
    const label = car
      ? `${car.Make_Model || "Vehicle"} • ${car.Registration || "—"}`
      : `Vehicle • ${id}`;

    map.set(label, (map.get(label) || 0) + (p.count || 0));
  }

  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);
}

function setActiveTab(view) {
  document.querySelectorAll(".admin-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.view === view);
  });

  stockView.style.display = view === "stock" ? "block" : "none";
  analyticsView.style.display = view === "analytics" ? "block" : "none";
  if (settingsView) settingsView.style.display = view === "settings" ? "block" : "none";
}


/* ---------- PUBLIC STOCK CACHE REFRESH ---------- */

let __p55RefreshInFlight = null;

/**
 * Asks cars-api to refresh its edge cache and bump the global stock version.
 * This prevents the public site showing stale statuses after admin edits.
 */
function refreshPublicStockCache() {
  if (__p55RefreshInFlight) return __p55RefreshInFlight;

  __p55RefreshInFlight = (async () => {
    try {
      // refresh=1 tells cars-api to fetch Airtable and update its cache.
      await fetch("/cars-api?refresh=1", { cache: "no-store" });
    } catch {
      // non-fatal
    } finally {
      // allow future refreshes
      __p55RefreshInFlight = null;
    }
  })();

  return __p55RefreshInFlight;
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

// Logo: return to site and force a fresh stock read.
if (adminHomeLogo) {
  adminHomeLogo.addEventListener("click", async (e) => {
    e.preventDefault();
    try { await refreshPublicStockCache(); } catch {}
    window.location.href = `/index.html?nocache=1&ts=${Date.now()}`;
  });
}

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
  syncStockFilterUI();
  loadStock();
}

/* ---------- NAV (TABS) ---------- */

adminTabs?.addEventListener("click", (e) => {
  const btn = e.target.closest(".admin-tab");
  if (!btn) return;

  const view = btn.dataset.view;
  setActiveTab(view);

  if (view === "analytics") loadAnalytics();
  if (view === "settings") loadSoldSettings();
});

refreshStockBtn?.addEventListener("click", () => loadStock());
refreshAnalyticsBtn?.addEventListener("click", () => loadAnalytics());
analyticsRange?.addEventListener("change", () => loadAnalytics());


reloadSettingsBtn?.addEventListener("click", () => loadSoldSettings());
saveSoldSettingsBtn?.addEventListener("click", () => saveSoldSettings());



/* ---------- STOCK FILTERS ---------- */

function normaliseStatus(s) {
  const raw = String(s || "").trim();
  if (!raw) return "Available";

  const key = raw.toLowerCase().replace(/\s+/g, "_");

  if (key === "prep" || key === "in_prep" || key === "in-prep") return "In_prep";
  if (key === "arriving_soon" || key === "arriving-soon") return "Arriving_soon";
  if (key === "available") return "Available";
  if (key === "sold") return "Sold";
  if (key === "hidden") return "Hidden";

  // Fall back to original value if it's something unexpected
  return raw;
}

function setStockFilter(next) {
  stockFilter = next || "All";
  localStorage.setItem("p55_admin_stockFilter", stockFilter);
  syncStockFilterUI();
  renderStockTable();
}

function syncStockFilterUI() {
  if (!stockFilters) return;

  stockFilters.querySelectorAll("button[data-filter]").forEach(btn => {
    const f = btn.getAttribute("data-filter") || "All";
    const active = f === stockFilter;

    btn.classList.toggle("primary", active);
    btn.classList.toggle("ghost", !active);
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

stockFilters?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-filter]");
  if (!btn) return;
  setStockFilter(btn.getAttribute("data-filter") || "All");
});

function filteredCars() {
  const cars = Array.isArray(lastCars) ? lastCars : [];
  if (!stockFilter || stockFilter === "All") return cars;

  return cars.filter(c => normaliseStatus(c.Status) === stockFilter);
}

function updateLocalCar(id, patch) {
  const idx = (lastCars || []).findIndex(c => c.id === id);
  if (idx >= 0) lastCars[idx] = { ...lastCars[idx], ...patch };
}

function setRowBusy(btn, busy, labelWhileBusy = "Working…") {
  if (!btn) return;
  const group = btn.closest("td") || btn.parentElement;

  if (group) {
    group.querySelectorAll("button").forEach(b => (b.disabled = !!busy));
  } else {
    btn.disabled = !!busy;
  }

  if (busy) {
    btn.dataset.prevText = btn.textContent;
    btn.textContent = labelWhileBusy;
  } else if (btn.dataset.prevText) {
    btn.textContent = btn.dataset.prevText;
    delete btn.dataset.prevText;
  }
}

async function quickStatusUpdate(id, nextStatus, btn) {
  setRowBusy(btn, true);

  try {
    const res = await fetch(`/api/update/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Status: nextStatus })
    });

    const out = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(`Update failed: ${out.error || "Unknown error"}`);
      return false;
    }

    updateLocalCar(id, { Status: nextStatus });
    // Keep the public site in sync immediately.
    refreshPublicStockCache();
    renderStockTable();
    return true;
  } catch (err) {
    console.error(err);
    alert("Update failed due to a network error.");
    return false;
  } finally {
    setRowBusy(btn, false);
  }
}

function markSold(id, btn) {
  return quickStatusUpdate(id, "Sold", btn);
}

function markAvailable(id, btn) {
  return quickStatusUpdate(id, "Available", btn);
}

// Open the per-car PDI form (stored in /admin/pdi-master.html in your repo)
function openPdi(id) {
  if (!id) return;
  window.open(`/admin/pdi-master.html?id=${encodeURIComponent(id)}`, "_blank", "noopener");
}

// Expose for inline onclick handlers
window.markSold = markSold;
window.markAvailable = markAvailable;
window.openPdi = openPdi;

/* ---------- LOAD STOCK ---------- */

async function loadStock() {
  table.innerHTML = "";

  const r = await fetch(`${API}/all`, { credentials: "include" });
  if (!r.ok) return alert("Failed to load stock");

  const cars = await r.json();
  lastCars = Array.isArray(cars) ? cars : [];

  syncStockFilterUI();
  renderStockTable();
}

function renderStockTable() {
  table.innerHTML = "";

  const cars = filteredCars();

  cars.forEach(c => {
    const img = c.Photos?.[0]?.url || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${img ? `<img class="admin-thumb" src="${escapeHtml(img)}" alt="">` : ""}</td>

      <td><input class="admin-cell-input" value="${escapeHtml(c.Make_Model || "")}"></td>
      <td><input class="admin-cell-input" value="${escapeHtml(c.Registration || "")}"></td>

      <td><input class="admin-cell-input col-vin" value="${escapeHtml((c.VIN ?? c.VIN_number ?? c['VIN number'] ?? c['VIN Number'] ?? '') || '')}"></td>
      <td><input class="admin-cell-input" value="${escapeHtml((c.V5C_number ?? c.V5C ?? c['V5C number'] ?? c['V5C Number'] ?? '') || '')}"></td>
      <td><input class="admin-cell-input" value="${escapeHtml((c.HPI_report_number ?? c['HPI report number'] ?? c['HPI Report Number'] ?? c['HPI report no'] ?? '') || '')}"></td>
      <td><input class="admin-cell-input" type="number" value="${c.Price ?? ""}"></td>
      <td><input class="admin-cell-input col-mileage" type="number" value="${c.Mileage ?? ""}"></td>
      <td><input class="admin-cell-input" type="date" value="${escapeHtml(c.MOT_Date || "")}"></td>
      <td><input class="admin-cell-input col-engine" type="number" step="0.1" value="${c.Engine_size ?? ""}"></td>

      <td>
        <select class="admin-cell-select col-fuel">
          ${fuelOptions.map(f =>
            `<option value="${f}" ${c.Fuel_type === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select class="admin-cell-select col-transmission">
          ${transmissionOptions.map(t =>
            `<option value="${t}" ${c.Transmission === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </td>

      <td>
        <select class="admin-cell-select col-status">
          ${statusOptions.map(o =>
            `<option value="${o.value}" ${normaliseStatus(c.Status) === o.value ? "selected" : ""}>${o.label}</option>`
          ).join("")}
        </select>
      </td>

      <td><input class="admin-cell-input col-eta" type="date" value="${escapeHtml(toISODate(c.ETA_in_stock || ""))}"></td>

      <td>
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Short description">Expand</button>
          <textarea class="admin-cell-textarea" rows="3">${escapeHtml(c.Short_Description || "")}</textarea>
        </div>
      </td>

      <td>
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Full description">Expand</button>
          <textarea class="admin-cell-textarea" rows="4">${escapeHtml(c.Full_Description || "")}</textarea>
        </div>
      </td>


      <td>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="admin-btn tiny primary" onclick="save('${c.id}', this)">Save</button>
          <button class="admin-btn tiny ghost" onclick="openPdi('${c.id}')">PDI</button>
          <button class="admin-btn tiny ghost" onclick="markSold('${c.id}', this)">Mark sold</button>
          <button class="admin-btn tiny ghost" onclick="markAvailable('${c.id}', this)">Revert</button>
        </div>
      </td>
    `;

    table.appendChild(tr);
  });
}



/* Expand button handler (event delegation) */
table?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-expand='desc']");
  if (!btn) return;

  const cell = btn.closest(".admin-desc-cell");
  const ta = cell?.querySelector("textarea");
  if (!ta) return;

  const label = btn.getAttribute("data-label") || "Edit description";
  openDescEditor(ta, label);
});

// iOS / iPadOS friendly fallback: double-tap a description textarea to expand.
// (Useful if the button is obscured by a Safari/table rendering quirk.)
let __p55LastTap = { t: 0, el: null };
table?.addEventListener(
  "touchend",
  (e) => {
    const ta = e.target.closest?.("textarea.admin-cell-textarea");
    if (!ta) return;

    const now = Date.now();
    const sameEl = __p55LastTap.el === ta;
    const fast = now - __p55LastTap.t < 350;

    if (sameEl && fast) {
      const label =
        ta.closest(".admin-desc-cell")
          ?.querySelector("button[data-label]")
          ?.getAttribute("data-label") || "Edit description";

      openDescEditor(ta, label);
      __p55LastTap = { t: 0, el: null };
    } else {
      __p55LastTap = { t: now, el: ta };
    }
  },
  { passive: true }
);

// Desktop fallback: double-click textarea
table?.addEventListener("dblclick", (e) => {
  const ta = e.target.closest?.("textarea.admin-cell-textarea");
  if (!ta) return;
  const label =
    ta.closest(".admin-desc-cell")
      ?.querySelector("button[data-label]")
      ?.getAttribute("data-label") || "Edit description";
  openDescEditor(ta, label);
});

/* ---------- SAVE ---------- */

async function save(id, btn) {
  const tr = btn.closest("tr");
  const tds = tr.querySelectorAll("td");

  const cellValue = (td) => {
    const el = td.querySelector("input, textarea, select");
    return el ? el.value : "";
  };

  // Values from the three new columns (before Price)
  const vinVal = txt(cellValue(tds[3]));
  const v5cVal = txt(cellValue(tds[4]));
  const hpiVal = txt(cellValue(tds[5]));

  // Core fields (unchanged)
  const core = {
    Make_Model: txt(cellValue(tds[1])),
    Registration: txt(cellValue(tds[2])),
    Price: num(cellValue(tds[6])),
    Mileage: num(cellValue(tds[7])),
    MOT_Date: txt(cellValue(tds[8])),
    Engine_size: num(cellValue(tds[9])),
    Fuel_type: txt(cellValue(tds[10])),
    Transmission: txt(cellValue(tds[11])),
    Status: txt(cellValue(tds[12])),
    ETA_in_stock: txt(cellValue(tds[13])),
    Short_Description: txt(cellValue(tds[14])),
    Full_Description: txt(cellValue(tds[15]))
  };

  // Use your exact Airtable field names (no fallbacks) to avoid ambiguity.
  // If Airtable rejects one, the error message will directly reflect the real mismatch.
  const fields = {
    ...core,
    ...(vinVal !== null ? { VIN: vinVal } : {}),
    ...(v5cVal !== null ? { V5C_number: v5cVal } : {}),
    ...(hpiVal !== null ? { HPI_report_number: hpiVal } : {})
  };

  setRowBusy(btn, true);
  try {
    const res = await fetch(`/api/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields)
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Save failed: ${out.error || "Unknown error"}`);
      return;
    }

    // Keep the public site in sync immediately.
    refreshPublicStockCache();
    console.log("Saved", id);
  } finally {
    setRowBusy(btn, false);
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

  if (topCarsEl) topCarsEl.innerHTML = "";
  if (topReferrersEl) topReferrersEl.innerHTML = "";

  if (viewsChartMeta) viewsChartMeta.textContent = "Loading…";
  drawEmpty(viewsChart, "Loading…");
  drawEmpty(topPagesChart, "Loading…");
  drawEmpty(topCountriesChart, "Loading…");

  const days = Number(analyticsRange?.value || 30);

  const r = await fetch(`${API}/analytics?days=${days}`, { credentials: "include" });
  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    kpiMeta.textContent = j?.error ? `Error: ${j.error}` : "Failed to load analytics.";
    if (viewsChartMeta) viewsChartMeta.textContent = "—";
    drawEmpty(viewsChart, "Failed to load.");
    drawEmpty(topPagesChart, "—");
    drawEmpty(topCountriesChart, "—");
    return;
  }

  lastAnalytics = { days, payload: j };

  kpiTotal.textContent = fmt.format(j.total || 0);

  const generated = new Date(j.generatedAt || Date.now());
  kpiMeta.textContent = `${days} day window • Generated ${generated.toUTCString()}`;

  topPagesEl.innerHTML = renderKeyValueList(j.topPages);
  topCountriesEl.innerHTML = renderKeyValueList(j.topCountries);

  // Top vehicles: prefer server-provided, otherwise derive from topPages using vehicle page URLs.
  const derivedCars = deriveTopCarsFromPages(j.topPages, lastCars);
  const topCars = Array.isArray(j.topCars) && j.topCars.length ? j.topCars : derivedCars;

  if (topCarsEl) {
    topCarsEl.innerHTML = topCars.length
      ? renderKeyValueList(topCars)
      : `<div class="admin-muted">No vehicle page views yet.</div>`;
  }

  // Referrers / sources: requires your tracking beacon to send a referrer domain or UTM source.
  const refs =
    j.topReferrers ||
    j.topReferrersDomains ||
    j.topSources ||
    j.topReferrersDomain ||
    [];

  if (topReferrersEl) {
    topReferrersEl.innerHTML = Array.isArray(refs) && refs.length
      ? renderKeyValueList(refs)
      : `<div class="admin-muted">Not tracked yet. Add referrer/UTM capture in your page-view beacon.</div>`;
  }

  // Daily table + charts
  (j.series || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.day)}</td>
      <td style="text-align:right">${fmt.format(row.total || 0)}</td>
    `;
    dailyViewsEl.appendChild(tr);
  });

  renderCharts(lastAnalytics);
}

function renderCharts(state) {
  const j = state?.payload;
  if (!j) return;

  const series = (j.series || []).map(r => ({
    label: String(r.day || ""),
    value: Number(r.total || 0)
  }));

  drawLineChart(viewsChart, series);

  drawBarChart(topPagesChart, j.topPages || [], { maxBars: 7, title: "" });
  drawBarChart(topCountriesChart, j.topCountries || [], { maxBars: 7, title: "" });

  if (viewsChartMeta) {
    const maxDay = Math.max(...series.map(s => s.value), 0);
    const topCar = (Array.isArray(j.topCars) && j.topCars[0]?.key) ? j.topCars[0] : null;
    const topCarText = topCar ? ` • Top vehicle: ${topCar.key}` : "";
    viewsChartMeta.textContent = `Peak day: ${fmt.format(maxDay)} views${topCarText}`;
  }
}



/* ---------- SETTINGS (SOLD VEHICLES) ---------- */

async function loadSoldSettings() {
  if (!soldSettingsNote) return;

  soldSettingsNote.textContent = "Loading…";

  try {
    const r = await fetch(`${API}/settings/sold`, { credentials: "include" });
    const j = await r.json().catch(() => null);

    if (!r.ok || !j?.ok) {
      soldSettingsNote.textContent = j?.error ? `Error: ${j.error}` : "Failed to load settings.";
      return;
    }

    const sold = j.sold || {};
    if (soldShowToggle) soldShowToggle.checked = !!sold.showSold;

    const keepDays = Number(sold.keepDays);
    if (soldKeepDays) soldKeepDays.value = Number.isFinite(keepDays) ? String(keepDays) : "30";

    const updatedAt = sold.updatedAt ? new Date(sold.updatedAt) : null;
    soldSettingsNote.textContent = updatedAt ? `Saved ${updatedAt.toUTCString()}` : "Loaded.";
  } catch (err) {
    console.error(err);
    soldSettingsNote.textContent = "Failed to load settings.";
  }
}

async function saveSoldSettings() {
  if (!soldSettingsNote) return;

  const showSold = !!soldShowToggle?.checked;

  let keepDays = Number(soldKeepDays?.value || 0);
  if (!Number.isFinite(keepDays) || keepDays < 0) keepDays = 0;
  if (keepDays > 365) keepDays = 365;

  soldSettingsNote.textContent = "Saving…";

  const r = await fetch(`${API}/settings/sold`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showSold, keepDays })
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    soldSettingsNote.textContent = j?.error ? `Error: ${j.error}` : "Save failed.";
    return;
  }

  const updatedAt = j.sold?.updatedAt ? new Date(j.sold.updatedAt) : null;
  soldSettingsNote.textContent = updatedAt ? `Saved ${updatedAt.toUTCString()}` : "Saved.";
}

/* ---------- START ---------- */

checkLogin();

window.addEventListener("resize", debounce(() => {
  if (lastAnalytics) renderCharts(lastAnalytics);
}, 150));
