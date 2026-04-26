/* Project 55 Motors — Vehicle Detail Page Controller
   Fix: supports copied clean /stock/...-recXXXXXXXX URLs as well as /vehicle?id=recXXXXXXXX.
   Version: 20260426a
*/
(() => {
  "use strict";

  const API_BASE_PATH = "/cars-api";
  const ICON_BASE = "/assets/icons";
  const SELECTORS = {
    page: "#vehicle-page",
    hero: "#vehicle-hero",
    thumbs: "#vehicle-thumbs",
    prev: "#vehicle-prev, #thumb-left",
    next: "#vehicle-next, #thumb-right",
    title: "#vehicle-title",
    regLine: "#vehicle-reg",
    price: "#vehicle-price",
    desc: "#vehicle-description",
    enquire: "#enquire-btn",
    whatsapp: "#whatsapp-btn, #whatsapp-fab",
    specsMount: "#vehicle-specs"
  };

  const ICONS = {
    transmission: `${ICON_BASE}/transmission.svg`,
    mileage: `${ICON_BASE}/mileage.svg`,
    fuel: `${ICON_BASE}/fuel.svg`,
    engine: `${ICON_BASE}/engine.svg`,
    registration: `${ICON_BASE}/registration.svg`,
    mot: `${ICON_BASE}/mot.svg`
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(sel, value) {
    const el = qs(sel);
    if (el) el.textContent = value ?? "";
  }

  function apiUrl(suffix = "") {
    const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);
    const p = new URLSearchParams(window.location.search);
    if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");
    return u;
  }

  function getVehicleIdFromUrl() {
    const params = new URLSearchParams(window.location.search || "");

    const fromQuery = params.get("id") || params.get("record") || params.get("rec") || "";
    if (fromQuery) return fromQuery;

    // Clean stock URL: /stock/volkswagen-high-up-...-recJaEmxDqoR5wcPa
    const path = window.location.pathname || "";
    const fromPath = path.match(/(?:^|[-/])(rec[A-Za-z0-9]{8,})\/?$/);
    if (fromPath && fromPath[1]) return fromPath[1];

    try {
      return sessionStorage.getItem("p55:lastVehicleId") || "";
    } catch (_) {
      return "";
    }
  }

  function formatPrice(value) {
    const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? `£${Math.round(n).toLocaleString("en-GB")}` : "POA";
  }

  function formatMileage(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(String(value).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n.toLocaleString("en-GB") : String(value).trim();
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).trim();
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatEngineSize(value) {
    if (!value) return "";
    const s = String(value).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return `${s.replace(/\.0$/, "")}L`;
    return s;
  }

  function getTransmission(fields) {
    return fields.Transmission || fields.Transmission_type || fields.Gearbox || fields.Gearbox_type || "";
  }

  function getWhatsAppPhoneE164() {
    const p55 = window.P55 || window.p55 || {};
    const phone = p55?.whatsapp?.phoneE164 || p55?.whatsappPhoneE164 || window.P55_WHATSAPP_E164 || window.WHATSAPP_E164 || "";
    return String(phone).replace(/\D/g, "");
  }

  function ensureCanonical(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;
  }

  function ensureMeta(selector, attr, name, content) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(content || ""));
  }

  function showFatal(title, message) {
    const page = qs(SELECTORS.page) || document.body;
    page.innerHTML = `
      <div style="max-width:980px;margin:18px auto;padding:0 14px;">
        <div style="border:1px solid rgba(15,23,42,.12);border-radius:16px;padding:16px;background:rgba(15,23,42,.03);">
          <h2 style="margin:0 0 8px;font-size:1.2rem;">${esc(title)}</h2>
          <p style="margin:0;color:rgba(15,23,42,.80);line-height:1.45;">${esc(message)}</p>
          <div style="margin-top:12px;"><a href="/inventory" style="display:inline-block;padding:10px 12px;border-radius:12px;border:1px solid rgba(15,23,42,.14);text-decoration:none;">View current stock</a></div>
        </div>
      </div>`;
  }

  function ensureSpecsMount() {
    let mount = qs(SELECTORS.specsMount);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "vehicle-specs";
      mount.className = "vehicle-specs";
      const regLine = qs(SELECTORS.regLine);
      if (regLine?.parentNode) regLine.insertAdjacentElement("afterend", mount);
      else (qs(SELECTORS.page) || document.body).appendChild(mount);
    }
    return mount;
  }

  function specPill(iconUrl, label, value) {
    if (!value) return "";
    return `<div class="spec" aria-label="${esc(label)}: ${esc(value)}" title="${esc(label)}: ${esc(value)}"><img class="spec-icon" src="${iconUrl}" alt="${esc(label)}" loading="lazy" decoding="async"><div class="spec-value">${esc(value)}</div></div>`;
  }

  function renderSpecsGrid(fields) {
    const mount = ensureSpecsMount();
    const html =
      specPill(ICONS.transmission, "Transmission", getTransmission(fields)) +
      specPill(ICONS.mileage, "Mileage", formatMileage(fields.Mileage)) +
      specPill(ICONS.fuel, "Fuel", fields.Fuel_type || fields.Fuel || "") +
      specPill(ICONS.engine, "Engine", formatEngineSize(fields.Engine_size || fields.Engine || "")) +
      specPill(ICONS.registration, "Registration", fields.Registration || fields.Reg || "") +
      specPill(ICONS.mot, "MOT Expiry", formatDate(fields.MOT_Date || ""));
    mount.innerHTML = html;
  }

  function parseDescription(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";

    const lines = text.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean);
    const sections = [];
    let current = { title: "", lines: [] };
    const headingRe = /^(HIGHLIGHTS|SPECIFICATION|SPECS|CONDITION|WHY THIS CAR STANDS OUT|OVERVIEW|OPENING COMMENTS?)\s*[:\-–—]?$/i;

    for (const line of lines) {
      if (headingRe.test(line)) {
        if (current.lines.length) sections.push(current);
        current = { title: line.replace(/[:\-–—]+$/, ""), lines: [] };
      } else {
        current.lines.push(line.replace(/^[•\-*]+\s*/, ""));
      }
    }
    if (current.lines.length) sections.push(current);

    if (!sections.length) return `<div class="vehicle-desc-intro"><p>${esc(text)}</p></div>`;

    const first = sections[0];
    const intro = !first.title || /overview|opening/i.test(first.title)
      ? `<div class="vehicle-desc-intro"><p>${first.lines.map(esc).join("<br>")}</p></div>`
      : "";
    const cards = sections
      .filter((s, idx) => !(idx === 0 && (!s.title || /overview|opening/i.test(s.title))))
      .map(s => `<section class="vehicle-desc-card"><h2>${esc(s.title || "Details")}</h2><ul>${s.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></section>`)
      .join("");

    return intro + (cards ? `<div class="vehicle-desc-sections">${cards}</div>` : "");
  }

  function setupGallery(photos, makeModel) {
    const hero = qs(SELECTORS.hero);
    const thumbs = qs(SELECTORS.thumbs);
    const prevBtn = qs(SELECTORS.prev);
    const nextBtn = qs(SELECTORS.next);
    if (!hero) return;

    const list = Array.isArray(photos) ? photos.filter(p => p && (p.url || p.thumbnails?.large?.url)) : [];
    let index = 0;

    const urlAt = i => list[i]?.url || list[i]?.thumbnails?.large?.url || "";

    function setActive(i) {
      if (!list.length) return;
      index = ((i % list.length) + list.length) % list.length;
      hero.src = urlAt(index);
      hero.alt = makeModel ? `${makeModel} — Photo ${index + 1}` : `Vehicle photo ${index + 1}`;
      qsa(".vehicle-thumb", thumbs || document).forEach((btn, n) => btn.classList.toggle("active", n === index));
    }

    if (thumbs) {
      thumbs.innerHTML = "";
      list.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vehicle-thumb ${i === 0 ? "active" : ""}`;
        btn.setAttribute("aria-label", `View photo ${i + 1}`);
        const img = document.createElement("img");
        img.src = urlAt(i);
        img.alt = makeModel ? `${makeModel} thumbnail ${i + 1}` : `Thumbnail ${i + 1}`;
        img.loading = "lazy";
        img.decoding = "async";
        btn.appendChild(img);
        btn.addEventListener("click", () => setActive(i));
        thumbs.appendChild(btn);
      });
    }

    prevBtn?.addEventListener("click", () => setActive(index - 1));
    nextBtn?.addEventListener("click", () => setActive(index + 1));

    const openBtn = qs("#vehicle-open-gallery");
    const lightbox = qs("#vehicle-lightbox");
    const lbImg = lightbox?.querySelector('[data-lb="img"]');
    const lbCount = lightbox?.querySelector('[data-lb="count"]');
    const lbTitle = lightbox?.querySelector(".vehicle-lightbox__title");
    function openLightbox() {
      if (!lightbox || !lbImg || !list.length) return;
      lbImg.src = urlAt(index);
      lbImg.alt = hero.alt;
      if (lbCount) lbCount.textContent = `${index + 1} / ${list.length}`;
      if (lbTitle) lbTitle.textContent = makeModel || "Gallery";
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    }
    function closeLightbox() {
      lightbox?.classList.remove("open");
      lightbox?.setAttribute("aria-hidden", "true");
    }
    hero.addEventListener("click", openLightbox);
    openBtn?.addEventListener("click", openLightbox);
    lightbox?.querySelector('[data-lb="close"]')?.addEventListener("click", closeLightbox);
    lightbox?.querySelector('[data-lb="backdrop"]')?.addEventListener("click", closeLightbox);
    lightbox?.querySelector('[data-lb="prev"]')?.addEventListener("click", () => { setActive(index - 1); openLightbox(); });
    lightbox?.querySelector('[data-lb="next"]')?.addEventListener("click", () => { setActive(index + 1); openLightbox(); });

    if (list.length) setActive(0);
  }

  function renderVehicle(record) {
    const f = record.fields || {};
    const title = f.Make_Model || f.Title || "Vehicle";
    const reg = f.Registration || f.Reg || "";
    const price = formatPrice(f.Price);

    document.title = `${title} | Project 55 Motors`;
    setText(SELECTORS.title, title);
    setText(SELECTORS.regLine, reg ? `Registration: ${reg}` : "");
    setText(SELECTORS.price, price);

    const descEl = qs(SELECTORS.desc);
    if (descEl) descEl.innerHTML = parseDescription(f.Full_Description || f.Description || f.Short_Description || "");

    renderSpecsGrid(f);
    setupGallery(Array.isArray(f.Photos) ? f.Photos : [], title);

    try {
      const pieces = [title, reg ? `Reg ${reg}` : "", f.Mileage ? `${formatMileage(f.Mileage)} miles` : "", price, "Cleobury Mortimer"].filter(Boolean);
      const desc = pieces.join(" • ") + ".";
      ensureMeta('meta[name="description"]', "name", "description", desc);
      ensureMeta('meta[property="og:title"]', "property", "og:title", `${title} | Project 55 Motors`);
      ensureMeta('meta[property="og:description"]', "property", "og:description", desc);
      ensureMeta('meta[property="og:url"]', "property", "og:url", window.location.href);
      const firstPhoto = Array.isArray(f.Photos) && f.Photos[0] ? (f.Photos[0].url || f.Photos[0].thumbnails?.large?.url) : "";
      if (firstPhoto) ensureMeta('meta[property="og:image"]', "property", "og:image", firstPhoto);
      ensureCanonical(window.location.href);
    } catch (_) {}

    const enquire = qs(SELECTORS.enquire);
    if (enquire) {
      enquire.addEventListener("click", () => {
        try { window.P55?.sendEvent?.("vehicle_enquire_click", { id: record.id || "", model: title }); } catch (_) {}
        window.location.href = `/contact?msg=${encodeURIComponent(`I am interested in the ${title}${reg ? ` (${reg})` : ""}.`)}`;
      });
    }

    const wa = qs(SELECTORS.whatsapp);
    const phone = getWhatsAppPhoneE164();
    if (wa && phone) {
      const vehicleLabel = `${title}${reg ? ` (${reg})` : ""}`;
      const msg = `Hi Nathan — I’m interested in the ${vehicleLabel}. Is it still available? If so, could we arrange a viewing at a time that suits you?\n\nLink: ${window.location.href}`;
      wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      wa.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
      wa.setAttribute("title", "Message on WhatsApp");
      wa.classList.add("is-visible");
    }
  }

  async function loadVehicle() {
    try { document.body.classList.add("p55-vehicle-page"); } catch (_) {}

    const id = getVehicleIdFromUrl();
    if (!id) {
      showFatal("Vehicle not found", "Please return to Current Stock and select a vehicle.");
      return;
    }

    try {
      const stockUrl = apiUrl("");
      const res = await fetch(stockUrl.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      const record = records.find(r => r && r.id === id);

      if (!record) {
        showFatal("Vehicle not found", "This listing may have been removed or the link is incomplete.");
        return;
      }

      renderVehicle(record);
    } catch (err) {
      console.error("Vehicle load error:", err);
      showFatal("Vehicle temporarily unavailable", "We could not load this listing right now. Please try again in a moment.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadVehicle, { once: true });
  } else {
    loadVehicle();
  }
})();
