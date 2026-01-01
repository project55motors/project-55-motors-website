/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller
   Includes: Hero image, swipeable gallery, enquire prefill,
   WhatsApp CTA (badge SVG with embedded wordmark)
--------------------------------------------------------- */

const API_BASE_PATH = "/cars-api";

/* ---------------------------
   ICON CONFIG (shared with car cards)
   Update filenames here to match your /assets/icons folder.
---------------------------- */
const ICONS = {
  mileage: "/assets/icons/mileage.svg",
  fuel: "/assets/icons/fuel.svg",
  transmission: "/assets/icons/transmission.svg",
  mot: "/assets/icons/mot.svg",
  year: "/assets/icons/year.svg",
  engine: "/assets/icons/engine.svg",
  colour: "/assets/icons/colour.svg",
  ulez: "/assets/icons/ulez.svg",
  tax: "/assets/icons/tax.svg"
};


function apiUrl(suffix = "") {
  const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);

  // Debug: add &nocache=1 to force refresh
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u;
}

/* ---------- formatting helpers (match card formatting) ---------- */

function fmtPrice(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `£${Math.round(n).toLocaleString()}` : "POA";
}

function fmtMiles(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString()}` : "";
}

function fmtEngine(v) {
  if (!v) return "";
  const s = String(v).trim();
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return s;

  // Heuristic: <=10 => litres; otherwise => cc
  if (num <= 10) return `${num.toFixed(num % 1 === 0 ? 0 : 1)}L`;
  return `${Math.round(num).toLocaleString()}cc`;
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

document.addEventListener("DOMContentLoaded", () => {
  loadVehicle();
});

async function loadVehicle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const container = document.getElementById("vehicle-page");

  if (!id || !container) {
    if (container) container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
    return;
  }

  try {
    const meta = await fetchPublicMeta();

    const stockUrl = apiUrl("");
    if (meta.version) stockUrl.searchParams.set("v", String(meta.version));

    const res = await fetch(stockUrl.toString());
    if (!res.ok) throw new Error("API error " + res.status);

    const data = await res.json();
    const record = data.records?.find(r => r.id === id);

    if (!record) {
      container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
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

function renderVehicle(rec) {
  const f = rec.fields || {};

  upsertSoldBanner(rec);

  const heroImg = document.getElementById("vehicle-hero");
  const thumbs = document.getElementById("vehicle-thumbs");

  /* ------- Populate Text ------- */
const titleText = (f.Make_Model || f.Title || f.Vehicle || "").toString().trim();
const regText = f.Registration ? `Registration: ${f.Registration}` : "";

const priceText = fmtPrice(f.Price);
const milesNum = fmtMiles(f.Mileage);
const transmissionText = (getTransmission(f) || "").toString().trim();
const motText = (formatMaybeDate(f.MOT_Date) || "").toString().trim();
const engineText = fmtEngine(f.Engine_size);
const fuelText = (f.Fuel_type || "").toString().trim();

setText("vehicle-title", titleText);
setText("vehicle-reg", regText);
setText("vehicle-price", priceText);

// Keep legacy text fields populated (for fallback / accessibility), but we'll hide their rows once the premium grid is injected.
setText("vehicle-mileage", milesNum ? `${milesNum} miles` : "—");
setText("vehicle-transmission", transmissionText || "—");
setText("vehicle-mot", motText || "—");
setText("vehicle-engine", engineText || "—");
setText("vehicle-fuel", fuelText || "—");

// Premium summary block (icons + consistent pricing layout)
enhanceVehicleSummary({
  titleText,
  regText,
  priceText,
  milesNum,
  transmissionText,
  motText,
  engineText,
  fuelText
});

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
  }

  cleanupLegacyContactUi();
  wireWhatsAppFab();
}


/* ---------- Vehicle page: premium summary + specs grid ---------- */

function vehicleSpecPill(iconUrl, label, value, extraClass = "") {
  if (!value || String(value).trim() === "" || String(value).trim() === "—") return "";
  const cls = `vehicle-spec${extraClass ? " " + extraClass : ""}`;
  const icon = iconUrl ? `<img class="vehicle-spec__icon" src="${iconUrl}" alt="">` : "";
  return `
    <div class="${cls}" aria-label="${escapeHtml(label)}: ${escapeHtml(value)}" title="${escapeHtml(label)}: ${escapeHtml(value)}">
      ${icon}
      <div class="vehicle-spec__value">${escapeHtml(value)}</div>
    </div>
  `;
}

function enhanceVehicleSummary(data) {
  const titleEl = document.getElementById("vehicle-title");
  const regEl = document.getElementById("vehicle-reg");
  const priceEl = document.getElementById("vehicle-price");

  if (!titleEl || !priceEl) return;

  // Avoid double-inject (e.g., if renderVehicle runs again)
  if (document.querySelector(".vehicle-summary")) return;

  const host = titleEl.parentElement;
  if (!host) return;

  // Insert wrapper exactly where the title currently sits
  const summary = document.createElement("section");
  summary.className = "vehicle-summary";
  host.insertBefore(summary, titleEl);

  const head = document.createElement("div");
  head.className = "vehicle-summary__head";

  const left = document.createElement("div");
  left.className = "vehicle-summary__left";

  const right = document.createElement("div");
  right.className = "vehicle-summary__right";

  // Move existing nodes into the new structure
  left.appendChild(titleEl);
  if (regEl) left.appendChild(regEl);

  right.appendChild(priceEl);

  head.appendChild(left);
  head.appendChild(right);

  const specs = document.createElement("div");
  specs.className = "vehicle-specs";

  specs.innerHTML = [
    vehicleSpecPill(ICONS.transmission, "Transmission", data?.transmissionText || ""),
    vehicleSpecPill(ICONS.mileage, "Mileage", data?.milesNum || ""),
    vehicleSpecPill(ICONS.fuel, "Fuel", data?.fuelText || ""),
    vehicleSpecPill(ICONS.engine, "Engine", data?.engineText || ""),
    vehicleSpecPill(ICONS.mot, "MOT expiry", data?.motText || "", "vehicle-spec--mot")
  ].filter(Boolean).join("");

  summary.appendChild(head);
  if (specs.innerHTML.trim()) summary.appendChild(specs);

  hideLegacyVehicleSpecRows();
}

function hideLegacyVehicleSpecRows() {
  const ids = ["vehicle-mileage", "vehicle-transmission", "vehicle-mot", "vehicle-engine", "vehicle-fuel"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Prefer hiding the nearest semantic row container (p/li). Avoid hiding the whole page container.
    let row = el.closest("p, li");
    if (!row) {
      const pe = el.parentElement;
      if (pe && pe !== document.body && pe.id !== "vehicle-page") row = pe;
    }

    if (row && row.id !== "vehicle-title" && row.id !== "vehicle-reg" && row.id !== "vehicle-price") {
      row.classList.add("vehicle-plain-spec");
    }
  });
}

/* ---------- Vehicle page: remove legacy WhatsApp strip + keep one premium entry point ---------- */

function cleanupLegacyContactUi() {
  const page = document.getElementById("vehicle-page") || document.body;
  const keep = document.getElementById("whatsapp-btn");

  // Remove any legacy “Message about this car / Quick question …” strip
  page.querySelectorAll("a, p, div, span").forEach((el) => {
    const t = (el.textContent || "").trim();
    if (!t) return;

    const isLegacyPrompt =
      /message about this car/i.test(t) ||
      (/quick question/i.test(t) && /viewing times/i.test(t)) ||
      (/quick question/i.test(t) && /part-exchange/i.test(t));

    if (!isLegacyPrompt) return;

    // Do not remove the main enquire button or the floating WhatsApp button
    if (el.id === "enquire-btn" || (keep && el === keep)) return;

    // If this is nested inside a WhatsApp link, remove the whole link
    const link = el.closest("a");
    (link || el).remove();
  });

  // Remove any additional WhatsApp links (keep only #whatsapp-btn)
  page.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach((a) => {
    if (keep && a === keep) return;
    a.remove();
  });
}

function wireWhatsAppFab() {
  const fab = document.getElementById("whatsapp-btn");
  if (!fab) return;

  // Ensure the premium FAB styling is applied
  fab.classList.add("p55-fab");

  // If another script is already managing visibility, do not fight it.
  if (fab.dataset.p55FabWired === "1") return;
  fab.dataset.p55FabWired = "1";

  const update = () => {
    const doc = document.documentElement;
    const scrolledBottom = window.scrollY + window.innerHeight;
    const revealAt = doc.scrollHeight - Math.max(900, Math.round(window.innerHeight * 0.55));
    const show = scrolledBottom >= revealAt;
    fab.classList.toggle("is-visible", show);
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }, { passive: true });

  // initial state
  update();
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