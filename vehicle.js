/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller (Premium)
   Purpose:
   - Load vehicle record from /cars-api using ?id=recXXXXXXXX
   - Populate hero image + thumbnail strip + swipe + prev/next
   - Render a premium icon-pill spec grid (incl. Registration pill)
   - Keep only ONE WhatsApp CTA: the floating button (no inline remnants)
   - Enquire button pre-fills message for this vehicle

   Version: v7.3 (2026-01-01)
--------------------------------------------------------- */

(() => {
  "use strict";

  const P55_VEHICLE_UI_VERSION = "v7.3-2026-01-01";
  try { document.documentElement.dataset.p55Vehicle = P55_VEHICLE_UI_VERSION; } catch (_) {}

  const API_BASE_PATH = "/cars-api";

  const ICON_BASE = "/assets/icons";
  const ICONS = {
    transmission: `${ICON_BASE}/transmission.svg`,
    mileage: `${ICON_BASE}/mileage.svg`,
    fuel: `${ICON_BASE}/fuel.svg`,
    engine: `${ICON_BASE}/engine.svg`,          // NOTE: can be swapped later for an engine-warning-light icon
    registration: `${ICON_BASE}/registration.svg`,
    mot: `${ICON_BASE}/mot.svg`,
  };

  const SELECTORS = {
    page: "#vehicle-page",
    hero: "#vehicle-hero",
    thumbs: "#vehicle-thumbs",
    prev: "#vehicle-prev",
    next: "#vehicle-next",
    title: "#vehicle-title",
    regLine: "#vehicle-reg",
    price: "#vehicle-price",
    mileage: "#vehicle-mileage",
    transmission: "#vehicle-transmission",
    mot: "#vehicle-mot",
    engine: "#vehicle-engine",
    fuel: "#vehicle-fuel",
    desc: "#vehicle-description",
    enquire: "#enquire-btn",
    whatsapp: "#whatsapp-btn, #whatsapp-fab",   // support both IDs (older + newer templates)
    specsMount: "#vehicle-specs",
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

  function apiUrl(suffix = "") {
    const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);
    const p = new URLSearchParams(window.location.search);
    if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");
    return u;
  }

  function setText(sel, value) {
    const el = qs(sel);
    if (el) el.textContent = value ?? "";
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "POA";
    return `£${n.toLocaleString("en-GB")}`;
  }

  function formatMaybeDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatMileage(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(String(value).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) return n.toLocaleString("en-GB");
    return String(value).trim();
  }

  function formatEngineSize(value) {
    if (!value) return "";
    const s = String(value).trim();
    if (!s) return "";
    if (/^\d+(\.\d+)?$/.test(s)) return `${s.replace(/\.0$/, "")}L`;
    if (/l$/i.test(s)) return s;
    return s;
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

  function getWhatsAppPhoneE164() {
    // Prefer your site-config.js object; fall back to any known globals.
    const p55 = window.P55 || window.p55 || {};
    const phone =
      p55?.whatsapp?.phoneE164 ||
      p55?.whatsappPhoneE164 ||
      window.P55_WHATSAPP_E164 ||
      window.WHATSAPP_E164 ||
      "";
    return String(phone).replace(/\D/g, "");
  }

  async function fetchPublicMeta() {
    const out = { version: null, sold: { showSold: true, keepDays: 30 } };

    // /settings (preferred)
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
    } catch (_) {}

    // /version (fallback)
    try {
      const r = await fetch(apiUrl("/version").toString(), { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) out.version = j.version ?? out.version;
    } catch (_) {}

    return out;
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

  function upsertSoldBanner(rec) {
    const container = qs(SELECTORS.page) || document.body;
    const st = String(rec?.fields?.Status || "Available").trim() || "Available";
    const isSold = st === "Sold";

    const existing = document.getElementById("vehicle-sold-banner");
    if (!isSold) { existing?.remove(); return; }

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
          This vehicle has been sold${soldDateText ? ` on ${esc(soldDateText)}` : ""}. If you would like something similar, please get in touch.
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

  function ensureSpecsMount() {
    let mount = qs(SELECTORS.specsMount);

    if (!mount) {
      // Try to place after registration line (preferred), else after title/price block, else at end of page.
      const regLine = qs(SELECTORS.regLine);
      mount = document.createElement("div");
      mount.id = "vehicle-specs";
      mount.className = "vehicle-specs";

      if (regLine && regLine.parentNode) regLine.insertAdjacentElement("afterend", mount);
      else {
        const title = qs(SELECTORS.title);
        if (title && title.parentNode) title.insertAdjacentElement("afterend", mount);
        else (qs(SELECTORS.page) || document.body).appendChild(mount);
      }
    } else {
      mount.classList.add("vehicle-specs");
    }

    return mount;
  }

  function specPill(iconUrl, label, value) {
    if (!value) return "";
    return `
      <div class="spec" aria-label="${esc(label)}: ${esc(value)}" title="${esc(label)}: ${esc(value)}">
        <img class="spec-icon" src="${iconUrl}" alt="${esc(label)}" loading="lazy" decoding="async">
        <div class="spec-value">${esc(value)}</div>
      </div>
    `;
  }

  function hideLegacySpecRows() {
    // Hide the old text rows and any inline WhatsApp remnants near the CTA stack.
    document.documentElement.classList.add("p55-js");

    // Hide the "Registration: ..." line (we render it as a pill).
    const regLine = qs(SELECTORS.regLine);
    if (regLine) regLine.classList.add("p55-legacy-row");

    // Hide any legacy spec list container if present
    qsa(".vehicle-spec-list, .vehicle-specs-legacy").forEach(el => el.classList.add("p55-legacy-row"));

    // Hide any WA links that are NOT the floating button
    const fab = qs(SELECTORS.whatsapp);
    qsa('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]').forEach(a => {
      if (fab && a === fab) return;
      a.classList.add("p55-legacy-row");
      const wrap = a.closest("p, li, div, section");
      if (wrap) wrap.classList.add("p55-legacy-row");
    });

    // Hide keyword helper text that kept reappearing
    const keywords = ["message about this car", "quick question", "viewing times", "part-exchange", "whatsapp"];
    const root = qs(SELECTORS.page) || document.body;
    qsa("p, div, span, small", root).forEach(el => {
      const t = (el.textContent || "").trim().toLowerCase();
      if (!t) return;
      if (t.length > 140) return;
      if (keywords.some(k => t.includes(k))) {
        // Avoid hiding genuine navigation/footer; focus on compact blocks.
        el.classList.add("p55-legacy-row");
        const wrap = el.closest("p, div, section");
        if (wrap) wrap.classList.add("p55-legacy-row");
      }
    });
  }

  function renderSpecsGrid(fields) {
    const mount = ensureSpecsMount();
    const transmission = (getTransmission(fields) || "").trim();
    const mileage = formatMileage(fields.Mileage);
    const fuel = String(fields.Fuel_type || "").trim();
    const engine = formatEngineSize(fields.Engine_size);
    const reg = String(fields.Registration || fields.Reg || fields.registration || "").trim();
    const mot = formatMaybeDate(fields.MOT_Date);

    mount.innerHTML =
      specPill(ICONS.transmission, "Transmission", transmission) +
      specPill(ICONS.mileage, "Mileage", mileage) +
      specPill(ICONS.fuel, "Fuel", fuel) +
      specPill(ICONS.engine, "Engine", engine) +
      specPill(ICONS.registration, "Registration", reg) +
      specPill(ICONS.mot, "MOT Expiry", mot);
  }

  function setupFabReveal() {
    const fab = qs(SELECTORS.whatsapp);
    if (!fab) return;

    if (!fab.classList.contains("whatsapp-fab") && !fab.classList.contains("whatsapp-btn")) {
      // Add a predictable class for styling if your HTML didn't include it.
      fab.classList.add("whatsapp-fab");
    }

    const revealAt = 0.70;

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) : 0;
      if (p >= revealAt) fab.classList.add("is-visible");
      else fab.classList.remove("is-visible");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupGallery(photos, makeModel) {
    const hero = qs(SELECTORS.hero);
    const thumbs = qs(SELECTORS.thumbs);
    const btnPrev = qs(SELECTORS.prev);
    const btnNext = qs(SELECTORS.next);

    if (!hero) return;

    let index = 0;

    const updateHero = (i) => {
      if (!photos.length) return;
      index = i;
      hero.src = photos[i].url;
      hero.alt = makeModel || "Vehicle photo";
      // highlight
      qsa(".vehicle-thumb").forEach((el, idx) => el.classList.toggle("active", idx === index));
      // keep thumb in view
      const active = thumbs?.querySelector(".vehicle-thumb.active");
      if (active && thumbs) active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };

    if (thumbs) {
      thumbs.innerHTML = "";
      photos.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vehicle-thumb ${i === 0 ? "active" : ""}`;
        btn.innerHTML = `<img src="${p.url}" alt="Photo ${i + 1}" loading="lazy" decoding="async">`;
        btn.addEventListener("click", () => updateHero(i));
        thumbs.appendChild(btn);
      });
    }

    if (btnPrev) btnPrev.addEventListener("click", () => updateHero((index - 1 + photos.length) % photos.length));
    if (btnNext) btnNext.addEventListener("click", () => updateHero((index + 1) % photos.length));

    // Swipe support
    let startX = 0;
    hero.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 50) return;
      if (dx < 0) updateHero((index + 1) % photos.length);
      else updateHero((index - 1 + photos.length) % photos.length);
    });

    if (photos.length) updateHero(0);
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
    const sections = { opening: [], highlights: [], specification: [], condition: [], standout: [] };

    const lines = String(raw)
      .replace(/\r/g, "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    let current = "opening";

    for (const line of lines) {
      const heading = isHeading(line);
      if (heading) { current = heading; continue; }

      const cleaned = line.replace(/^[•\u2022\-\*]+\s*/, "").trim();
      if (!cleaned) continue;

      sections[current].push(cleaned);
    }

    return sections;
  }

  function renderLinesAsParagraph(lines) {
    if (!lines || !lines.length) return "";
    return `<p>${lines.map(esc).join("<br>")}</p>`;
  }

  function renderLinesAsList(lines) {
    if (!lines || !lines.length) return "";
    return `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`;
  }

  function renderDescriptionSections(text) {
    const el = qs(SELECTORS.desc);
    if (!el) return;

    const raw = (text || "").toString().trim();
    if (!raw) { el.innerHTML = ""; return; }

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
               <h2>${esc(c.title)}</h2>
               ${renderLinesAsList(c.lines)}
             </section>
           `).join("")}
         </div>`
      : "";

    el.innerHTML = `${introHtml}${cardsHtml}`;
  }

  /* ---------- Main render ---------- */

  function renderVehicle(rec) {
    const f = rec.fields || {};
    const st = String(f.Status || "Available").trim() || "Available";
    const isSold = st === "Sold";

    upsertSoldBanner(rec);

    setText(SELECTORS.title, f.Make_Model || "");
    setText(SELECTORS.regLine, f.Registration ? `Registration: ${f.Registration}` : "");
    setText(SELECTORS.price, formatPrice(f.Price));

    // Legacy values (used for fallback / SEO)
    setText(SELECTORS.mileage, f.Mileage ? `${Number(f.Mileage).toLocaleString("en-GB")} miles` : "—");
    setText(SELECTORS.transmission, getTransmission(f) || "—");
    setText(SELECTORS.mot, formatMaybeDate(f.MOT_Date) || "—");
    setText(SELECTORS.engine, formatEngineSize(f.Engine_size) || "—");
    setText(SELECTORS.fuel, String(f.Fuel_type || "—"));

    renderDescriptionSections(f.Full_Description);

    // Images
    const photos = Array.isArray(f.Photos) ? f.Photos : [];
    setupGallery(photos, f.Make_Model);

    // Enquire CTA
    const enquireBtn = qs(SELECTORS.enquire);
    if (enquireBtn) {
      const main = enquireBtn.querySelector(".enquire-btn__main");
      const meta = enquireBtn.querySelector(".enquire-btn__meta");

      const mainText = isSold ? "Enquire Similar Vehicle" : "Enquire About This Vehicle";
      const metaText = isSold ? "We can source something similar" : "Fast response • No obligation";

      if (main) main.textContent = mainText;
      else enquireBtn.textContent = mainText;

      if (meta) meta.textContent = metaText;

      enquireBtn.addEventListener("click", () => {
        const msg = isSold
          ? `I am looking for something similar to the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}) you have just sold.`
          : `I am interested in the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}).`;
        window.location.href = `/contact.html?msg=${encodeURIComponent(msg)}`;
      });
    }

    // Premium specs + cleanup
    renderSpecsGrid(f);
    hideLegacySpecRows();

    // WhatsApp floating CTA
    const wa = qs(SELECTORS.whatsapp);
    const phone = getWhatsAppPhoneE164();
    if (wa && phone) {
      const msg = isSold
        ? `Hi Project 55 Motors — I saw the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}) and understand it is sold. Can you source something similar?\n\nLink: ${window.location.href}`
        : `Hi Project 55 Motors — I’m interested in the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}). Please can we arrange a viewing?\n\nLink: ${window.location.href}`;

      wa.setAttribute("href", `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
      wa.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
      wa.setAttribute("title", "Message on WhatsApp");
    }

    setupFabReveal();
  }

  async function loadVehicle() {
    const page = qs(SELECTORS.page) || document.body;

    try { document.body.classList.add("p55-vehicle-page"); } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    // Canonical URL for this specific vehicle (helps SEO and prevents duplicate URLs)
    try {
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", `https://project55motors.co.uk/vehicle.html?id=${encodeURIComponent(id)}`);
    } catch (_) {}


    if (!id) {
      setText(SELECTORS.title, "Vehicle not found");
      setText(SELECTORS.desc, "Please return to Current Stock and select a vehicle.");
      return;
    }

    const meta = await fetchPublicMeta();

    const stockUrl = apiUrl("");
    if (meta.version) stockUrl.searchParams.set("v", String(meta.version));

    const res = await fetch(stockUrl.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data = await res.json();
    const record = data.records?.find(r => r.id === id);

    if (!record) {
      setText(SELECTORS.title, "Vehicle not found");
      setText(SELECTORS.desc, "This listing may have been removed or the link is incomplete.");
      return;
    }

    if (!isRecordPublic(record, meta)) {
      page.innerHTML = `
        <div style="max-width:900px; margin:0 auto;">
          <div class="vehicle-sold-banner" style="margin-top:16px;">
            <div class="vehicle-sold-left">
              <div class="vehicle-sold-pill">Unavailable</div>
              <div class="vehicle-sold-meta">This vehicle is no longer listed.</div>
            </div>
            <div class="vehicle-sold-cta"><a href="/index.html">View current stock</a></div>
          </div>
        </div>
      `;
      return;
    }

    renderVehicle(record);
  }

  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadVehicle, { once: true });
    } else {
      loadVehicle();
    }
  }

  boot();

})();
