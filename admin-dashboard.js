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
const addCarBtn = document.getElementById("addCarBtn");

const stockFilters = document.getElementById("stockFilters");

const stockView = document.getElementById("stockView");
const analyticsView = document.getElementById("analyticsView");

const analyticsRange = document.getElementById("analyticsRange");
const refreshAnalyticsBtn = document.getElementById("refreshAnalyticsBtn");
const exportAnalyticsBtn = document.getElementById("exportAnalyticsBtn");

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
const topEventsEl = document.getElementById("topEvents");
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
let lastEvents = null;

let newCarDraft = null; // in-table draft row for creating a new vehicle

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
const statusOptions = ["Available", "In_prep", "Arriving_soon", "Sold", "Inactive", "Hidden"];

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
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);

  const xAt = (i) => padL + (iw * (i / (data.length - 1)));
  const yAt = (v) => padT + ih - (ih * ((v - min) / span));

  // grid
  ctx.strokeStyle = bodyColor(0.12);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ih * (i / 4));
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // line
  ctx.strokeStyle = bodyColor(0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xAt(i);
    const y = yAt(Number(d.value || 0));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // y labels
  ctx.fillStyle = bodyColor(0.70);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const v = max - (span * (i / 4));
    const y = padT + (ih * (i / 4));
    ctx.fillText(fmt.format(Math.round(v)), padL - 8, y);
  }

  // x labels (first/last)
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(String(data[0].label || ""), padL, padT + ih + 8);
  ctx.textAlign = "right";
  ctx.fillText(String(data[data.length - 1].label || ""), w - padR, padT + ih + 8);
}

function drawBarChart(canvas, items) {
  if (!canvas) return;
  const p = prepareCanvas(canvas);
  if (!p) return;

  const { ctx, w, h } = p;
  const data = Array.isArray(items) ? items.slice(0, 8) : [];
  if (!data.length) return drawEmpty(canvas, "No data yet.");

  const padL = 110, padR = 12, padT = 8, padB = 16;
  const iw = Math.max(1, w - padL - padR);
  const ih = Math.max(1, h - padT - padB);

  const max = Math.max(...data.map(d => Number(d.value || 0)), 1);

  const rowH = ih / data.length;

  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";

  data.forEach((d, i) => {
    const y = padT + (i * rowH) + rowH * 0.15;
    const bh = rowH * 0.7;

    const v = Number(d.value || 0);
    const bw = (iw * (v / max));

    // label
    ctx.fillStyle = bodyColor(0.75);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(d.label || ""), padL - 10, y + bh / 2);

    // bar
    ctx.fillStyle = bodyColor(0.25);
    ctx.fillRect(padL, y, iw, bh);

    ctx.fillStyle = bodyColor(0.85);
    ctx.fillRect(padL, y, bw, bh);

    // value
    ctx.fillStyle = bodyColor(0.90);
    ctx.textAlign = "left";
    ctx.fillText(fmt.format(v), padL + bw + 8, y + bh / 2);
  });
}

/* ---------- TOP VEHICLES DERIVATION ---------- */

