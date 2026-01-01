/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller
   Includes: Hero image, swipeable gallery, enquire prefill,
   WhatsApp CTA (badge SVG with embedded wordmark)
--------------------------------------------------------- */

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



/* ---------------------------
   PREMIUM VEHICLE HEADER (icons + better use of whitespace)
   Runs on top of any existing vehicle.html template.
---------------------------- */

const ICON_BASE = "/assets/icons";
const ICONS = {
  transmission: `${ICON_BASE}/transmission.svg`,
  mot: `${ICON_BASE}/mot.svg`,
  mileage: `${ICON_BASE}/mileage.svg`,
  fuel: `${ICON_BASE}/fuel.svg`,
  engine: `${ICON_BASE}/engine.svg`
};

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function specItem(iconUrl, label, value) {
  if (!value) return "";
  const icon = iconUrl ? `<img class="spec-icon" src="${iconUrl}" alt="${esc(label)}">` : "";
  return `
    <div class="spec" aria-label="${esc(label)}: ${esc(value)}" title="${esc(label)}: ${esc(value)}">
      ${icon}
      <div class="spec-value">${esc(value)}</div>
    </div>
  `;
}

function formatEngineSize(value) {
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

function formatMileageShort(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  if (Number.isFinite(n)) return n.toLocaleString("en-GB");
  return String(value).trim();
}

function ensureVehicleTopGrid() {
  const page = document.getElementById("vehicle-page") || document.body;
  const gallery = page.querySelector(".vehicle-gallery");
  const header = page.querySelector(".vehicle-header");
  if (!gallery || !header) return;

  let top = page.querySelector(".vehicle-top");
  if (!top) {
    top = document.createElement("div");
    top.className = "vehicle-top";
    gallery.parentNode.insertBefore(top, gallery);
    top.appendChild(gallery);
    top.appendChild(header);
  } else {
    if (!top.contains(gallery)) top.appendChild(gallery);
    if (!top.contains(header)) top.appendChild(header);
  }
}

function tidySpecsGrid(gridEl) {
  if (!gridEl) return;

  gridEl.querySelectorAll(".spec").forEach(el => el.classList.remove("span-2", "span-3"));

  const cols = window.matchMedia("(max-width: 560px)").matches ? 2 : 3;
  const items = [...gridEl.querySelectorAll(".spec")];
  const remainder = items.length % cols;
  if (remainder === 0) return;

  const span = Math.min(cols, (cols - remainder + 1));
  items[items.length - 1].classList.add(`span-${span}`);
}

function applyPremiumVehicleHeader(fields) {
  const page = document.getElementById("vehicle-page") || document.body;
  const header = page.querySelector(".vehicle-header");
  if (!header) return;

  if (header.classList.contains("is-enhanced")) return;

  // Title + price row
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

  // Remove legacy <p> rows (we replace with icon pills)
  header.querySelectorAll("p").forEach(p => p.remove());

  // Specs grid
  let specs = header.querySelector(".vehicle-specs");
  if (!specs) {
    specs = document.createElement("div");
    specs.className = "vehicle-specs";

    const reg = document.getElementById("vehicle-reg");
    if (reg && reg.parentNode === header) reg.insertAdjacentElement("afterend", specs);
    else header.appendChild(specs);
  }

  const transmission = getTransmission(fields) || "";
  const mot = formatMaybeDate(fields.MOT_Date) || "";
  const mileage = formatMileageShort(fields.Mileage) || "";
  const fuel = String(fields.Fuel_type || "").trim();
  const engine = formatEngineSize(fields.Engine_size);

  // Order chosen so MOT (longest value) is last and can span if needed
  specs.innerHTML =
    specItem(ICONS.transmission, "Transmission", transmission) +
    specItem(ICONS.mileage, "Mileage", mileage) +
    specItem(ICONS.fuel, "Fuel", fuel) +
    specItem(ICONS.engine, "Engine", engine) +
    specItem(ICONS.mot, "MOT Expiry", mot);

  tidySpecsGrid(specs);
  header.classList.add("is-enhanced");
}

function pruneInlineWhatsAppUI() {
  const page = document.getElementById("vehicle-page") || document.body;

  // Remove any inline WhatsApp links/buttons inside the vehicle page, keeping only the floating #whatsapp-btn
  const waLinks = page.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]');
  waLinks.forEach(a => {
    if (a.id === "whatsapp-btn") return;
    a.remove();
  });

  // Remove legacy helper text row if present
  const textNodes = page.querySelectorAll("p, div, span, small");
  textNodes.forEach(el => {
    const t = (el.textContent || "").toLowerCase();
    if (t.includes("quick question") || t.includes("viewing times") || t.includes("part-exchange")) {
      if (el.children.length === 0 || el.tagName.toLowerCase() === "p") el.remove();
    }
  });

  // Remove common legacy blocks by class name (safe / idempotent)
  page.querySelectorAll(".cta-secondary--whatsapp, .cta-secondary--wa, .whatsapp-inline, .vehicle-whatsapp-inline")
    .forEach(el => el.remove());
}

function setupFabReveal() {
  const fab = document.getElementById("whatsapp-btn");
  if (!fab) return;

  // Prevent multiple bindings
  if (fab.dataset.p55RevealBound === "1") return;
  fab.dataset.p55RevealBound = "1";

  // Show near the bottom (non-intrusive)
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
    const grid = document.querySelector("#vehicle-page .vehicle-specs");
    if (grid) tidySpecsGrid(grid);
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
  setText("vehicle-engine", formatEngineSize(f.Engine_size) || "—");
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
  }

  // Premium layout upgrades (icons + tidy contact UI)
  ensureVehicleTopGrid();
  applyPremiumVehicleHeader(f);
  pruneInlineWhatsAppUI();
  setupFabReveal();
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