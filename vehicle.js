/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller (Premium)
   Purpose:
   - Load vehicle record from /cars-api using ?id=recXXXXXXXX
   - Populate hero image + thumbnail strip + swipe + prev/next
   - Render a premium icon-pill spec grid (incl. Registration pill)
   - Offer a privacy-conscious YouTube walk-around in an optional modal
   - Keep only ONE WhatsApp CTA: the floating button (no inline remnants)
   - Enquire button pre-fills message for this vehicle

   Version: v9.1 OPTIONAL WALK-AROUND MODAL (20260812b)
--------------------------------------------------------- */

(() => {
  "use strict";

  const P55_VEHICLE_UI_VERSION = "v9.1-2026-08-12";
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
    prev: "#vehicle-prev, #thumb-left",
    next: "#vehicle-next, #thumb-right",
    title: "#vehicle-title",
    regLine: "#vehicle-reg",
    price: "#vehicle-price",
    desc: "#vehicle-description",
    enquire: "#enquire-btn",
    whatsapp: "#whatsapp-btn, #whatsapp-fab",   // support both IDs (older + newer templates)
    specsMount: "#vehicle-specs",
    videoTrigger: "#vehicle-video-trigger",
    videoModal: "#vehicle-video-modal",
    videoModalVehicle: "#vehicle-video-modal-vehicle",
    videoEmbed: "#vehicle-video-embed",
    videoLink: "#vehicle-video-link",
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
  function ensureMeta(name, content) {
    if (!name) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(content || ""));
  }

  function ensureOg(property, content) {
    if (!property) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(content || ""));
  }

  function ensureCanonical(href) {
    let link = document.querySelector("link[rel=canonical]");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", String(href || ""));
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

  function normaliseVideoValue(value) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first && typeof first === "object") return String(first.url || first.href || "").trim();
    return String(first || "").trim();
  }

  function parseYouTubeUrl(value) {
    const raw = normaliseVideoValue(value);
    if (!raw) return null;

    // Accept a bare YouTube video ID as a convenience, as well as full links.
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
      return {
        id: raw,
        watchUrl: `https://www.youtube.com/watch?v=${raw}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${raw}?autoplay=1&rel=0&playsinline=1`
      };
    }

    let url;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch (_) {
      return null;
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      host === "youtube.com" || host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1] || "";
      }
    }

    id = String(id).trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;

    return {
      id,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
    };
  }

  function ensureVideoUi() {
    let trigger = qs(SELECTORS.videoTrigger);
    if (!trigger) {
      const heroWrapper = qs(".vehicle-hero-wrapper");
      if (heroWrapper) {
        heroWrapper.insertAdjacentHTML("beforeend", `
          <button id="vehicle-video-trigger" class="vehicle-video-trigger" type="button" hidden>
            <span class="vehicle-video-trigger__icon" aria-hidden="true"><span></span></span>
            <span class="vehicle-video-trigger__label vehicle-video-trigger__label--full">Watch walk-around</span>
            <span class="vehicle-video-trigger__label vehicle-video-trigger__label--short" aria-hidden="true">Walk-around</span>
          </button>
        `);
        trigger = qs(SELECTORS.videoTrigger);
      }
    }

    let modal = qs(SELECTORS.videoModal);
    if (!modal) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="vehicle-video-modal" class="vehicle-video-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-video-modal-title" aria-hidden="true" hidden>
          <div class="vehicle-video-modal__backdrop" data-video="backdrop"></div>
          <div class="vehicle-video-modal__panel" role="document">
            <div class="vehicle-video-modal__header">
              <div>
                <p class="vehicle-video-modal__eyebrow">Project 55 Motors</p>
                <h2 id="vehicle-video-modal-title">Vehicle walk-around</h2>
                <p id="vehicle-video-modal-vehicle" class="vehicle-video-modal__vehicle"></p>
              </div>
              <button class="vehicle-video-modal__close" type="button" aria-label="Close walk-around video" data-video="close">×</button>
            </div>
            <div class="vehicle-video-modal__frame"><div id="vehicle-video-embed" class="vehicle-video-modal__embed"></div></div>
            <div class="vehicle-video-modal__footer">
              <span>A closer look at the condition, specification and features.</span>
              <a id="vehicle-video-link" href="#" target="_blank" rel="noopener noreferrer">Watch on YouTube <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      `);
      modal = qs(SELECTORS.videoModal);
    }

    return { trigger, modal };
  }

  function renderVehicleVideo(value, rec) {
    const { trigger, modal } = ensureVideoUi();
    if (!trigger || !modal) return;
    const video = parseYouTubeUrl(value);
    if (!video) {
      trigger.hidden = true;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      return;
    }

    const embed = qs(SELECTORS.videoEmbed, modal);
    const directLink = qs(SELECTORS.videoLink, modal);
    const vehicleLabel = qs(SELECTORS.videoModalVehicle, modal);
    const closeButton = qs('[data-video="close"]', modal);
    const backdrop = qs('[data-video="backdrop"]', modal);
    const vehicleName = String(rec?.fields?.Make_Model || "this vehicle").trim() || "this vehicle";

    if (!embed || !directLink || !closeButton || !backdrop) {
      trigger.hidden = true;
      return;
    }

    trigger.setAttribute("aria-label", `Watch the walk-around video for ${vehicleName}`);
    directLink.href = video.watchUrl;
    directLink.setAttribute("aria-label", `Watch the ${vehicleName} walk-around on YouTube (opens in a new tab)`);
    if (vehicleLabel) vehicleLabel.textContent = vehicleName;

    let returnFocus = trigger;

    const stopPlayer = () => {
      embed.replaceChildren();
    };

    const closeModal = () => {
      if (modal.hidden) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
      document.documentElement.classList.remove("p55-no-scroll");
      document.body.classList.remove("p55-no-scroll");
      stopPlayer();
      returnFocus?.focus?.({ preventScroll: true });
    };

    const openModal = () => {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;

      const iframe = document.createElement("iframe");
      iframe.src = video.embedUrl;
      iframe.title = `${vehicleName} walk-around video`;
      iframe.loading = "eager";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      embed.replaceChildren(iframe);

      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");
      document.documentElement.classList.add("p55-no-scroll");
      document.body.classList.add("p55-no-scroll");
      closeButton.focus({ preventScroll: true });

      try {
        window.P55?.sendEvent?.("vehicle_video_play", {
          id: rec?.id || "",
          model: rec?.fields?.Make_Model || "",
          provider: "youtube"
        });
      } catch (_) {}
    };

    trigger.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = qsa('button:not([disabled]), a[href], iframe', modal)
        .filter(el => !el.hidden && el.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    trigger.hidden = false;
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
        <a href="/contact?msg=${encodeURIComponent("I'm looking for a similar vehicle to the one you've just sold.")}">Enquire</a>
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

    // Hide any legacy spec list container if present (defensive across older templates)
    qsa(".vehicle-spec-list, .vehicle-specs-legacy, .vehicle-spec-grid").forEach(el => el.classList.add("p55-legacy-row"));

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

    const list = Array.isArray(photos) ? photos.filter(p => p && (p.url || p.thumbnails?.large?.url || p.thumbnails?.full?.url)) : [];
    let index = 0;

    function photoUrl(p) { return p?.url || p?.thumbnails?.large?.url || p?.thumbnails?.full?.url || ""; }

    // Lightbox (prefers in-HTML markup; falls back to injected)
    const lightbox = (() => {
      let lb = document.getElementById("vehicle-lightbox");
      if (lb) return lb;

      lb = document.createElement("div");
      lb.id = "vehicle-lightbox";
      lb.className = "vehicle-lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "Vehicle photos");
      lb.setAttribute("aria-hidden", "true");
      lb.innerHTML = `
        <div class="vehicle-lightbox__backdrop" data-lb="backdrop"></div>
        <div class="vehicle-lightbox__panel" role="document">
          <button class="vehicle-lightbox__close" type="button" aria-label="Close gallery" data-lb="close">×</button>
          <button class="vehicle-lightbox__nav vehicle-lightbox__nav--prev" type="button" aria-label="Previous photo" data-lb="prev">‹</button>
          <button class="vehicle-lightbox__nav vehicle-lightbox__nav--next" type="button" aria-label="Next photo" data-lb="next">›</button>
          <div class="vehicle-lightbox__meta">
            <div class="vehicle-lightbox__title">${esc(makeModel || "Vehicle")}</div>
            <div class="vehicle-lightbox__count" data-lb="count">1 / 1</div>
          </div>
          <div class="vehicle-lightbox__viewport" data-lb="viewport">
            <img class="vehicle-lightbox__img" data-lb="img" alt="">
          </div>
        </div>
      `;
      document.body.appendChild(lb);
      return lb;
    })();

    const lbImg = lightbox.querySelector('[data-lb="img"]');
    const lbCount = lightbox.querySelector('[data-lb="count"]');
    const lbTitle = lightbox.querySelector('.vehicle-lightbox__title');
    const lbViewport = lightbox.querySelector('[data-lb="viewport"]');
    const lbClose = lightbox.querySelector('[data-lb="close"]');

    const state = {
      open: false,
      scale: 1,
      tx: 0,
      ty: 0,
      pinchStartDist: 0,
      pinchStartScale: 1,
      panStartX: 0,
      panStartY: 0,
      panStartTx: 0,
      panStartTy: 0,
      lastTapTs: 0,
      lastTapX: 0,
      lastTapY: 0,
      swipeStartX: 0,
      swipeStartY: 0
    };

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function setTransform() {
      if (!lbImg) return;
      lbImg.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`;
      lbImg.style.cursor = state.scale > 1 ? "grab" : "zoom-in";
    }

    function resetZoom() {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
      setTransform();
    }

    function preloadAround(i) {
      const idxs = [i, i + 1, i - 1];
      idxs.forEach(k => {
        const ii = (k + list.length) % list.length;
        const u = photoUrl(list[ii]);
        if (!u) return;
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = u;
      });
    }

    function setActiveThumb(i) {
      if (!thumbs) return;
      qsa(".vehicle-thumb", thumbs).forEach((el, idx) => {
        const isActive = idx === i;
        el.classList.toggle("active", isActive);
        if (isActive) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });

      const active = thumbs.querySelector(".vehicle-thumb.active");
      if (active) {
        try {
          active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        } catch (_) {
          const left = active.offsetLeft - (thumbs.clientWidth / 2) + (active.clientWidth / 2);
          thumbs.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
        }
      }
    }

    function updateHero(i) {
      if (!list.length) return;
      index = ((i % list.length) + list.length) % list.length;

      // Premium cross-fade on image swap
      hero.classList.add("is-loading");
      const nextUrl = photoUrl(list[index]);

      const onLoad = () => {
        hero.classList.remove("is-loading");
        hero.removeEventListener("load", onLoad);
      };
      hero.addEventListener("load", onLoad, { once: true });

      hero.src = nextUrl;
      hero.alt = makeModel ? `${makeModel} — Photo ${index + 1}` : `Vehicle photo ${index + 1}`;

      setActiveThumb(index);
      preloadAround(index);

      // Keep lightbox synced if open
      if (state.open) updateLightbox(index, { keepZoom: false });
    }

    function updateLightbox(i, opts = {}) {
      if (!list.length) return;
      const keepZoom = !!opts.keepZoom;

      index = ((i % list.length) + list.length) % list.length;

      if (!keepZoom) resetZoom();

      if (lbImg) {
        lbImg.src = photoUrl(list[index]);
        lbImg.alt = makeModel ? `${makeModel} — Photo ${index + 1}` : `Vehicle photo ${index + 1}`;
      }
      if (lbCount) lbCount.textContent = `${index + 1} / ${list.length}`;

      // Sync the page hero so closing the lightbox returns to the current photo
      hero.src = photoUrl(list[index]);
      hero.alt = makeModel ? `${makeModel} — Photo ${index + 1}` : `Vehicle photo ${index + 1}`;

      setActiveThumb(index);
      preloadAround(index);
    }

    function openLightbox(i = index) {
      if (!list.length) return;

      state.open = true;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("p55-no-scroll");
      document.body.classList.add("p55-no-scroll");

      if (lbTitle) lbTitle.textContent = makeModel || "Gallery";
      updateLightbox(i, { keepZoom: false });

      // focus the close button for accessibility
      lbClose?.focus({ preventScroll: true });
    }

    function closeLightbox() {
      state.open = false;
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("p55-no-scroll");
      document.body.classList.remove("p55-no-scroll");
      resetZoom();
      hero.focus?.({ preventScroll: true });
    }

    function next() { updateHero(index + 1); }
    function prev() { updateHero(index - 1); }

    // Render thumbs
    if (thumbs) {
      thumbs.innerHTML = "";
      list.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vehicle-thumb ${i === 0 ? "active" : ""}`;
        btn.setAttribute("aria-label", `View photo ${i + 1} of ${list.length}`);
        if (i === 0) btn.setAttribute("aria-current", "true");

        const img = document.createElement("img");
        img.src = photoUrl(p);
        img.alt = makeModel ? `${makeModel} thumbnail ${i + 1}` : `Thumbnail ${i + 1}`;
        img.loading = "lazy";
        img.decoding = "async";
        btn.appendChild(img);

        btn.addEventListener("click", () => updateHero(i));
        thumbs.appendChild(btn);
      });
    }

    // Thumbnail arrows (scroll the strip – big tap targets, reliable on iPad)
    // Premium behaviour: arrows change the selected hero image and keep the
    // matching thumbnail highlighted/centred underneath.
    btnPrev?.addEventListener("click", (e) => {
      e.preventDefault();
      prev();
    });
    btnNext?.addEventListener("click", (e) => {
      e.preventDefault();
      next();
    });

    // Hero: click/tap opens lightbox, swipe changes photo
    hero.tabIndex = 0;
    hero.addEventListener("click", () => openLightbox(index));

    const openBtn = qs("#vehicle-open-gallery");
    openBtn?.addEventListener("click", (e) => { e.preventDefault(); openLightbox(index); });


    let startX = 0;
    let startY = 0;
    hero.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    hero.addEventListener("touchend", (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Ignore primarily vertical scroll gestures
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) < 55) return;

      if (dx < 0) next(); else prev();
    }, { passive: true });

    // Keyboard (hero focus)
    hero.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(index); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    });

    // Lightbox controls
    const lbPrev = lightbox.querySelector('[data-lb="prev"]');
    const lbNext = lightbox.querySelector('[data-lb="next"]');
    const lbBackdrop = lightbox.querySelector('[data-lb="backdrop"]');

    lbPrev?.addEventListener("click", () => updateLightbox(index - 1, { keepZoom: false }));
    lbNext?.addEventListener("click", () => updateLightbox(index + 1, { keepZoom: false }));
    lbClose?.addEventListener("click", closeLightbox);
    lbBackdrop?.addEventListener("click", closeLightbox);

    // Global keybinds when open
    document.addEventListener("keydown", (e) => {
      if (!state.open) return;
      if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); updateLightbox(index - 1, { keepZoom: false }); }
      if (e.key === "ArrowRight") { e.preventDefault(); updateLightbox(index + 1, { keepZoom: false }); }
    });

    // Pinch / pan / double-tap zoom (iOS-friendly)
    if (lbViewport && lbImg) {
      lbViewport.addEventListener("touchstart", (e) => {
        if (!state.open) return;

        const t = e.touches;
        if (!t || !t.length) return;

        // Double-tap detection (single touch)
        if (t.length === 1) {
          const now = Date.now();
          const x = t[0].clientX;
          const y = t[0].clientY;
          const dt = now - state.lastTapTs;
          const dx = Math.abs(x - state.lastTapX);
          const dy = Math.abs(y - state.lastTapY);
          state.lastTapTs = now;
          state.lastTapX = x;
          state.lastTapY = y;

          if (dt < 280 && dx < 24 && dy < 24) {
            // Toggle zoom
            if (state.scale > 1) resetZoom();
            else { state.scale = 2.2; state.tx = 0; state.ty = 0; setTransform(); }
            e.preventDefault();
            return;
          }

          // Swipe/pan start
          state.swipeStartX = x;
          state.swipeStartY = y;
          state.panStartX = x;
          state.panStartY = y;
          state.panStartTx = state.tx;
          state.panStartTy = state.ty;
        }

        // Pinch start
        if (t.length === 2) {
          const dx2 = t[0].clientX - t[1].clientX;
          const dy2 = t[0].clientY - t[1].clientY;
          state.pinchStartDist = Math.hypot(dx2, dy2);
          state.pinchStartScale = state.scale;
          e.preventDefault();
        }
      }, { passive: false });

      lbViewport.addEventListener("touchmove", (e) => {
        if (!state.open) return;
        const t = e.touches;
        if (!t || !t.length) return;

        // Pinch zoom
        if (t.length === 2) {
          const dx2 = t[0].clientX - t[1].clientX;
          const dy2 = t[0].clientY - t[1].clientY;
          const dist = Math.hypot(dx2, dy2);
          if (state.pinchStartDist > 0) {
            const raw = state.pinchStartScale * (dist / state.pinchStartDist);
            state.scale = clamp(raw, 1, 4);
            if (state.scale === 1) { state.tx = 0; state.ty = 0; }
            setTransform();
          }
          e.preventDefault();
          return;
        }

        // Pan (only if zoomed in)
        if (t.length === 1 && state.scale > 1.01) {
          const x = t[0].clientX;
          const y = t[0].clientY;
          const dx = x - state.panStartX;
          const dy = y - state.panStartY;

          // Clamp based on viewport size (approx.)
          const vw = lbViewport.clientWidth || window.innerWidth;
          const vh = lbViewport.clientHeight || window.innerHeight;
          const maxX = (vw * (state.scale - 1)) * 0.5;
          const maxY = (vh * (state.scale - 1)) * 0.5;

          state.tx = clamp(state.panStartTx + dx, -maxX, maxX);
          state.ty = clamp(state.panStartTy + dy, -maxY, maxY);
          setTransform();
          e.preventDefault();
        }
      }, { passive: false });

      lbViewport.addEventListener("touchend", (e) => {
        const t = e.touches;
        if (!t || t.length < 2) state.pinchStartDist = 0;

        // When not zoomed in, interpret a horizontal gesture as navigation.
        if (t && t.length === 0) {
          const ct = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
          if (ct && state.scale <= 1.01) {
            const dx = ct.clientX - state.swipeStartX;
            const dy = ct.clientY - state.swipeStartY;
            if (Math.abs(dx) > 65 && Math.abs(dy) < Math.abs(dx) * 0.6) {
              if (dx < 0) updateLightbox(index + 1, { keepZoom: false });
              else updateLightbox(index - 1, { keepZoom: false });
            }
          }

          if (state.scale <= 1.01) resetZoom();
        }

      }, { passive: true });
    }

    // Initialize
    if (list.length) {
      updateHero(0);
      if (lbCount) lbCount.textContent = `1 / ${list.length}`;
    } else {
      hero.alt = makeModel || "Vehicle photo";
    }
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


    // Basic SEO / social metadata (per vehicle)
    try {
      const title = `${f.Make_Model || "Vehicle"} | Project 55 Motors`;
      document.title = title;

      const reg = f.Registration ? `Reg ${f.Registration}` : "";
      const miles = f.Mileage ? `${formatMileage(f.Mileage)} miles` : "";
      const price = formatPrice(f.Price);

      const pieces = [
        f.Make_Model || "",
        reg,
        miles,
        price,
        "Cleobury Mortimer"
      ].filter(Boolean);

      const desc = pieces.join(" • ") + ".";

      ensureMeta("description", desc);
      ensureOg("og:title", title);
      ensureOg("og:description", desc);
      ensureOg("og:type", "website");
      ensureOg("og:url", window.location.href);

      const photos = Array.isArray(f.Photos) ? f.Photos : [];
      const ogImage = photos[0] && (photos[0].url || photos[0].thumbnails?.large?.url || photos[0].thumbnails?.full?.url);
      if (ogImage) ensureOg("og:image", ogImage);

      // Canonical: preserve the id querystring (prevents duplicate URL variants)
      try {
        const cu = new URL(window.location.href);
        const id = cu.searchParams.get("id");
        const canon = new URL(window.location.origin + (window.location.pathname || "/vehicle"));
        if (id) canon.searchParams.set("id", id);
        ensureCanonical(canon.toString());
      } catch (_) {}
    } catch (_) {}

    renderDescriptionSections(f.Full_Description);

    // Images
    const photos = Array.isArray(f.Photos) ? f.Photos : [];
    setupGallery(photos, f.Make_Model);

    // Walk-around video: supports both the stable Worker alias and the
    // original Airtable field so cached/older API payloads continue to work.
    renderVehicleVideo(rec.videoUrl || f.Video_URL || f.VideoURL || f.Video_Url, rec);

    // Enquire CTA
    const enquireBtn = qs(SELECTORS.enquire);
    if (enquireBtn) {
      const main = enquireBtn.querySelector(".enquire-btn__main");
      const meta = enquireBtn.querySelector(".enquire-btn__meta");

      const mainText = isSold ? "Enquire Similar Vehicle" : "Enquire About This Vehicle";
      const metaText = isSold ? "We can source something similar" : "Fast response • Clear answers • No obligation";

      if (main) main.textContent = mainText;
      else enquireBtn.textContent = mainText;

      if (meta) meta.textContent = metaText;

      enquireBtn.addEventListener("click", () => {
        try { window.P55?.sendEvent?.("vehicle_enquire_click", { id: rec.id || "", model: f.Make_Model || "" }); } catch (_) {}
        const msg = isSold
          ? `I am looking for something similar to the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}) you have just sold.`
          : `I am interested in the ${f.Make_Model || "vehicle"} (${f.Registration || "registration unknown"}).`;
        window.location.href = `/contact?msg=${encodeURIComponent(msg)}`;
      });
    }

    // Premium specs + cleanup
    renderSpecsGrid(f);
    hideLegacySpecRows();

    // WhatsApp floating CTA
    const wa = qs(SELECTORS.whatsapp);
    const phone = getWhatsAppPhoneE164();
    if (wa && phone) {
      const vehicleLabel = `${f.Make_Model || "vehicle"}${f.Registration ? ` (${f.Registration})` : ""}`;

      const msg = isSold
        ? `Hi Nathan — I noticed the ${vehicleLabel} is marked as sold. Do you have anything similar coming in, or could you source one for me?

