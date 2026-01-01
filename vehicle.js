/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller
   Includes: Hero image, swipeable gallery, enquire prefill,
   WhatsApp CTA (badge SVG with embedded wordmark)
--------------------------------------------------------- */


// P55 premium vehicle UI patch version
const P55_VEHICLE_UI_VERSION = "v6.7-2026-01-01";
try { document.documentElement.dataset.p55Vehicle = P55_VEHICLE_UI_VERSION; } catch(e) {}

const API_BASE_PATH = "/cars-api";

function apiUrl(suffix = "") {
  const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);

  // Debug: add &nocache=1 to force refresh
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u;
}

async function fetchPublicMeta() {
  const out = { version: null, sold: { showSold: true, keepDays: 30 } };

  try {
    const r = await fetch(apiUrl("/settings").toString(), { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) {
      out.version = j.version ?? out.version;
      out.sold = {
        showSold: typeof j.sold?.showSold === "boolean" ? j.sold.showSold : out.sold.showSold,
        keepDays: Number.isFinite(Number(j.sold?.keepDays)) ? Number(j.sold.keepDays) : out.sold.keepDays
      };
      return out;
    }
  } catch {}

  try {
    const r = await fetch(apiUrl("/version").toString(), { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) out.version = j.version ?? out.version;
  } catch {}

  return out;
}

function p55InitVehicle() {
  try { loadVehicle(); } catch (e) { console.error("Vehicle init failed:", e); }
}

// Run even if this script is loaded with async (after DOMContentLoaded)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", p55InitVehicle);
} else {
  p55InitVehicle();
}

// Also re-run on bfcache restores
window.addEventListener("pageshow", (e) => {
  if (e && e.persisted) p55InitVehicle();
});
async function loadVehicle() {
  const params = new URLSearchParams(window.location.search);
  const id = (params.get("id") || "").trim();
// Robust root container detection (supports both /vehicle and /vehicle.html templates)
let container =
  document.getElementById("vehicle-page") ||
  document.getElementById("vehicle-title")?.closest("main, section, .container") ||
  document.querySelector("main") ||
  document.body;

// Ensure styling hooks exist even if the HTML template did not include #vehicle-page
try {
  if (!document.getElementById("vehicle-page") && container && container !== document.documentElement) {
    container.id = "vehicle-page";
  }
  document.body.classList.add("p55-vehicle-page");
} catch (e) {}

if (!id) {
  // No id in URL: fail gracefully without blanking the whole page
  try {
    const t = document.getElementById("vehicle-title");
    if (t) t.textContent = "Vehicle not found";
    const d = document.getElementById("vehicle-description");
    if (d) d.textContent = "Please return to Current Stock and select a vehicle.";
  } catch (e) {}
  return;
}

if (!container) container = document.body;
try {
    const meta = await fetchPublicMeta();

    const stockUrl = apiUrl("");
    if (meta.version) stockUrl.searchParams.set("v", String(meta.version));

    const res = await fetch(stockUrl.toString());
    if (!res.ok) throw new Error("API error " + res.status);

    const data = await res.json();
    const records = Array.isArray(data?.records)
  ? data.records
  : (Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));

const record = records.find(r => String(r?.id || "").trim() === id);
if (!record) {
  console.warn("Vehicle record not found for id:", id, "records:", Array.isArray(records) ? records.length : 0, "data keys:", Object.keys(data || {}));
  setText("vehicle-title", "Vehicle not found");
  setText("vehicle-description", "This listing may have been removed or the link is incomplete.");
  return;
}

    if (!isRecordPublic(record, meta)) {
      renderUnavailable(container, "This vehicle is no longer listed.");
      return;
    }

    renderVehicle(record);
  } catch (err) {
    console.error("Vehicle fetch failed:", err);
    container.innerHTML = "<p style='color:red;'>Failed to load vehicle details.</p>";
  }
}

