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

/* AI review modal */
const aiReviewOverlay = document.getElementById("aiReviewOverlay");
const aiReviewTitle = document.getElementById("aiReviewTitle");
const aiReviewSubtitle = document.getElementById("aiReviewSubtitle");
const aiReviewCloseBtn = document.getElementById("aiReviewCloseBtn");
const aiReviewCancelBtn = document.getElementById("aiReviewCancelBtn");
const aiApproveBtn = document.getElementById("aiApproveBtn");
const aiCopyCazooBtn = document.getElementById("aiCopyCazooBtn");
const aiCopyFacebookBtn = document.getElementById("aiCopyFacebookBtn");
const aiReviewFull = document.getElementById("aiReviewFull");
const aiReviewShort = document.getElementById("aiReviewShort");
const aiReviewRisk = document.getElementById("aiReviewRisk");
const aiReviewCazoo = document.getElementById("aiReviewCazoo");
const aiReviewFacebook = document.getElementById("aiReviewFacebook");
const aiFullCount = document.getElementById("aiFullCount");

let activeDescTarget = null; // table textarea currently being edited
let activeAiReviewId = null;
let activeAiReviewCar = null;

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

/* ---------- AI review modal ---------- */

function setAiReviewOpen(open) {
  if (!aiReviewOverlay) return;
  aiReviewOverlay.style.display = open ? "flex" : "none";
  aiReviewOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("admin-modal-open", !!open || descOverlay?.style.display === "flex");
}

function updateAiFullCount() {
  if (!aiReviewFull || !aiFullCount) return;
  const n = aiReviewFull.value.length;
  aiFullCount.textContent = `${fmt.format(n)} character${n === 1 ? "" : "s"}`;
}

function openAiReview(id, data = {}) {
  const car = (lastCars || []).find(c => c.id === id) || {};
  activeAiReviewId = id;
  activeAiReviewCar = car;
  if (aiReviewTitle) aiReviewTitle.textContent = `AI Review${car.Registration ? ` · ${car.Registration}` : ""}`;
  if (aiReviewSubtitle) aiReviewSubtitle.textContent = car.Make_Model || "Review and edit the AI advert before approving it into the live website fields.";
  if (aiReviewFull) aiReviewFull.value = data.AI_Website_Full_Description || car.AI_Website_Full_Description || "";
  if (aiReviewShort) aiReviewShort.value = data.AI_Website_Short_Description || car.AI_Website_Short_Description || "";
  if (aiReviewRisk) aiReviewRisk.value = data.AI_Risk_Notes || car.AI_Risk_Notes || "";
  if (aiReviewCazoo) aiReviewCazoo.value = data.AI_Motors_Description || car.AI_Motors_Description || "";
  if (aiReviewFacebook) aiReviewFacebook.value = data.AI_Facebook_Post || car.AI_Facebook_Post || "";
  updateAiFullCount();
  setAiReviewOpen(true);
  setTimeout(() => aiReviewFull?.focus(), 0);
}

