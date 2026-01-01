/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller
   Includes: Hero image, swipeable gallery, enquire prefill,
   WhatsApp CTA (badge SVG with embedded wordmark)
--------------------------------------------------------- */

const API_BASE_PATH = "/cars-api";

/* ---------------------------
   TEMPLATE ROBUSTNESS
   Some versions of vehicle.html only contain an empty container.
   These helpers ensure we always have a usable #vehicle-page and
   required placeholders to render into.
---------------------------- */

function getVehicleContainer() {
  let container = document.getElementById("vehicle-page");
  if (container) return container;

  const host =
    document.querySelector("main .page-wrapper") ||
    document.querySelector(".page-wrapper") ||
    document.querySelector("main") ||
    document.body;

  container = document.createElement("div");
  container.id = "vehicle-page";

  // If attaching directly to body, place it after the nav if possible
  if (host === document.body) {
    const nav = document.querySelector(".main-nav");
    if (nav && nav.parentNode) nav.insertAdjacentElement("afterend", container);
    else document.body.appendChild(container);
  } else {
    host.appendChild(container);
  }

  return container;
}

function ensureVehicleSkeleton(container) {
  if (!container) return;

  // If the template already includes the expected elements, do nothing.
  if (document.getElementById("vehicle-title") || document.getElementById("vehicle-hero")) return;

  container.innerHTML = `
    <div class="vehicle-gallery">
      <div class="vehicle-hero-wrapper">
        <img id="vehicle-hero" class="vehicle-hero" alt="Vehicle photo">
      </div>

      <div class="vehicle-thumbs-wrapper">
        <div id="vehicle-thumbs" class="vehicle-thumbs" aria-label="Vehicle photos thumbnails"></div>
      </div>
    </div>

    <div class="vehicle-header">
      <h1 id="vehicle-title"></h1>
      <div id="vehicle-reg"></div>
      <div id="vehicle-price"></div>

      <p><strong>Mileage</strong> <span id="vehicle-mileage"></span></p>
      <p><strong>Transmission</strong> <span id="vehicle-transmission"></span></p>
      <p><strong>MOT</strong> <span id="vehicle-mot"></span></p>
      <p><strong>Engine</strong> <span id="vehicle-engine"></span></p>
      <p><strong>Fuel</strong> <span id="vehicle-fuel"></span></p>
    </div>

    <div id="vehicle-description"></div>

    <div class="vehicle-cta-area" style="margin-top:22px;">
      <a id="enquire-btn" class="btn-primary" href="javascript:void(0)">
        <span class="enquire-btn__main">Enquire About This Vehicle</span>
        <span class="enquire-btn__meta">Fast response • No obligation</span>
      </a>
    </div>
  `;

  // If the floating WhatsApp button is not present in the template, add a minimal one.
  if (!document.getElementById("whatsapp-btn")) {
    const wa = document.createElement("a");
    wa.id = "whatsapp-btn";
    wa.href = "#";
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.className = "p55-fab";
    wa.innerHTML = `
      <span class="p55-fab__icon" aria-hidden="true">
        <svg class="p55-wa-badge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60">
          <g transform="translate(18,14)">
            <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.81.73 5.52 2.12 7.92L0 32l8.33-2.19A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0Z" fill="currentColor" opacity="0.95"/>
            <path d="M10.2 9.6c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1 0 1.8 1.3 3.6 1.5 3.8.2.2 2.5 4 6.2 5.4 3 .9 3.6.7 4.2.6.6-.1 1.9-.8 2.1-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.7-.4-.4-.2-1.9-.9-2.2-1-.3-.1-.6-.2-.8.2-.2.4-.9 1-1.1 1.3-.2.2-.4.3-.7.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.3-2.1-2.6-.2-.4 0-.5.2-.7.2-.2.4-.4.5-.6.2-.2.2-.4.3-.6.1-.2 0-.4-.1-.6-.1-.2-.8-2-.9-2.3Z" fill="#ffffff"/>
          </g>
          <text x="70" y="39" font-size="24" font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" fill="currentColor" font-weight="800">WhatsApp</text>
        </svg>
      </span>
    `;
    document.body.appendChild(wa);
  }
}


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
  const container = getVehicleContainer();
  ensureVehicleSkeleton(container);

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
  setText("vehicle-title", f.Make_Model);
  setText("vehicle-reg", f.Registration ? `Registration: ${f.Registration}` : "");
  setText("vehicle-price", f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA");
  setText("vehicle-mileage", f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—");
  setText("vehicle-transmission", getTransmission(f) || "—");
  setText("vehicle-mot", formatMaybeDate(f.MOT_Date) || "—");
  setText("vehicle-engine", f.Engine_size || "—");
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