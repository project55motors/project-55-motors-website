/* Project 55 Motors — site-wide UX utilities (public)
   Build: 20260215b

   What this build fixes:
   - WhatsApp floating button (FAB) now appears ONLY on vehicle pages.
   - No FAB injection on Home / Current Stock / About / Contact.
   - Event tracking remains lightweight and non-blocking.

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
    try { return JSON.stringify(obj || {}); } catch (_) { return "{}"; }
  }

  function sendEvent(name, meta) {
    try {
      if (!name) return;
      const payload = {
        event: String(name),
        path: location.pathname || "/",
        href: location.href,
        ts: Date.now(),
        meta: meta || {}
      };

      // fire-and-forget; never block rendering
      fetch(API_EVENT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: safeJson(payload),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  /* -------------------------------------------------------
     WhatsApp FAB — VEHICLE PAGES ONLY
     ------------------------------------------------------- */

  function isVehiclePage() {
    // Robust: supports /vehicle?id=... and any template that includes #vehicle-page
    if ((location.pathname || "").toLowerCase().includes("/vehicle")) return true;
    if (document.getElementById("vehicle-page")) return true;
    return false;
  }

  function getPhoneDigits() {
    const raw = String((window.P55 && window.P55.phone) || "07795311799");
    const digits = raw.replace(/\D/g, "");
    // UK mobile -> WhatsApp expects country code; if it starts with 0, prefix 44
    if (digits.startsWith("0")) return "44" + digits.slice(1);
    // If already has country code, keep it
    return digits;
  }

  function buildWaUrl(phone, text) {
    const u = new URL(`https://wa.me/${phone}`);
    u.searchParams.set("text", text);
    return u.toString();
  }

  function makeFab() {
    const a = document.createElement("a");
    a.className = "p55-fab p55-fab--whatsapp is-delayed";
    a.id = "p55-whatsapp-fab";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
    a.title = "Message on WhatsApp";

    // SVG already contains wordmark; keep it clean
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

    // Reveal when user is near the bottom OR page is short
    const shortPage = doc.scrollHeight <= window.innerHeight + 120;
    const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
    const show = shortPage || remaining <= 260;

    el.classList.toggle("is-visible", !!show);
  }

  function initVehicleWhatsAppFab() {
    if (!isVehiclePage()) return;
    if (document.getElementById("p55-whatsapp-fab")) return;

    const phone = getPhoneDigits();
    if (!phone) return;

    const titleEl = document.getElementById("vehicle-title");
    const vehicleTitle = titleEl ? String(titleEl.textContent || "").trim() : "";
    const msg =
      vehicleTitle
        ? `Hi Project 55 Motors, I'm interested in the ${vehicleTitle}. Is it still available?\n\n${location.href}`
        : `Hi Project 55 Motors, I'm interested in this vehicle. Is it still available?\n\n${location.href}`;

    const fab = makeFab();
    fab.href = buildWaUrl(phone, msg);

    // Track intent
    fab.addEventListener("click", () => {
      sendEvent("whatsapp_fab_click", { page: "vehicle" });
    });

    document.body.appendChild(fab);

    // Initial + reactive reveal
    const onScroll = () => updateVisibility(fab);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------
     Basic global tracking hooks (safe / optional)
     ------------------------------------------------------- */

  function initTracking() {
    // Track key clicks when attributes are present
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("[data-p55-event]") : null;
      if (!a) return;
      const name = a.getAttribute("data-p55-event");
      const label = a.getAttribute("data-p55-label") || "";
      sendEvent(name, { label });
    }, { passive: true });
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initTracking();
      initVehicleWhatsAppFab();
    });
  } else {
    initTracking();
    initVehicleWhatsAppFab();
  }
})();