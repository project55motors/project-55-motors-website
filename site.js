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
  if (path.includes("admin") || path.includes("pdi")) return; // never run on admin pages

  const API_EVENT = "/cars-api/event";

  function safeJson(obj) {
    try {
      return JSON.stringify(obj || {});
    } catch (_) {
      return "{}";
    }
  }

  function postEvent(eventName, extra = {}) {
    const payload = {
      event: String(eventName || "").slice(0, 64),
      href: location.href,
      ts: Date.now(),
      ...extra
    };

    // Prefer sendBeacon where possible (doesn't block navigation)
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([safeJson(payload)], { type: "application/json" });
        navigator.sendBeacon(API_EVENT, blob);
        return;
      }
    } catch (_) {}

    // Fallback to fetch
    try {
      fetch(API_EVENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeJson(payload),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  // ---------- WhatsApp Floating Action Button ----------
  function injectWhatsAppFab() {
    try {
      // Only on vehicle pages
      if (!path.startsWith("/vehicle")) return;

      // Avoid duplicates
      if (document.querySelector(".p55-wa-fab")) return;

      // Find preferred WA link on the page first (if present)
      const existing = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
      const href = existing?.getAttribute("href") || "https://wa.me/447795311799";

      const a = document.createElement("a");
      a.className = "p55-wa-fab";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", "Message us on WhatsApp");

      a.innerHTML = `
        <span class="p55-wa-fab__icon" aria-hidden="true">
          <img src="/assets/icons/whatsapp.svg" alt="" />
        </span>
        <span class="p55-wa-fab__text">WhatsApp</span>
      `;

      a.addEventListener("click", () => postEvent("click_whatsapp_fab"));

      document.body.appendChild(a);

      // Styles (scoped)
      const style = document.createElement("style");
      style.textContent = `
        .p55-wa-fab{
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 9999;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 999px;
          background: rgba(17, 17, 17, 0.86);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          text-decoration: none;
          box-shadow: 0 14px 40px rgba(0,0,0,0.40);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: transform .18s ease, background .18s ease, border-color .18s ease;
        }
        .p55-wa-fab:hover{
          transform: translateY(-1px);
          background: rgba(17, 17, 17, 0.94);
          border-color: rgba(255,255,255,0.18);
        }
        .p55-wa-fab__icon{
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .p55-wa-fab__icon img{
          width: 18px;
          height: 18px;
          display: block;
        }
        .p55-wa-fab__text{
          font-size: 14px;
          font-weight: 700;
          letter-spacing: .2px;
        }
        @media (max-width: 420px){
          .p55-wa-fab__text{ display:none; }
          .p55-wa-fab{ padding: 12px; }
        }
      `;
      document.head.appendChild(style);
    } catch (_) {}
  }

  // ---------- Footer legal links + note ----------
  function injectFooterLegal() {
    try {
      const footer = document.querySelector("footer");
      if (!footer) return;

      // Only on public pages
      const p = (location.pathname || "").toLowerCase();
      if (p.includes("admin") || p.includes("pdi")) return;

      // Avoid duplicates
      if (footer.querySelector(".p55-footer-legal")) return;

      const wrap = document.createElement("div");
      wrap.className = "p55-footer-legal";
      wrap.innerHTML = `
        <div class="p55-footer-legal__links">
          <a href="/terms" rel="nofollow">Terms</a>
          <span aria-hidden="true">•</span>
          <a href="/privacy" rel="nofollow">Privacy</a>
          <span aria-hidden="true">•</span>
          <a href="/cookies" rel="nofollow">Cookies</a>
        </div>
        <div class="p55-footer-legal__meta">
          No distance selling. More info in <a href="/terms#distance-selling">Terms</a>.
        </div>
      `;

      footer.appendChild(wrap);

      // Styles (scoped)
      const style = document.createElement("style");
      style.textContent = `
        .p55-footer-legal{
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.10);
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          text-align: center;
        }
        .p55-footer-legal__links{
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:center;
          flex-wrap:wrap;
          font-size: 12px;
          opacity: .92;
        }
        .p55-footer-legal__links a{
          color: rgba(255,255,255,0.92);
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.12);
        }
        .p55-footer-legal__links a:hover{
          color:#fff;
          border-bottom-color: rgba(255,255,255,0.26);
        }
        .p55-footer-legal__meta{
          font-size: 11px;
          opacity: .78;
          line-height: 1.3;
        }
        .p55-footer-legal__meta a{
          color: rgba(255,255,255,0.86);
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.16);
        }
        .p55-footer-legal__meta a:hover{ color:#fff; border-bottom-color: rgba(255,255,255,0.30); }
      `;
      document.head.appendChild(style);
    } catch (_) {}
  }


  // Run
  try { injectFooterLegal(); } catch (_) {}
})();