function deriveTopCarsFromPages(pages, stock) {
  const list = Array.isArray(pages) ? pages : [];
  const map = new Map();

  for (const p of list) {
    const raw = p?.key || "";
    const count = Number(p?.count || 0);
    if (!raw || !count) continue;

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

    map.set(label, (map.get(label) || 0) + count);
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
let __p55RefreshTimer = null;

/**
 * Refreshes the public stock cache without forcing every call to hit Airtable.
 *
 * - Uses cars-api `?refresh=1` (version bump + cache pre-warm) instead of `?nocache=1`.
 * - Coalesces multiple admin edits into a single refresh (default ~2.5s delay).
 *
 * This specifically reduces Airtable API consumption when doing lots of admin saves/updates.
 */
function refreshPublicStockCache({ delayMs = 2500 } = {}) {
  // If there's already a refresh in flight, reuse it.
  if (__p55RefreshInFlight) return __p55RefreshInFlight;

  // Coalesce repeated calls (saves / status clicks) into one refresh.
  if (__p55RefreshTimer) clearTimeout(__p55RefreshTimer);

  __p55RefreshInFlight = new Promise((resolve) => {
    __p55RefreshTimer = setTimeout(async () => {
      try {
        // Refresh endpoint bumps a global version and pre-warms the edge cache.
        // cars-api also throttles refreshes server-side.
        await fetch("/cars-api?refresh=1", { cache: "no-store" });
      } catch {
        // non-fatal
      } finally {
        __p55RefreshTimer = null;
        const done = __p55RefreshInFlight;
        __p55RefreshInFlight = null;
        resolve(done);
      }
    }, Math.max(0, Number(delayMs) || 0));
  });

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
    try { await refreshPublicStockCache(); } catch (err) {}
    window.location.href = "/";
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

addCarBtn?.addEventListener("click", () => {
  // Keep UX simple: always show the draft row (even if a filter is active).
  if (stockFilter !== "All") setStockFilter("All");

  if (!newCarDraft) {
    newCarDraft = {
      Make_Model: "",
      Registration: "",
      VIN: "",
      V5C_number: "",
      HPI_report_number: "",
      Price: "",
      Mileage: "",
      MOT_Date: "",
      Engine_size: "",
      Fuel_type: fuelOptions[0] || "",
      Transmission: transmissionOptions[0] || "",
      Status: "Available",
      ETA_in_stock: "",
      Short_Description: "",
      Full_Description: ""
    };
  }

  renderStockTable();

  // Focus Make/Model for fast entry.
  setTimeout(() => {
    const first = table?.querySelector("tr[data-newcar='1'] input.col-make");
    first?.focus();
  }, 0);
});

refreshAnalyticsBtn?.addEventListener("click", () => loadAnalytics());
exportAnalyticsBtn?.addEventListener("click", () => exportAnalyticsCsv());
analyticsRange?.addEventListener("change", () => loadAnalytics());

reloadSettingsBtn?.addEventListener("click", () => loadSoldSettings());


function exportAnalyticsCsv() {
  if (!lastAnalytics?.payload?.ok) {
    alert("Load analytics first, then export.");
    return;
  }
  const days = lastAnalytics.days || 30;
  const a = lastAnalytics.payload;

  const lines = [];
  const add = (row) => lines.push(row.map(v => {
    const s = String(v ?? "");
    // CSV escape
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(","));

  add(["Project 55 Motors — Analytics export"]);
  add([`Range (days)`, days]);
  add([`Generated (UTC)`, new Date(a.generatedAt || Date.now()).toUTCString()]);
  add([]);

  add(["KPI", "Value"]);
  add(["Total views", a.total || 0]);
  add([]);

  const dumpList = (title, items) => {
    add([title]);
    add(["Key", "Count"]);
    (items || []).forEach(i => add([i.key, i.count || 0]));
    add([]);
  };

  dumpList("Top pages", a.topPages);
  dumpList("Top countries", a.topCountries);
  dumpList("Top referrers", a.topReferrers);
  dumpList("Top vehicles", a.topCars);

  if (lastEvents?.ok) dumpList("Lead actions", lastEvents.topEvents);

  add(["Daily views"]);
  add(["Date (UTC)", "Views"]);
  (a.daily || []).forEach(d => add([d.date, d.count || 0]));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const aTag = document.createElement("a");
  aTag.href = url;
  aTag.download = `p55-analytics-${days}d.csv`;
  document.body.appendChild(aTag);
  aTag.click();
  aTag.remove();
  URL.revokeObjectURL(url);
}

saveSoldSettingsBtn?.addEventListener("click", () => saveSoldSettings());

/* ---------- STOCK FILTERS ---------- */

function normaliseStatus(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return "Hidden";

  const v = raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]+/g, "");
  if (v === "available") return "Available";
  if (v === "sold") return "Sold";
  if (v === "inactive") return "Inactive";
  if (v === "hidden") return "Hidden";
  if (v === "prep" || v === "in_prep" || v === "inprep") return "In_prep";
  if (v === "arriving_soon" || v === "arrivingsoon") return "Arriving_soon";

  // Pass through any future statuses you add in Airtable.
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

function markInactive(id, btn) {
  return quickStatusUpdate(id, "Inactive", btn);
}

// Open the per-car PDI form (stored in /admin/pdi-master.html in your repo)
function openPdi(id) {
  if (!id) return;
  window.open(`/admin/pdi-master.html?id=${encodeURIComponent(id)}`, "_blank", "noopener");
}

// Expose for inline onclick handlers
window.markSold = markSold;
window.markInactive = markInactive;
window.markAvailable = markAvailable;
window.openPdi = openPdi;

async function generateAI(id, btn) {
  if (!id) return;

  const ok = confirm("Generate AI advert content for this vehicle? This will update the AI fields in Airtable only.");
  if (!ok) return;

  setRowBusy(btn, true, "Generating…");

  try {
	const dealerInsight = prompt(
 	 "Any key dealer insight to include in the advert?\n\nExamples:\n- Rare TSI 90 model, much better than MPI\n- Supplied by local VW dealer and same family owned\n- 4 new premium tyres fitted\n- Very clean example, no immediate spend required\n\nLeave blank if there is nothing extra."
	);

	if (dealerInsight === null) {
	  setRowBusy(btn, false);
 	 return;
	}

	const res = await fetch(`/api/ai/generate/${encodeURIComponent(id)}`, {
	  method: "POST",
  	credentials: "include",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({
    dealer_insight: dealerInsight.trim()
  })
});

    const out = await res.json().catch(() => ({}));

    if (!res.ok || !out.ok) {
      alert(`AI generation failed: ${out.error || "Unknown error"}`);
      return;
    }

    updateLocalCar(id, {
      AI_Status: "Generated",
      AI_Last_Generated: new Date().toISOString()
    });

    alert("AI content generated and saved to Airtable.");
  } catch (err) {
    console.error(err);
    alert("AI generation failed due to a network error.");
  } finally {
    setRowBusy(btn, false);
  }
}

window.generateAI = generateAI;

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

  if (addCarBtn) addCarBtn.disabled = !!newCarDraft;

  if (newCarDraft) {
    const d = newCarDraft;

    const trNew = document.createElement("tr");
    trNew.dataset.newcar = "1";

    trNew.innerHTML = `
      <td class="col-photo"><div class="admin-muted">—</div></td>

      <td class="col-make"><input class="admin-cell-input col-make" value="${escapeHtml(d.Make_Model || "")}" placeholder="Make / Model"></td>
      <td class="col-registration"><input class="admin-cell-input col-registration" value="${escapeHtml(d.Registration || "")}" placeholder="Registration"></td>

      <td class="col-vin"><input class="admin-cell-input col-vin" value="${escapeHtml(d.VIN || "")}" placeholder="VIN"></td>
      <td class="col-v5c"><input class="admin-cell-input col-v5c" value="${escapeHtml(d.V5C_number || "")}" placeholder="V5C"></td>
      <td class="col-hpi"><input class="admin-cell-input col-hpi" value="${escapeHtml(d.HPI_report_number || "")}" placeholder="HPI"></td>

      <td class="col-price"><input class="admin-cell-input col-price" type="number" value="${escapeHtml(d.Price ?? "")}" placeholder="Price"></td>
      <td class="col-mileage"><input class="admin-cell-input col-mileage" type="number" value="${escapeHtml(d.Mileage ?? "")}" placeholder="Mileage"></td>
      <td class="col-mot"><input class="admin-cell-input col-mot" type="date" value="${escapeHtml(d.MOT_Date || "")}"></td>
      <td class="col-engine"><input class="admin-cell-input col-engine" type="number" step="0.1" value="${escapeHtml(d.Engine_size ?? "")}" placeholder="Engine"></td>

      <td class="col-fuel">
        <select class="admin-cell-select col-fuel">
          ${fuelOptions.map(f =>
            `<option value="${f}" ${txt(d.Fuel_type) === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-transmission">
        <select class="admin-cell-select col-transmission">
          ${transmissionOptions.map(t =>
            `<option value="${t}" ${txt(d.Transmission) === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-status">
        <select class="admin-cell-select col-status">
          ${statusOptions.map(s =>
            `<option value="${s}" ${normaliseStatus(d.Status) === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-eta"><input class="admin-cell-input col-eta" type="date" value="${escapeHtml(toISODate(d.ETA_in_stock || ""))}"></td>

      <td class="col-shortdesc">
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Short description">Expand</button>
          <textarea class="admin-cell-textarea" rows="3" placeholder="Short description">${escapeHtml(d.Short_Description || "")}</textarea>
        </div>
      </td>

      <td class="col-fulldesc">
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Full description">Expand</button>
          <textarea class="admin-cell-textarea" rows="4" placeholder="Full description">${escapeHtml(d.Full_Description || "")}</textarea>
        </div>
      </td>

      <td class="col-actions">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="admin-btn tiny primary" onclick="createNewCar(this)">Create</button>
          <button class="admin-btn tiny ghost" onclick="cancelNewCar()">Cancel</button>
        </div>
      </td>
    `;

    table.appendChild(trNew);
  }

  cars.forEach(c => {
    const img = c.Photos?.[0]?.url || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `      <td class="col-photo">${img ? `<img class="admin-thumb" src="${escapeHtml(img)}" alt="">` : ""}</td>

      <td class="col-make"><input class="admin-cell-input col-make" value="${escapeHtml(c.Make_Model || "")}"></td>
      <td class="col-registration"><input class="admin-cell-input col-registration" value="${escapeHtml(c.Registration || "")}"></td>

      <td class="col-vin"><input class="admin-cell-input col-vin" value="${escapeHtml((c.VIN ?? c.VIN_number ?? c['VIN number'] ?? c['VIN Number'] ?? '') || '')}"></td>
      <td class="col-v5c"><input class="admin-cell-input col-v5c" value="${escapeHtml((c.V5C_number ?? c.V5C ?? c['V5C number'] ?? c['V5C Number'] ?? '') || '')}"></td>
      <td class="col-hpi"><input class="admin-cell-input col-hpi" value="${escapeHtml((c.HPI_report_number ?? c['HPI report number'] ?? c['HPI Report Number'] ?? c['HPI report no'] ?? '') || '')}"></td>
      <td class="col-price"><input class="admin-cell-input col-price" type="number" value="${c.Price ?? ""}"></td>
      <td class="col-mileage"><input class="admin-cell-input col-mileage" type="number" value="${c.Mileage ?? ""}"></td>
      <td class="col-mot"><input class="admin-cell-input col-mot" type="date" value="${escapeHtml(c.MOT_Date || "")}"></td>
      <td class="col-engine"><input class="admin-cell-input col-engine" type="number" step="0.1" value="${c.Engine_size ?? ""}"></td>

      <td class="col-fuel">
        <select class="admin-cell-select col-fuel">
          ${fuelOptions.map(f =>
            `<option value="${f}" ${c.Fuel_type === f ? "selected" : ""}>${f}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-transmission">
        <select class="admin-cell-select col-transmission">
          ${transmissionOptions.map(t =>
            `<option value="${t}" ${c.Transmission === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-status">
        <select class="admin-cell-select col-status">
          ${statusOptions.map(s =>
            `<option value="${s}" ${normaliseStatus(c.Status) === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>

      <td class="col-eta"><input class="admin-cell-input col-eta" type="date" value="${escapeHtml(toISODate(c.ETA_in_stock || ""))}"></td>

      <td class="col-shortdesc">
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Short description">Expand</button>
          <textarea class="admin-cell-textarea" rows="3">${escapeHtml(c.Short_Description || "")}</textarea>
        </div>
      </td>

      <td class="col-fulldesc">
        <div class="admin-desc-cell">
          <button class="admin-btn tiny ghost admin-expand-btn" type="button" data-expand="desc" data-label="Full description">Expand</button>
          <textarea class="admin-cell-textarea" rows="4">${escapeHtml(c.Full_Description || "")}</textarea>
        </div>
      </td>

      <td class="col-actions">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="admin-btn tiny primary" onclick="save('${c.id}', this)">Save</button>
	  <button class="admin-btn tiny ghost" onclick="generateAI('${c.id}', this)">AI</button>
	  <button class="admin-btn tiny ghost" onclick="openPdi('${c.id}')">PDI</button>
	  <button class="admin-btn tiny ghost" onclick="markSold('${c.id}', this)">Mark sold</button>
	  <button class="admin-btn tiny ghost" onclick="markInactive('${c.id}', this)">Inactive</button>
	  <button class="admin-btn tiny ghost" onclick="markAvailable('${c.id}', this)">Revert</button>
        </div>
      </td>`;

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

function collectFieldsFromRow(tr) {
  const valueIn = (colClass, selector = "input, textarea, select") => {
    const cell = tr.querySelector(`td.${colClass}`);
    const el = cell?.querySelector(selector);
    return el ? el.value : "";
  };

  const vinVal = txt(valueIn("col-vin"));
  const v5cVal = txt(valueIn("col-v5c"));
  const hpiVal = txt(valueIn("col-hpi"));

  const core = {
    Make_Model: txt(valueIn("col-make")),
    Registration: txt(valueIn("col-registration")),
    Price: num(valueIn("col-price")),
    Mileage: num(valueIn("col-mileage")),
    MOT_Date: txt(valueIn("col-mot")),
    Engine_size: num(valueIn("col-engine")),
    Fuel_type: txt(valueIn("col-fuel")),
    Transmission: txt(valueIn("col-transmission")),
    Status: txt(valueIn("col-status")),
    ETA_in_stock: txt(valueIn("col-eta")),
    Short_Description: txt(valueIn("col-shortdesc", "textarea")),
    Full_Description: txt(valueIn("col-fulldesc", "textarea"))
  };

  // Use exact Airtable field names.
  return {
    ...core,
    ...(vinVal !== null ? { VIN: vinVal } : {}),
    ...(v5cVal !== null ? { V5C_number: v5cVal } : {}),
    ...(hpiVal !== null ? { HPI_report_number: hpiVal } : {})
  };
}

async function createNewCar(btn) {
  const tr = btn.closest("tr");
  const fields = collectFieldsFromRow(tr);

  // Sensible defaults (avoid accidentally creating a Hidden record).
  if (!fields.Status) fields.Status = "Available";

  if (!fields.Make_Model) {
    alert("Make / Model is required to create a vehicle.");
    return;
  }

  setRowBusy(btn, true, "Creating…");
  try {
    const res = await fetch(`${API}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields)
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) {
      alert(`Create failed: ${out?.error || "Unknown error"}`);
      return;
    }

    newCarDraft = null;

    // Keep public site in sync immediately.
    refreshPublicStockCache();

    // Re-load to pick up Airtable-computed fields (e.g., attachments) consistently.
    await loadStock();
  } catch (err) {
    console.error(err);
    alert("Create failed due to a network error.");
  } finally {
    setRowBusy(btn, false, "Create");
    if (addCarBtn) addCarBtn.disabled = false;
  }
}

function cancelNewCar() {
  newCarDraft = null;
  renderStockTable();
}

// Expose for inline onclick handlers
window.createNewCar = createNewCar;
window.cancelNewCar = cancelNewCar;

/* ---------- SAVE ---------- */

async function save(id, btn) {
  const tr = btn.closest("tr");

  const valueIn = (colClass, selector = "input, textarea, select") => {
    const cell = tr.querySelector(`td.${colClass}`);
    const el = cell?.querySelector(selector);
    return el ? el.value : "";
  };

  // Class-driven values (safe if columns are reordered in HTML)
  const vinVal = txt(valueIn("col-vin"));
  const v5cVal = txt(valueIn("col-v5c"));
  const hpiVal = txt(valueIn("col-hpi"));

  const core = {
    Make_Model: txt(valueIn("col-make")),
    Registration: txt(valueIn("col-registration")),
    Price: num(valueIn("col-price")),
    Mileage: num(valueIn("col-mileage")),
    MOT_Date: txt(valueIn("col-mot")),
    Engine_size: num(valueIn("col-engine")),
    Fuel_type: txt(valueIn("col-fuel")),
    Transmission: txt(valueIn("col-transmission")),
    Status: txt(valueIn("col-status")),
    ETA_in_stock: txt(valueIn("col-eta")),
    Short_Description: txt(valueIn("col-shortdesc", "textarea")),
    Full_Description: txt(valueIn("col-fulldesc", "textarea"))
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
/* (rest of file unchanged from your current version) */


function renderKeyValueList(items, total = null) {
  if (!items || items.length === 0) return `<div class="admin-muted">No data yet.</div>`;

  const max = Math.max(...items.map(i => Number(i.count || 0)), 1);
  const safeTotal = (typeof total === "number" && total > 0) ? total : null;

  return items.map(i => {
    const c = Number(i.count || 0);
    const w = Math.round((c / max) * 100);
    const pct = safeTotal ? ` <span class="admin-muted">(${Math.round((c / safeTotal) * 100)}%)</span>` : "";
    return `
      <div class="kv-row">
        <div class="kv-key">${escapeHtml(i.key)}</div>
        <div class="kv-bar-wrap" aria-hidden="true"><div class="kv-bar" style="width:${w}%"></div></div>
        <div class="kv-val">${fmt.format(c)}${pct}</div>
      </div>
    `;
  }).join("");
}


async function loadAnalytics() {
  kpiTotal.textContent = "—";
  kpiMeta.textContent = "Loading…";
  topPagesEl.innerHTML = "";
  topCountriesEl.innerHTML = "";
  if (topEventsEl) topEventsEl.innerHTML = "";
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

  topPagesEl.innerHTML = renderKeyValueList(j.topPages, j.total || null);
  topCountriesEl.innerHTML = renderKeyValueList(j.topCountries, j.total || null);

  // Lead actions (conversion events)
  if (topEventsEl) {
    topEventsEl.innerHTML = `<div class="admin-muted">Loading…</div>`;
    try {
      const er = await fetch(`${API}/events?days=${days}`, { credentials: "include" });
      const ej = await er.json().catch(() => null);
      if (er.ok && ej?.ok) {
        lastEvents = ej;
        topEventsEl.innerHTML = (ej.topEvents && ej.topEvents.length)
          ? renderKeyValueList(ej.topEvents, ej.total || null)
          : `<div class="admin-muted">No lead events captured yet.</div>`;
      } else {
        topEventsEl.innerHTML = `<div class="admin-muted">Events unavailable.</div>`;
      }
    } catch (e) {
      topEventsEl.innerHTML = `<div class="admin-muted">Events unavailable.</div>`;
    }
  }

  // Top vehicles: prefer server-provided, otherwise derive from topPages using vehicle page URLs.
  const derivedCars = deriveTopCarsFromPages(j.topPages, lastCars);
  const topCars = Array.isArray(j.topCars) && j.topCars.length ? j.topCars : derivedCars;

  if (topCarsEl) {
    topCarsEl.innerHTML = topCars.length
      ? renderKeyValueList(topCars, j.total || null)
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
    label: r.day,
    value: Number(r.total || 0)
  }));

  drawLineChart(viewsChart, series);

  if (viewsChartMeta) {
    const total = Number(j.total || 0);
    const avg = series.length ? (total / series.length) : 0;
    viewsChartMeta.textContent = `Average ${fmt.format(Math.round(avg))} per day`;
  }

  drawBarChart(
    topPagesChart,
    (j.topPages || []).slice(0, 8).map(i => ({ label: i.key, value: i.count || 0 }))
  );

  drawBarChart(
    topCountriesChart,
    (j.topCountries || []).slice(0, 8).map(i => ({ label: i.key, value: i.count || 0 }))
  );
}

/* ---------- SETTINGS (Sold vehicles) ---------- */

async function loadSoldSettings() {
  if (!soldSettingsNote) return;

  soldSettingsNote.textContent = "Loading…";
  const r = await fetch(`${API}/settings/sold`, { credentials: "include" });
  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    soldSettingsNote.textContent = `Error: ${j.error || "Failed to load."}`;
    return;
  }

  const sold = j.sold || {};
  if (soldShowToggle) soldShowToggle.checked = !!sold.showSold;
  if (soldKeepDays) soldKeepDays.value = String(sold.keepDays ?? 30);

  soldSettingsNote.textContent = sold.updatedAt
    ? `Last updated: ${new Date(sold.updatedAt).toLocaleString()}`
    : "—";
}

async function saveSoldSettings() {
  if (!soldSettingsNote) return;

  soldSettingsNote.textContent = "Saving…";

  const showSold = !!soldShowToggle?.checked;
  const keepDays = Number(soldKeepDays?.value || 30);

  const r = await fetch(`${API}/settings/sold`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showSold, keepDays })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    soldSettingsNote.textContent = `Error: ${j.error || "Failed to save."}`;
    return;
  }

  soldSettingsNote.textContent = `Saved: ${new Date(j.sold.updatedAt).toLocaleString()}`;
  refreshPublicStockCache();
}

/* ---------- INIT ---------- */

checkLogin();

// Redraw charts on resize (debounced)
window.addEventListener("resize", debounce(() => {
  if (lastAnalytics) renderCharts(lastAnalytics);
}, 200));