Link: ${window.location.href}`
        : `Hi Nathan — I’m interested in the ${vehicleLabel}. Is it still available? If so, could we arrange a viewing at a time that suits you?

Link: ${window.location.href}`;

      wa.setAttribute("href", `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
      wa.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
      wa.setAttribute("title", "Message on WhatsApp");
      // Track as an anonymous lead event
      try {
        wa.addEventListener("click", () => {
          try { window.P55?.sendEvent?.("whatsapp_vehicle_click", { id: rec.id || "", model: f.Make_Model || "" }); } catch (_) {}
        }, { once: true });
      } catch (_) {}
    }

    setupFabReveal();
  }


  function getVehicleIdFromUrl() {
    const params = new URLSearchParams(window.location.search || "");

    // Standard /vehicle?id=rec... format.
    const fromQuery = params.get("id") || params.get("record") || params.get("rec") || "";
    if (fromQuery) return fromQuery;

    // Clean /stock/...-recXXXXXXXX URLs copied from the browser or external platforms.
    const path = window.location.pathname || "";
    const fromPath = path.match(/(?:^|[-/])(rec[A-Za-z0-9]{8,})\/?$/);
    if (fromPath && fromPath[1]) return fromPath[1];

    // Last resort only. Do not let old iPad/session data override a valid clean URL.
    try {
      return sessionStorage.getItem("p55:lastVehicleId") || "";
    } catch (_) {
      return "";
    }
  }

  async function loadVehicle() {
  const page = qs(SELECTORS.page) || document.body;

  const showFatal = (title, message) => {
    // Fallback UI that always renders even if selectors change
    try {
      page.innerHTML = `
        <div style="max-width:980px;margin:18px auto;padding:0 14px;">
          <div style="border:1px solid rgba(15,23,42,.12);border-radius:16px;padding:16px;background:rgba(15,23,42,.03);">
            <h2 style="margin:0 0 8px;font-size:1.2rem;">${title}</h2>
            <p style="margin:0;color:rgba(15,23,42,.80);line-height:1.45;">${message}</p>
            <div style="margin-top:12px;">
              <a href="/inventory" style="display:inline-block;padding:10px 12px;border-radius:12px;border:1px solid rgba(15,23,42,.14);text-decoration:none;">
                View current stock
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (_) {}

    // Best-effort: also populate known fields if present
    try { setText(SELECTORS.title, title); } catch (_) {}
    try { setText(SELECTORS.desc, message); } catch (_) {}
  };

  try { document.body.classList.add("p55-vehicle-page"); } catch (_) {}

  let id = getVehicleIdFromUrl();

  if (!id) {
    showFatal("Vehicle not found", "Please return to Current Stock and select a vehicle.");
    return;
  }

  // Canonical URL (supports shareable vehicle URLs)
  try {
    const base = "https://project55motors.co.uk";
    const canonicalHref = `${base}/vehicle?id=${encodeURIComponent(id)}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref;
  } catch (_) {}

  // Fetch meta (best effort)
  let meta = { version: null, sold: { showSold: true, keepDays: 30 } };
  try {
    meta = await fetchPublicMeta();
  } catch (_) {}

  // Fetch stock (best effort)
  const stockUrl = apiUrl("");
  if (meta?.version) stockUrl.searchParams.set("v", String(meta.version));

  let data = null;
  try {
    const res = await fetch(stockUrl.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    data = await res.json();
  } catch (err) {
    // Fallback: render last stored record snapshot if it matches
    try {
      const snap = sessionStorage.getItem("p55:lastVehicleRec");
      if (snap) {
        const parsed = JSON.parse(snap);
        if (parsed && parsed.id === id) {
          renderVehicle(parsed);
          return;
        }
      }
    } catch (_) {}

    showFatal("Vehicle temporarily unavailable", "We could not load this listing right now. Please try again in a moment.");
    return;
  }

  // Normalise API shapes
  const records =
    (Array.isArray(data?.records) ? data.records :
    Array.isArray(data) ? data :
    Array.isArray(data?.data?.records) ? data.data.records :
    Array.isArray(data?.result?.records) ? data.result.records :
    []);

  const record = records.find(r => r && r.id === id);

  if (!record) {
    // Fallback: snapshot
    try {
      const snap = sessionStorage.getItem("p55:lastVehicleRec");
      if (snap) {
        const parsed = JSON.parse(snap);
        if (parsed && parsed.id === id) {
          renderVehicle(parsed);
          return;
        }
      }
    } catch (_) {}

    showFatal("Vehicle not found", "This listing may have been removed or the link is incomplete.");
    return;
  }

  // Public visibility gate
  try {
    if (!isRecordPublic(record, meta)) {
      showFatal("Unavailable", "This vehicle is no longer listed.");
      return;
    }
  } catch (_) {}

  try {
    try {
      sessionStorage.setItem("p55:lastVehicleId", record.id || id || "");
      sessionStorage.setItem("p55:lastVehicleRec", JSON.stringify(record));
    } catch (_) {}

    renderVehicle(record);
  } catch (err) {
    console.error("Vehicle render error:", err);
    showFatal("Vehicle unavailable", "We could not render this listing on your device. Please try again.");
  }
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