function closeAiReview() {
  activeAiReviewId = null;
  activeAiReviewCar = null;
  setAiReviewOpen(false);
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

async function approveAiFromReview() {
  if (!activeAiReviewId) return;
  const shortDescription = aiReviewShort?.value?.trim() || "";
  const fullDescription = aiReviewFull?.value?.trim() || "";
  if (!shortDescription && !fullDescription) {
    alert("There is no AI website description to approve.");
    return;
  }
  const ok = confirm("Approve this AI advert into the live website description fields?");
  if (!ok) return;
  aiApproveBtn.disabled = true;
  aiApproveBtn.dataset.prevText = aiApproveBtn.textContent;
  aiApproveBtn.textContent = "Approving…";
  try {
    const res = await fetch(`/api/ai/approve/${encodeURIComponent(activeAiReviewId)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ short_description: shortDescription, full_description: fullDescription })
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) {
      alert(`Approve failed: ${out.error || "Unknown error"}`);
      return;
    }
    updateLocalCar(activeAiReviewId, {
      ...(out.approved || {}),
      Short_Description: shortDescription,
      Full_Description: fullDescription,
      AI_Website_Short_Description: shortDescription,
      AI_Website_Full_Description: fullDescription,
      AI_Approved: true
    });
    refreshPublicStockCache();
    closeAiReview();
    renderStockTable();
    alert("AI advert approved and copied into the live website fields.");
  } catch (err) {
    console.error(err);
    alert("Approve failed due to a network error.");
  } finally {
    aiApproveBtn.disabled = false;
    if (aiApproveBtn.dataset.prevText) {
      aiApproveBtn.textContent = aiApproveBtn.dataset.prevText;
      delete aiApproveBtn.dataset.prevText;
    }
  }
}

aiReviewFull?.addEventListener("input", updateAiFullCount);
aiReviewCloseBtn?.addEventListener("click", closeAiReview);
aiReviewCancelBtn?.addEventListener("click", closeAiReview);
aiApproveBtn?.addEventListener("click", approveAiFromReview);
aiCopyCazooBtn?.addEventListener("click", async () => {
  const ok = await copyTextToClipboard(aiReviewCazoo?.value || "");
  alert(ok ? "Cazoo description copied." : "Cazoo description is empty.");
});
aiCopyFacebookBtn?.addEventListener("click", async () => {
  const ok = await copyTextToClipboard(aiReviewFacebook?.value || "");
  alert(ok ? "Facebook post copied." : "Facebook post is empty.");
});
aiReviewOverlay?.addEventListener("click", (e) => {
  if (e.target === aiReviewOverlay) closeAiReview();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && aiReviewOverlay?.style.display === "flex") {
    e.preventDefault();
    closeAiReview();
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

  const ok = confirm(
    "Run the AI workflow for this vehicle?\n\nThis will run model research, generate AI advert fields, then open an editable review window. Nothing goes live until you approve it."
  );
  if (!ok) return;

  const dealerInsight = prompt(
    "Any key dealer insight to include in the advert?\n\nExamples:\n- Rare TSI 90 model, much better than MPI\n- Supplied by local VW dealer and same family owned\n- 4 new premium tyres fitted\n- Very clean example, no immediate spend required\n\nLeave blank if there is nothing extra."
  );

  if (dealerInsight === null) return;

  setRowBusy(btn, true, "AI working…");

  try {
    const researchRes = await fetch(`/api/ai/research/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include"
    });

    const researchOut = await researchRes.json().catch(() => ({}));
    if (!researchRes.ok || !researchOut.ok) {
      alert(`AI research failed: ${researchOut.error || "Unknown error"}`);
      return;
    }

    updateLocalCar(id, { AI_Model_Research: researchOut.research || "" });

    const res = await fetch(`/api/ai/generate/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealer_insight: dealerInsight.trim() })
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) {
      alert(`AI generation failed: ${out.error || "Unknown error"}`);
      return;
    }

    const generated = out.generated || {};
    updateLocalCar(id, {
      ...generated,
      AI_Status: "Generated",
      AI_Last_Generated: new Date().toISOString(),
      AI_Approved: false
    });

    openAiReview(id, generated);
  } catch (err) {
    console.error(err);
    alert("AI workflow failed due to a network error.");
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

    // Keep local dashboard state in sync immediately, including Status dropdown changes.
    updateLocalCar(id, {
      ...fields,
      Status: normaliseStatus(fields.Status)
    });

    // Keep the public site in sync immediately.
    refreshPublicStockCache();

    // Re-apply the current filter so status changes move rows immediately.
    renderStockTable();
    console.log("Saved", id);
  } finally {
    setRowBusy(btn, false);
  }
}

/* ---------- ANALYTICS ---------- */
/* (rest of file unchanged from your current version) */


/* ---------- ANALYTICS ---------- */

function safeGet(id) {
  return document.getElementById(id);
}

function cleanAnalyticsPath(raw) {
  const s = String(raw || "").trim();
  if (!s) return "/";
  try {
    const u = new URL(s, location.origin);
    let pathname = u.pathname || "/";
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
    return pathname || "/";
  } catch {
    return s.split("?")[0].split("#")[0] || "/";
  }
}

function aggregateCleanPages(items) {
  const map = new Map();
  (items || []).forEach(item => {
    const path = cleanAnalyticsPath(item?.key || "");
    const count = Number(item?.count || 0);
    if (!path || !count) return;
    map.set(path, (map.get(path) || 0) + count);
  });
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0));
}

function normaliseForMatch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

function stockPathForCar(car) {
  const slug = String(car?.Slug || car?.slug || "").trim();
  if (slug) return `/stock/${slug}`;
  return "";
}

function findCarForAnalyticsPath(path, stock) {
  const p = normaliseForMatch(path);
  if (!p.includes("/stock/")) return null;

  return (stock || []).find(car => {
    const id = String(car?.id || "").toLowerCase();
    const slug = normaliseForMatch(car?.Slug || car?.slug || "");
    const generatedPath = normaliseForMatch(stockPathForCar(car));

    return (
      (id && p.includes(id)) ||
      (slug && p.includes(slug)) ||
      (generatedPath && p === generatedPath)
    );
  }) || null;
}

function deriveVehicleViewRows(pageItems, stock, totalViews) {
  const byVehicle = new Map();
  const unmatched = [];

  (pageItems || []).forEach(item => {
    const path = cleanAnalyticsPath(item?.key || "");
    const count = Number(item?.count || 0);
    if (!path || !count) return;

    const car = findCarForAnalyticsPath(path, stock);
    if (!car) {
      unmatched.push({ key: path, count });
      return;
    }

    const key = car.id || path;
    const existing = byVehicle.get(key) || {
      key,
      car,
      path,
      count: 0
    };
    existing.count += count;
    byVehicle.set(key, existing);
  });

  const vehicles = [...byVehicle.values()]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map(row => ({
      ...row,
      pct: totalViews ? Math.round((row.count / totalViews) * 100) : 0
    }));

  const otherPages = unmatched
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map(row => ({
      ...row,
      pct: totalViews ? Math.round((row.count / totalViews) * 100) : 0
    }));

  return { vehicles, otherPages };
}

function friendlyPathName(path) {
  const clean = cleanAnalyticsPath(path);
  if (clean === "/") return "Homepage";
  if (clean === "/index.html") return "Homepage";
  if (clean === "/stock") return "Stock overview";
  if (clean.startsWith("/stock/")) return "Stock page";
  return clean
    .replace(/^\//, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, m => m.toUpperCase()) || "Page";
}

const COUNTRY_NAME_OVERRIDES = {
  GB: "United Kingdom",
  UK: "United Kingdom",
  US: "United States",
  RO: "Romania",
  IE: "Ireland",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  BE: "Belgium",
  PT: "Portugal",
  PL: "Poland"
};

function countryName(code) {
  const raw = String(code || "").trim();
  if (!raw) return "Unknown";
  const upper = raw.toUpperCase();
  if (COUNTRY_NAME_OVERRIDES[upper]) return COUNTRY_NAME_OVERRIDES[upper];

  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      return dn.of(upper) || upper;
    }
  } catch {}

  return upper;
}

function friendlyEventName(key) {
  const raw = String(key || "").trim();
  const v = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const map = {
    call: "Phone calls",
    phone: "Phone calls",
    phone_click: "Phone calls",
    call_click: "Phone calls",
    whatsapp: "WhatsApp clicks",
    whatsapp_click: "WhatsApp clicks",
    email: "Email clicks",
    email_click: "Email clicks",
    enquiry: "Enquiry clicks",
    enquiry_click: "Enquiry clicks",
    finance: "Finance clicks",
    finance_click: "Finance clicks",
    video: "Video plays",
    video_play: "Video plays",
    directions: "Directions clicks"
  };
  return map[v] || raw.replace(/[_-]/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function friendlyReferrerName(key) {
  const raw = String(key || "").trim();
  if (!raw || raw.toLowerCase() === "direct") return "Direct / unknown";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^www\./, "");
  }
}

function formatShortDate(day) {
  if (!day) return "—";
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function renderAnalyticsList(container, items, options = {}) {
  if (!container) return;
  const list = Array.isArray(items) ? items : [];
  const total = Number(options.total || 0);
  const max = Math.max(...list.map(i => Number(i.count || 0)), 1);
  const limit = options.limit || 6;

  if (!list.length) {
    container.innerHTML = `<div class="analytics-muted-panel">${escapeHtml(options.empty || "No data yet.")}</div>`;
    return;
  }

  container.innerHTML = list.slice(0, limit).map(item => {
    const count = Number(item.count || 0);
    const pct = total ? Math.round((count / total) * 100) : (item.pct || 0);
    const label = options.label ? options.label(item) : item.key;
    const sub = options.sub ? options.sub(item) : (pct ? `${pct}% of total` : "");
    const width = Math.max(3, Math.round((count / max) * 100));

    return `
      <div class="analytics-list-row">
        <div style="min-width:0">
          <div class="analytics-list-label">${escapeHtml(label)}</div>
          ${sub ? `<div class="analytics-list-sub">${escapeHtml(sub)}</div>` : ""}
          <div class="analytics-mini-bar" aria-hidden="true"><div class="analytics-mini-fill" style="width:${width}%"></div></div>
        </div>
        <div class="analytics-count">
          <strong>${fmt.format(count)}</strong>
          ${pct ? `<span>${pct}%</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderTopVehicles(container, vehicles, totalViews) {
  if (!container) return;
  const list = Array.isArray(vehicles) ? vehicles : [];

  if (!list.length) {
    container.innerHTML = `<div class="analytics-muted-panel">No stock-page views could be matched to current vehicles yet.</div>`;
    return;
  }

  container.innerHTML = list.slice(0, 8).map(item => {
    const car = item.car || {};
    const img = car.Photos?.[0]?.url || "";
    const name = car.Make_Model || "Vehicle";
    const reg = car.Registration || "—";
    const count = Number(item.count || 0);
    const pct = totalViews ? Math.round((count / totalViews) * 100) : (item.pct || 0);
    const path = cleanAnalyticsPath(item.path || stockPathForCar(car));

    return `
      <div class="analytics-vehicle-row">
        ${img ? `<img class="analytics-vehicle-thumb" src="${escapeHtml(img)}" alt="">` : `<div class="analytics-vehicle-thumb" aria-hidden="true"></div>`}
        <div style="min-width:0">
          <div class="analytics-vehicle-name">${escapeHtml(name)}</div>
          <div class="analytics-vehicle-meta">${escapeHtml(reg)}${path ? ` · ${escapeHtml(path)}` : ""}</div>
        </div>
        <div class="analytics-count">
          <strong>${fmt.format(count)}</strong>
          <span>${pct}% of views</span>
        </div>
      </div>
    `;
  }).join("");
}

function dailySeries(payload) {
  return (payload?.series || payload?.daily || []).map(row => ({
    day: row.day || row.date || "",
    total: Number(row.total ?? row.count ?? 0)
  }));
}

function renderDailyViewsTable(series) {
  const body = safeGet("dailyViews");
  if (!body) return;
  const rows = (series || []).slice(-14);

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="2">No daily view data yet.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(formatShortDate(row.day))}</td>
      <td>${fmt.format(row.total || 0)}</td>
    </tr>
  `).join("");
}

function renderCharts(state) {
  const j = state?.payload;
  if (!j) return;

  const series = dailySeries(j).map(r => ({
    label: formatShortDate(r.day),
    value: Number(r.total || 0)
  }));

  drawLineChart(viewsChart, series);

  if (viewsChartMeta) {
    const total = Number(j.total || 0);
    const avg = series.length ? (total / series.length) : 0;
    viewsChartMeta.textContent = `Avg ${fmt.format(Math.round(avg))} / day`;
  }
}

async function loadAnalytics() {
  const days = Number(analyticsRange?.value || 30);

  const setHtml = (id, html) => {
    const el = safeGet(id);
    if (el) el.innerHTML = html;
  };
  const setText = (id, text) => {
    const el = safeGet(id);
    if (el) el.textContent = text;
  };

  setText("kpiTotal", "—");
  setText("kpiMeta", "Loading…");
  setText("kpiLeadTotal", "—");
  setText("kpiLeadMeta", "Loading lead actions…");
  setText("kpiAverageViews", "—");
  setText("kpiAverageMeta", "—");
  setText("kpiBusiestViews", "—");
  setText("kpiBusiestMeta", "—");

  setHtml("topCars", `<div class="analytics-muted-panel">Loading…</div>`);
  setHtml("topCountries", `<div class="analytics-muted-panel">Loading…</div>`);
  setHtml("topEvents", `<div class="analytics-muted-panel">Loading…</div>`);
  setHtml("topReferrers", `<div class="analytics-muted-panel">Loading…</div>`);
  setHtml("topPages", `<div class="analytics-muted-panel">Loading…</div>`);
  renderDailyViewsTable([]);
  drawEmpty(viewsChart, "Loading…");

  const r = await fetch(`${API}/analytics?days=${days}`, { credentials: "include" });
  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    setText("kpiMeta", j?.error ? `Error: ${j.error}` : "Failed to load analytics.");
    drawEmpty(viewsChart, "Failed to load.");
    return;
  }

  lastAnalytics = { days, payload: j };

  const totalViews = Number(j.total || 0);
  const series = dailySeries(j);
  const avg = series.length ? totalViews / series.length : 0;
  const busiest = series.reduce((best, row) => (row.total > (best?.total ?? -1) ? row : best), null);
  const generated = new Date(j.generatedAt || Date.now());

  setText("kpiTotal", fmt.format(totalViews));
  setText("kpiMeta", `${days} day window · Updated ${generated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`);
  setText("kpiAverageViews", fmt.format(Math.round(avg)));
  setText("kpiAverageMeta", series.length ? `${series.length} days included` : "No daily data yet");
  setText("kpiBusiestViews", fmt.format(busiest?.total || 0));
  setText("kpiBusiestMeta", busiest?.day ? formatShortDate(busiest.day) : "No views yet");

  const cleanPages = Array.isArray(j.topCleanPages) && j.topCleanPages.length
    ? j.topCleanPages
    : aggregateCleanPages(j.topPages || []);

  const { vehicles, otherPages } = deriveVehicleViewRows(cleanPages, lastCars, totalViews);

  renderTopVehicles(safeGet("topCars"), vehicles, totalViews);

  renderAnalyticsList(safeGet("topCountries"), j.topCountries || [], {
    total: totalViews,
    limit: 6,
    empty: "No country data yet.",
    label: item => countryName(item.key),
    sub: item => `${String(item.key || "").toUpperCase()} country code`
  });

  const referrers = j.topReferrers || j.topReferrersDomains || j.topSources || [];
  renderAnalyticsList(safeGet("topReferrers"), referrers, {
    total: totalViews,
    limit: 6,
    empty: "No referrer data yet.",
    label: item => friendlyReferrerName(item.key),
    sub: item => item.key && String(item.key).toLowerCase() !== "direct" ? String(item.key) : "Typed address, bookmark, app browser, or privacy-protected traffic"
  });

  const usefulOtherPages = otherPages.filter(item => item.count > 0).slice(0, 8);
  renderAnalyticsList(safeGet("topPages"), usefulOtherPages, {
    total: totalViews,
    limit: 8,
    empty: "No other page views to show.",
    label: item => friendlyPathName(item.key),
    sub: item => cleanAnalyticsPath(item.key)
  });

  // Lead actions (conversion events)
  let eventPayload = null;
  try {
    const er = await fetch(`${API}/events?days=${days}`, { credentials: "include" });
    const ej = await er.json().catch(() => null);
    if (er.ok && ej?.ok) eventPayload = ej;
  } catch {}

  lastEvents = eventPayload;
  const leadTotal = Number(eventPayload?.total || 0);
  const leadRate = totalViews ? Math.round((leadTotal / totalViews) * 100) : 0;

  setText("kpiLeadTotal", fmt.format(leadTotal));
  setText("kpiLeadMeta", totalViews ? `${leadRate}% of page views generated an action` : "No page views yet");

  renderAnalyticsList(safeGet("topEvents"), eventPayload?.topEvents || [], {
    total: leadTotal || 1,
    limit: 6,
    empty: "No lead actions captured yet.",
    label: item => friendlyEventName(item.key),
    sub: item => "Buyer intent event"
  });

  renderDailyViewsTable(series);
  renderCharts(lastAnalytics);
}

function exportAnalyticsCsv() {
  if (!lastAnalytics?.payload?.ok) {
    alert("Load analytics first, then export.");
    return;
  }

  const days = lastAnalytics.days || 30;
  const a = lastAnalytics.payload;
  const totalViews = Number(a.total || 0);
  const cleanPages = Array.isArray(a.topCleanPages) && a.topCleanPages.length
    ? a.topCleanPages
    : aggregateCleanPages(a.topPages || []);
  const { vehicles, otherPages } = deriveVehicleViewRows(cleanPages, lastCars, totalViews);
  const series = dailySeries(a);

  const lines = [];
  const add = (row) => lines.push(row.map(v => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(","));

  add(["Project 55 Motors — Analytics export"]);
  add(["Range (days)", days]);
  add(["Generated (UTC)", new Date(a.generatedAt || Date.now()).toUTCString()]);
  add([]);

  add(["KPI", "Value"]);
  add(["Total page views", totalViews]);
  add(["Lead actions", lastEvents?.total || 0]);
  add([]);

  add(["Most viewed vehicles"]);
  add(["Vehicle", "Registration", "Views", "Share"]);
  vehicles.forEach(v => add([v.car?.Make_Model || "Vehicle", v.car?.Registration || "", v.count || 0, totalViews ? `${Math.round((v.count / totalViews) * 100)}%` : ""]));
  add([]);

  const dumpList = (title, items, mapper = i => i.key) => {
    add([title]);
    add(["Label", "Count"]);
    (items || []).forEach(i => add([mapper(i), i.count || 0]));
    add([]);
  };

  dumpList("Countries", a.topCountries, i => countryName(i.key));
  dumpList("Traffic sources", a.topReferrers, i => friendlyReferrerName(i.key));
  dumpList("Lead actions", lastEvents?.topEvents, i => friendlyEventName(i.key));
  dumpList("Other pages", otherPages, i => cleanAnalyticsPath(i.key));

  add(["Daily views"]);
  add(["Date", "Views"]);
  series.forEach(d => add([d.day, d.total || 0]));

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