function isRecordPublic(rec, meta) {
  const f = rec?.fields || {};
  const st = String(f.Status || "Available").trim() || "Available";

  if (st === "Hidden") return false;
  if (st !== "Sold") return true;

  const soldCfg = meta?.sold || { showSold: true, keepDays: 30 };
  const showSold = typeof soldCfg.showSold === "boolean" ? soldCfg.showSold : true;
  const keepDays = Number.isFinite(Number(soldCfg.keepDays)) ? Number(soldCfg.keepDays) : 30;

  if (!showSold || keepDays === 0) return false;

  const ts = Number(rec?.__p55?.soldAtTs || 0);
  if (ts > 0) {
    const age = Date.now() - ts;
    if (age > keepDays * 86400 * 1000) return false;
  }

  return true;
}

function renderUnavailable(container, message) {
  container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">
      <div class="vehicle-sold-banner" style="margin-top:16px;">
        <div class="vehicle-sold-left">
          <div class="vehicle-sold-pill">Unavailable</div>
          <div class="vehicle-sold-meta">${escapeHtml(message || "This vehicle is no longer listed.")}</div>
        </div>
        <div class="vehicle-sold-cta">
          <a href="/index.html">View current stock</a>
        </div>
      </div>
    </div>
  `;
}

function upsertSoldBanner(rec) {
  const st = String(rec?.fields?.Status || "Available").trim() || "Available";
  const isSold = st === "Sold";
  const container = document.getElementById("vehicle-page") || document.body;

  const existing = document.getElementById("vehicle-sold-banner");
  if (!isSold) {
    existing?.remove();
    return;
  }

  const soldTs = Number(rec?.__p55?.soldAtTs || 0);
  const soldDateText = soldTs > 0
    ? new Date(soldTs).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const wrap = document.createElement("div");
  wrap.id = "vehicle-sold-banner";
  wrap.className = "vehicle-sold-banner";
  wrap.innerHTML = `
    <div class="vehicle-sold-left">
      <div class="vehicle-sold-pill">Sold</div>
      <div class="vehicle-sold-meta">
        This vehicle has been sold${soldDateText ? ` on ${escapeHtml(soldDateText)}` : ""}. If you would like something similar, please get in touch.
      </div>
    </div>
    <div class="vehicle-sold-cta">
      <a href="/contact.html?msg=${encodeURIComponent("I'm looking for a similar vehicle to the one you've just sold.")}">Enquire</a>
    </div>
  `;

  const first = container.firstElementChild;
  if (existing) existing.replaceWith(wrap);
  else if (first) container.insertBefore(wrap, first);
  else container.appendChild(wrap);
}



/* ---------------------------
   P55 PREMIUM VEHICLE HEADER (ID-based, template-robust)
   - Builds an icon "pill" grid beneath the photo strip (bigger than cards)
   - Removes legacy text rows (Mileage/Transmission/MOT/Engine/Fuel)
   - Uses existing #vehicle-* IDs, so it works with any vehicle.html variant
---------------------------- */

const P55_ICON_BASE = "/assets/icons";
const P55_ICONS = {
  transmission: `${P55_ICON_BASE}/transmission.svg`,
  mot: `${P55_ICON_BASE}/mot.svg`,
  mileage: `${P55_ICON_BASE}/mileage.svg`,
  fuel: `${P55_ICON_BASE}/fuel.svg`,
  engine: `${P55_ICON_BASE}/engine.svg`,
  registration: `${P55_ICON_BASE}/registration.svg`,
};

function p55Esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function p55SpecItem(iconUrl, label, value) {
  if (!value) return "";
  const icon = iconUrl ? `<img class="spec-icon" src="${iconUrl}" alt="${p55Esc(label)}">` : "";
  return `
    <div class="spec" aria-label="${p55Esc(label)}: ${p55Esc(value)}" title="${p55Esc(label)}: ${p55Esc(value)}">
      ${icon}
      <div class="spec-value">${p55Esc(value)}</div>
    </div>
  `;
}

function p55FindHeaderRoot() {
  // Prefer explicit class from skeleton, otherwise fall back to the block containing the title.
  const explicit = document.querySelector(".vehicle-header");
  if (explicit) return explicit;

  const title = document.getElementById("vehicle-title");
  if (!title) return null;

  // Walk up until a reasonable container
  let el = title.parentElement;
  while (el && el !== document.body) {
    const tag = el.tagName.toLowerCase();
    if (tag === "section" || tag === "main" || (tag === "div" && el.children.length > 2)) return el;
    el = el.parentElement;
  }
  return title.parentElement;
}

function p55FindGalleryRoot() {
  const explicit = document.querySelector(".vehicle-gallery");
  if (explicit) return explicit;

  const hero = document.getElementById("vehicle-hero");
  if (!hero) return null;

  let el = hero.parentElement;
  while (el && el !== document.body) {
    const tag = el.tagName.toLowerCase();
    if (tag === "section" || tag === "main" || (tag === "div" && el.children.length > 1)) return el;
    el = el.parentElement;
  }
  return hero.parentElement;
}

function p55EnsureTopGrid() {
  const page = document.getElementById("vehicle-page") || document.body;
  const gallery = p55FindGalleryRoot();
  const header = p55FindHeaderRoot();
  if (!gallery || !header) return;

  let top = page.querySelector(".vehicle-top");
  if (!top) {
    top = document.createElement("div");
    top.className = "vehicle-top";
    // Insert at the earliest of gallery/header if possible
    const first = gallery.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING ? gallery : header;
    first.parentNode.insertBefore(top, first);
  }

  if (!top.contains(gallery)) top.appendChild(gallery);
  if (!top.contains(header)) top.appendChild(header);
}

function p55RemoveClosest(el, selectors) {
  if (!el) return;
  const row = el.closest(selectors);
  if (row && row.parentNode) row.parentNode.removeChild(row);
}

function p55PruneLegacySpecs() {
  // Mark legacy "Mileage / Transmission / MOT / Engine / Fuel" rows as hidden after pills are rendered.
  const entries = [
    { id: "vehicle-mileage", label: "mileage" },
    { id: "vehicle-transmission", label: "transmission" },
    { id: "vehicle-mot", label: "mot" },
    { id: "vehicle-engine", label: "engine" },
    { id: "vehicle-fuel", label: "fuel" }
  ];

  const mark = (row) => {
    if (!row || row === document.body || row === document.documentElement) return;
    row.classList.add("p55-legacy-row");
    row.setAttribute("aria-hidden", "true");
  };

  const looksLikeSingleLine = (row, label) => {
    if (!row) return false;
    const txt = (row.textContent || "").trim().toLowerCase();
    if (!txt) return false;
    if (txt.length > 120) return false; // avoid hiding big containers
    if (!txt.includes(label)) return false;
    if (row.querySelector("a, button")) return false;
    return true;
  };

  entries.forEach(({ id, label }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Common: <p>Label <span id=...>Value</span></p>
    let row = el.closest("p, li");
    if (row) return mark(row);

    // Common: <div>Label <span id=...>Value</span></div>
    row = el.closest("div");
    if (looksLikeSingleLine(row, label)) return mark(row);

    // Fallback: parent element if it seems to be a short line
    const parent = el.parentElement;
    if (looksLikeSingleLine(parent, label)) mark(parent);
  });
}

function p55FormatMileageShort(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  if (Number.isFinite(n)) return n.toLocaleString("en-GB");
  return String(value).trim();
}

function p55FormatEngineSize(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (/^\d+(\.\d+)?$/.test(s)) {
    const cleaned = s.replace(/\.0$/, "");
    return `${cleaned}L`;
  }
  if (/l$/i.test(s) || /litre/i.test(s)) return s;
  return s;
}

function p55TidySpecsGrid(gridEl) {
  if (!gridEl) return;

  gridEl.querySelectorAll(".spec").forEach(el => el.classList.remove("span-2", "span-3"));
  const cols = window.matchMedia("(max-width: 560px)").matches ? 2 : 3;
  const items = [...gridEl.querySelectorAll(".spec")];
  const remainder = items.length % cols;
  if (remainder === 0) return;

  const span = Math.min(cols, (cols - remainder + 1));
  items[items.length - 1].classList.add(`span-${span}`);
}

function p55ApplyPremiumSpecs(fields) {
  const header = p55FindHeaderRoot();
  if (!header) return;

  if (header.dataset.p55Specs === "1") return;
  header.dataset.p55Specs = "1";

  // Move title + price into a single row if possible
  const title = document.getElementById("vehicle-title");
  const price = document.getElementById("vehicle-price");
  if (title && price) {
    let row = header.querySelector(".vehicle-title-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "vehicle-title-row";
      header.insertBefore(row, title);
    }
    row.appendChild(title);
    row.appendChild(price);
  }

  // Remove the legacy rows and add our grid
  p55PruneLegacySpecs();

  let specs = header.querySelector(".vehicle-specs");
  if (!specs) {
    specs = document.createElement("div");
    specs.className = "vehicle-specs";
    const reg = document.getElementById("vehicle-reg");
    if (reg && reg.parentNode) reg.insertAdjacentElement("afterend", specs);
    else header.appendChild(specs);
  }

  const transmission = getTransmission(fields) || "";
  const mot = formatMaybeDate(fields.MOT_Date) || "";
  const mileage = p55FormatMileageShort(fields.Mileage) || "";
  const fuel = String(fields.Fuel_type || "").trim();
  const engine = p55FormatEngineSize(fields.Engine_size);
  const regValue = String(fields?.Registration || fields?.Reg || fields?.registration || "").trim();

  // Put MOT last (typically longest value) so it can span if needed
  specs.innerHTML =
    p55SpecItem(P55_ICONS.transmission, "Transmission", transmission) +
    p55SpecItem(P55_ICONS.mileage, "Mileage", mileage) +
    p55SpecItem(P55_ICONS.fuel, "Fuel", fuel) +
    p55SpecItem(P55_ICONS.engine, "Engine", engine) +
    p55SpecItem(P55_ICONS.registration, "Registration", regValue || (document.getElementById("vehicle-reg")?.textContent || "").replace(/^\s*registration\s*:\s*/i, "").trim()) +
    p55SpecItem(P55_ICONS.mot, "MOT Expiry", mot);

  p55TidySpecsGrid(specs);
}



function p55ApplyPremiumSpecsFromDom() {
  // Build pills from existing DOM values (fallback when field-based render differs across browsers/templates)
  const regEl = document.getElementById("vehicle-reg");
  const regText = (regEl?.textContent || "");
  const regValue = regText.replace(/^\s*registration\s*:\s*/i, "").trim();
  if (!regEl) return;

  const container =
    regEl.closest(".vehicle-header") ||
    regEl.closest("section") ||
    regEl.closest("main") ||
    regEl.parentElement;

  if (!container) return;

  // Avoid double-run
  if (container.dataset.p55SpecsDom === "1") return;
  container.dataset.p55SpecsDom = "1";

  // Read values (these IDs exist on your vehicle template)
  const transmission = (document.getElementById("vehicle-transmission")?.textContent || "").trim();
  const mileageRaw = (document.getElementById("vehicle-mileage")?.textContent || "").trim();
  const mot = (document.getElementById("vehicle-mot")?.textContent || "").trim();
  const engineRaw = (document.getElementById("vehicle-engine")?.textContent || "").trim();
  const fuel = (document.getElementById("vehicle-fuel")?.textContent || "").trim();

  const mileage = p55FormatMileageShort(mileageRaw.replace(/[^\d.,]/g, ""));
  const engine = p55FormatEngineSize(engineRaw.replace(/\s*litres?$/i, "").trim());

  // Ensure title/price row
  const title = document.getElementById("vehicle-title");
  const price = document.getElementById("vehicle-price");
  if (title && price) {
    let row = container.querySelector(".vehicle-title-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "vehicle-title-row";
      container.insertBefore(row, title);
    }
    row.appendChild(title);
    row.appendChild(price);
  }

  // Hide legacy lines
  try { p55PruneLegacySpecs(); } catch(e) {}

  // Create/update grid
  let specs = container.querySelector(".vehicle-specs");
  if (!specs) {
    specs = document.createElement("div");
    specs.className = "vehicle-specs";
    regEl.insertAdjacentElement("afterend", specs);

  // Hide the old 'Registration: ...' line (we show it as a pill instead)
  try {
    const regRow = regEl.closest("p, li, div");
    if (regRow) regRow.classList.add("p55-legacy-row");
    else regEl.classList.add("p55-legacy-row");
  } catch(e) {}
  }

  specs.innerHTML =
    p55SpecItem(P55_ICONS.transmission, "Transmission", transmission) +
    p55SpecItem(P55_ICONS.mileage, "Mileage", mileage) +
    p55SpecItem(P55_ICONS.fuel, "Fuel", fuel) +
    p55SpecItem(P55_ICONS.engine, "Engine", engine) +
    p55SpecItem(P55_ICONS.registration, "Registration", regValue) +
    p55SpecItem(P55_ICONS.mot, "MOT Expiry", mot);

  p55TidySpecsGrid(specs);
}

function p55PruneInlineWhatsAppUI() {
  // Remove any inline WhatsApp UI fragments, keeping only:
  // 1) the main blue Enquire CTA and 2) the floating WhatsApp FAB (#whatsapp-btn).
  const keepFab = document.getElementById("whatsapp-btn");

  const hideEl = (el) => {
    if (!el || el === document.body || el === document.documentElement) return;
    el.classList.add("p55-legacy-row");
    el.setAttribute("aria-hidden", "true");
  };

  const isEnquireCta = (el) => {
    const t = (el?.textContent || "").trim().toLowerCase();
    return t.includes("enquire about this vehicle");
  };

  // Identify the main Enquire CTA (so we don't accidentally hide its container)
  const enquireEl = [...document.querySelectorAll("a,button")].find(isEnquireCta) || null;

  // 1) Hide inline WhatsApp links that are not the floating FAB
  document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]').forEach(a => {
    if (keepFab && a === keepFab) return;
    if (enquireEl && (a === enquireEl || enquireEl.contains(a))) return;
    // Hide the nearest "row" wrapper
    hideEl(a.closest("p, li, div, section") || a);
  });

  // 2) Hide any "WhatsApp" inline label blocks (often not links) + legacy helper text rows
  const keywords = [
    "message about this car",
    "quick question",
    "viewing times",
    "part-exchange",
    "whatsapp"
  ];

  // Limit scan area: prefer the region around the Enquire CTA, otherwise the vehicle page
  const scanRoot =
    (enquireEl && (enquireEl.closest("section") || enquireEl.closest("#vehicle-page"))) ||
    document.getElementById("vehicle-page") ||
    document.body;

  scanRoot.querySelectorAll("p, div, span, small, a").forEach(el => {
    if (keepFab && (el === keepFab || keepFab.contains(el))) return;
    if (enquireEl && (el === enquireEl || enquireEl.contains(el))) return;

    const t = (el.textContent || "").trim().toLowerCase();
    if (!t) return;

    // The pesky case: a tiny "WhatsApp" label + arrow/underline remnants
    const looksLikeTinyWhatsApp =
      (t === "whatsapp" || t.startsWith("whatsapp")) &&
      !el.querySelector("button") &&
      !isEnquireCta(el);

    const looksLikeLegacyHelper =
      keywords.some(k => t.includes(k)) &&
      !isEnquireCta(el);

    // Hide images/icons that reference WhatsApp as well
    const hasWhatsAppImg = !!el.querySelector('img[src*="whatsapp"], img[alt*="WhatsApp"], img[alt*="whatsapp"]');

    // Avoid hiding footer/nav etc: focus on compact blocks (single-line style)
    const isCompact = t.length <= 120;

    if ((looksLikeTinyWhatsApp || looksLikeLegacyHelper || hasWhatsAppImg) && isCompact) {
      hideEl(el.closest("p, div, section") || el);
    }
  });
}

function p55SetupFabReveal() {
  const fab = document.getElementById("whatsapp-btn");
  if (!fab) return;

  if (fab.dataset.p55RevealBound === "1") return;
  fab.dataset.p55RevealBound = "1";

  const revealAt = 0.70;

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) : 0;

    if (p >= revealAt) fab.classList.add("is-visible");
    else fab.classList.remove("is-visible");
  };

  const onResize = () => {
    onScroll();
    const grid = document.querySelector(".vehicle-specs");
    if (grid) p55TidySpecsGrid(grid);
  };

  onResize();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
}

function renderVehicle(rec) {
  const f = rec.fields || {};

  upsertSoldBanner(rec);

  const heroImg = document.getElementById("vehicle-hero");
  const thumbs = document.getElementById("vehicle-thumbs");

  /* ------- Populate Text ------- */
  setText("vehicle-title", f.Make_Model);
  setText("vehicle-reg", f.Registration ? `Registration: ${f.Registration}` : "");
  setText("vehicle-price", f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA");
  setText("vehicle-mileage", f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—");
  setText("vehicle-transmission", getTransmission(f) || "—");
  setText("vehicle-mot", formatMaybeDate(f.MOT_Date) || "—");
  setText("vehicle-engine", p55FormatEngineSize(f.Engine_size) || "—");
  setText("vehicle-fuel", f.Fuel_type || "—");

  renderDescriptionSections(f.Full_Description);

  /* ------- Images ------- */
  const photos = Array.isArray(f.Photos) ? f.Photos : [];
  let index = 0;

  function updateHero(i) {
    if (!photos.length || !heroImg) return;
    index = i;
    heroImg.src = photos[i].url;
    heroImg.alt = f.Make_Model || "Vehicle photo";
    updateThumbHighlight();
  }

  function updateThumbHighlight() {
    const all = document.querySelectorAll(".vehicle-thumb");
    all.forEach((el, i) => el.classList.toggle("active", i === index));
  }

  if (thumbs) {
    thumbs.innerHTML = "";
    photos.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.className = `vehicle-thumb ${i === 0 ? "active" : ""}`;
      btn.innerHTML = `<img src="${p.url}" alt="Photo ${i + 1}">`;
      btn.onclick = () => updateHero(i);
      thumbs.appendChild(btn);
    });
  }

  if (photos.length) updateHero(0);

  /* ------- Swipe Support ------- */
  let startX = 0;
  heroImg?.addEventListener("touchstart", e => (startX = e.touches[0].clientX), { passive: true });

  heroImg?.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && index < photos.length - 1) updateHero(index + 1);
    if (dx > 0 && index > 0) updateHero(index - 1);
  });

  /* ------- CTAs: Enquire + WhatsApp ------- */
  const st = String(f.Status || "Available").trim() || "Available";
  const isSold = st === "Sold";

  // Enquire button: update nested spans instead of wiping markup with textContent
  const enquireBtn = document.getElementById("enquire-btn");
  if (enquireBtn) {
    const main = enquireBtn.querySelector(".enquire-btn__main");
    const meta = enquireBtn.querySelector(".enquire-btn__meta");

    const mainText = isSold ? "Enquire Similar Vehicle" : "Enquire About This Vehicle";
    const metaText = isSold ? "We can source something similar" : "Fast response • No obligation";

    if (main) main.textContent = mainText;
    else enquireBtn.textContent = mainText; // fallback

    if (meta) meta.textContent = metaText;

    enquireBtn.onclick = () => {
      const msg = isSold
        ? `I am looking for something similar to the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}) you have just sold.`
        : `I am interested in the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}).`;

      location.href = `/contact.html?msg=${encodeURIComponent(msg)}`;
    };
  }

  // WhatsApp CTA: set href every time based on this vehicle
  const waBtn = document.getElementById("whatsapp-btn");
  const phone = String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");
  if (waBtn && phone) {
    const msg = isSold
      ? `Hi Project 55 Motors — I saw the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}) and understand it is sold. Can you source something similar?\n\nLink: ${location.href}`
      : `Hi Project 55 Motors — I’m interested in the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}). Please can we arrange a viewing?\n\nLink: ${location.href}`;

    waBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    waBtn.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
    waBtn.title = "Message on WhatsApp";

  // Premium: use whitespace under photos + icons grid + remove duplicate WhatsApp row
  // (v6) Keep vertical layout (do not restructure gallery/header)
  p55ApplyPremiumSpecs(f);
  p55ApplyPremiumSpecsFromDom();
  p55PruneInlineWhatsAppUI();
  p55SetupFabReveal();

  }
}

function setText

  // Premium header (icons + pills) + remove legacy inline WhatsApp helper row
  try { p55ApplyPremiumSpecs(f); } catch (e) {}
  try { p55ApplyPremiumSpecsFromDom(); } catch (e) {}
  try { p55PruneInlineWhatsAppUI(); } catch (e) {}
  try { p55SetupFabReveal(); } catch (e) {}
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function getTransmission(fields) {
  return (
    fields.Transmission ||
    fields.Transmission_type ||
    fields.Gearbox ||
    fields.Gearbox_type ||
    ""
  );
}

function formatMaybeDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Full Description Parsing (headings) ---------- */

function isHeading(line) {
  const l = String(line).trim().replace(/[:\-–—]+\s*$/g, "").toLowerCase();
  if (!l) return "";

  if (/(^opening\s*comments?$)|(^opening$)|(^overview$)|(^intro(duction)?$)/i.test(l)) return "opening";
  if (/^highlights?$/i.test(l)) return "highlights";
  if (/^(specification|specs|spec)$/i.test(l)) return "specification";
  if (/^condition$/i.test(l)) return "condition";
  if (/^why\s*(this\s*)?car\s*stands\s*out$/i.test(l)) return "standout";

  return "";
}

function parseFullDescription(raw) {
  const sections = {
    opening: [],
    highlights: [],
    specification: [],
    condition: [],
    standout: []
  };

  const lines = String(raw)
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let current = "opening";

  for (const line of lines) {
    const heading = isHeading(line);
    if (heading) {
      current = heading;
      continue;
    }

    const cleaned = line.replace(/^[•\u2022\-\*]+\s*/, "").trim();
    if (!cleaned) continue;

    sections[current].push(cleaned);
  }

  return sections;
}

function renderLinesAsParagraph(lines) {
  if (!lines || !lines.length) return "";
  return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
}

function renderLinesAsList(lines) {
  if (!lines || !lines.length) return "";
  return `<ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

function renderDescriptionSections(text) {
  const el = document.getElementById("vehicle-description");
  if (!el) return;

  const raw = (text || "").toString().trim();
  if (!raw) {
    el.innerHTML = "";
    return;
  }

  const s = parseFullDescription(raw);

  let introLines = s.opening;
  if (!introLines.length) {
    introLines = raw
      .replace(/\r/g, "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  const introHtml = introLines.length
    ? `<div class="vehicle-desc-intro">${renderLinesAsParagraph(introLines)}</div>`
    : "";

  const cards = [
    { title: "Highlights", lines: s.highlights },
    { title: "Specification", lines: s.specification },
    { title: "Condition", lines: s.condition },
    { title: "Why This Car Stands Out", lines: s.standout }
  ].filter(c => c.lines && c.lines.length);

  const cardsHtml = cards.length
    ? `<div class="vehicle-desc-sections">
         ${cards.map(c => `
           <section class="vehicle-desc-card">
             <h2>${escapeHtml(c.title)}</h2>
             ${renderLinesAsList(c.lines)}
           </section>
         `).join("")}
       </div>`
    : "";

  el.innerHTML = `${introHtml}${cardsHtml}`;
}