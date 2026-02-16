/* Project 55 Motors — site-wide UX utilities (public)

   - WhatsApp FAB
   - Lightweight conversion event tracking (anonymous aggregates)

   Notes:
   - Events are sent to cars-api at /cars-api/event.
   - No personal data is collected; events are counts only.
*/

(function () {
  "use strict";

  const path = (location.pathname || "").toLowerCase();
  if (path.includes("admin")) return; // never run on admin pages

  const API_EVENT = "/cars-api/event";

  function safeJson(obj) {
    try {
      return JSON.stringify(obj || {});
    } catch (_) {
      return "{}";
    }
  }

  function sendEvent(name, meta) {
    if (!name) return;
    const payload = {
      event: String(name),
      path: location.pathname || "/",
      href: location.href,
      ts: Date.now(),
      meta: meta || {}
    };

    const body = safeJson(payload);

    // Prefer beacon for reliability during navigation.
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(API_EVENT, blob);
        return;
      } catch (_) {}
    }

    // Fallback: fetch with keepalive.
    try {
      fetch(API_EVENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  // Expose for page-specific scripts (e.g. vehicle.js)
  window.P55 = window.P55 || {};
  window.P55.sendEvent = sendEvent;

  function attachDeclarativeTracking() {
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target && e.target.closest ? e.target.closest("[data-p55-event]") : null;
        if (!el) return;
        const name = el.getAttribute("data-p55-event") || "";
        if (!name) return;
        const label = el.getAttribute("data-p55-label") || el.id || "";
        sendEvent(name, { label });
      },
      { capture: true }
    );
  }

  // WhatsApp FAB
  function initWhatsAppFab() {
    const phone = String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");
    if (!phone) return;

    function buildWaUrl(text) {
      const u = new URL(`https://wa.me/${phone}`);
      u.searchParams.set("text", text);
      return u.toString();
    }

    function makeFab() {
      const a = document.createElement("a");
      a.className = "p55-fab p55-fab--whatsapp";
      a.id = "p55-whatsapp-fab";
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
      a.title = "Message on WhatsApp";

      // No separate label — SVG already contains wordmark
      a.innerHTML = `
        <span class="p55-fab__icon" aria-hidden="true">
          <img class="p55-wa-badge"
               src="/assets/icons/whatsapp.svg"
               alt=""
               loading="eager"
               decoding="async">
        </span>
      `;
      return a;
    }

    function updateVisibility(el) {
      const doc = document.documentElement;
      const shortPage = doc.scrollHeight <= window.innerHeight + 120;

      // Vehicle pages: reveal only when near bottom
      const isVehiclePage =
        (location.pathname || "").toLowerCase().includes("vehicle") ||
        document.getElementById("vehicle-page");

      let show;
      if (isVehiclePage) {
        const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
        show = shortPage || remaining <= 260;
      } else {
        show = shortPage || window.scrollY > 160;
      }

      el.classList.toggle("is-visible", !!show);
    }

    if (document.getElementById("p55-whatsapp-fab")) return;

    const baseMsg = String(
      window.P55?.whatsapp?.defaultMessage ||
        "Hi Project 55 Motors — I'd like to arrange a viewing."
    );

    const fab = makeFab();
    fab.href = buildWaUrl(`${baseMsg}\n\nLink: ${location.href}`);
    fab.addEventListener("click", () => sendEvent("whatsapp_fab_click"));

    document.body.appendChild(fab);

    const onScroll = () => updateVisibility(fab);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        attachDeclarativeTracking();
        initWhatsAppFab();
      },
      { once: true }
    );
  } else {
    attachDeclarativeTracking();
    initWhatsAppFab();
  }

  // Footer: add legal + trust links site-wide (public pages)
  function injectFooterLegal() {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;
    if (footer.querySelector(".p55-footer-legal")) return; // prevent duplicates

    const inner = footer.querySelector(".footer-inner") || footer;
    const legal = document.createElement("div");
    legal.className = "p55-footer-legal";
    legal.innerHTML = `
      <div class="p55-footer-legal__links">
        <a href="/terms.html" data-p55-event="footer_legal_click" data-p55-label="terms">T&amp;Cs</a>
        <a href="/privacy.html" data-p55-event="footer_legal_click" data-p55-label="privacy">Privacy</a>
        <a href="/cookies.html" data-p55-event="footer_legal_click" data-p55-label="cookies">Cookies</a>
      </div>
      <div class="p55-footer-legal__meta">
        Viewing by appointment • In-person sale • <a href="/terms.html" data-p55-event="footer_legal_click" data-p55-label="terms_meta">No distance selling</a>
      </div>
    `;
    inner.appendChild(legal);

    // Lightweight CSS (scoped)
    const cssId = "p55-footer-legal-css";
    if (!document.getElementById(cssId)) {
      const style = document.createElement("style");
      style.id = cssId;
      style.textContent = `
        .p55-footer-legal{
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.10);
          display: grid;
          gap: 8px;
        }
        .p55-footer-legal__links{
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .p55-footer-legal__links a{
          color: rgba(255,255,255,0.88);
          text-decoration: none;
          font-weight: 850;
          border-bottom: 1px solid rgba(255,255,255,0.18);
          padding-bottom: 2px;
        }
        .p55-footer-legal__links a:hover{ color:#fff; border-bottom-color: rgba(255,255,255,0.30); }
        .p55-footer-legal__meta{
          color: rgba(255,255,255,0.70);
          font-weight: 800;
          font-size: 0.92rem;
          line-height: 1.5;
        }
        .p55-footer-legal__meta a{
          color: rgba(255,255,255,0.86);
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.16);
        }
        .p55-footer-legal__meta a:hover{ color:#fff; border-bottom-color: rgba(255,255,255,0.30); }
      `;
      document.head.appendChild(style);
    }
  }


  // Run
  try { injectFooterLegal(); } catch (_) {}
})();