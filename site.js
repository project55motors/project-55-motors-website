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
    // Choice A (premium): WhatsApp floating button should ONLY exist on vehicle pages.
    // On listing/home pages it tends to obscure content and reads as “chat widget”,
    // which reduces premium feel.
    const isVehiclePage =
      (location.pathname || "").toLowerCase().includes("vehicle") ||
      document.getElementById("vehicle-page");

    if (!isVehiclePage) return;

    // Vehicle templates now include their own #whatsapp-btn and vehicle.js manages it.
    // If it exists, do nothing here to avoid duplicate buttons.
    if (document.getElementById("whatsapp-btn") || document.getElementById("whatsapp-fab")) return;

    const phone = String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");
    if (!phone) return;

    function buildWaUrl(text) {
      const u = new URL(`https://wa.me/${phone}`);
      u.searchParams.set("text", text);
      return u.toString();
    }

    function makeFab() {
      const a = document.createElement("a");
      // Delay-reveal styling (vehicle page scroll reveal)
      a.className = "p55-fab p55-fab--whatsapp is-delayed";
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
})();


// ---------- Footer legal links (replace footer nav links) ----------
  function injectFooterLegal() {
    try {
      // Only on public pages
      const p = (location.pathname || "").toLowerCase();
      if (p.includes("admin") || p.includes("pdi")) return;

      const footer = document.querySelector("footer.site-footer, footer#siteFooter, footer#site-footer, footer");
      if (!footer) return;

      // If prior experiments injected a stacked legal block, remove it
      footer.querySelectorAll(".p55-footer-legal").forEach((el) => el.remove());

      // Remove any legacy "no distance selling" text that might exist anywhere in footer
      const legacyPhrases = ["no distance selling", "distance selling policy"];
      footer.querySelectorAll("p, div, span, small, li").forEach((el) => {
        if (!el || (el.querySelector && el.querySelector("a"))) return;
        const t = (el.textContent || "").toLowerCase();
        if (legacyPhrases.some((ph) => t.includes(ph))) el.remove();
      });

      // Prefer replacing the existing footer nav links container to keep layout consistent
      const inner = footer.querySelector(".footer-inner") || footer;
      const linksSlot = inner.querySelector(".footer-links");

      const legalHtml = `
        <a href="/terms.html" rel="nofollow">Terms</a>
        <span aria-hidden="true">•</span>
        <a href="/privacy.html" rel="nofollow">Privacy</a>
        <span aria-hidden="true">•</span>
        <a href="/cookies.html" rel="nofollow">Cookies</a>
      `.trim();

      if (linksSlot) {
        // Replace nav links with legal links (one-line)
        linksSlot.innerHTML = legalHtml;

        // Add a marker class for styling without affecting other pages
        linksSlot.classList.add("p55-footer-legal-links");
      } else {
        // Fallback: inject a single-line legal row into footer (avoid stacking)
        const wrap = document.createElement("div");
        wrap.className = "p55-footer-legal-links";
        wrap.innerHTML = legalHtml;
        inner.appendChild(wrap);
      }

      // Scoped styles — keep it compact and premium
      if (!document.getElementById("p55-footer-legal-style")) {
        const style = document.createElement("style");
        style.id = "p55-footer-legal-style";
        style.textContent = `
          .p55-footer-legal-links{
            display:flex;
            gap:10px;
            align-items:center;
            justify-content:center;
            flex-wrap:wrap;
            font-size: 12px;
            opacity: .92;
            line-height: 1.2;
          }
          .p55-footer-legal-links a{
            color: rgba(255,255,255,0.92);
            text-decoration: none;
            border-bottom: 1px solid rgba(255,255,255,0.12);
            font-weight: 800;
          }
          .p55-footer-legal-links a:hover{
            color:#fff;
            border-bottom-color: rgba(255,255,255,0.26);
          }
          .p55-footer-legal-links span{ opacity: .65; }
        `;
        document.head.appendChild(style);
      }
    } catch (_) {}
  }
