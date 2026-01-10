/* Project 55 Motors — WhatsApp FAB (public)
   Build: 20260110a

   - Renders a single floating WhatsApp button using the official SVG badge.
   - Uses window.P55.whatsapp (from site-config.js) for phone + default message.
   - Exposes window.P55.whatsapp.setMessage(...) so vehicle.js can personalise the message.
   - On vehicle pages, this script does NOT control visibility; vehicle.js handles reveal.
*/

(function () {
  "use strict";

  // Avoid admin pages entirely
  const path = (location.pathname || "").toLowerCase();
  if (path.includes("admin") || path.includes("staff") || path.includes("dashboard")) return;

  window.P55 = window.P55 || {};
  window.P55.whatsapp = window.P55.whatsapp || {};

  const cfg = window.P55.whatsapp;
  cfg.phoneE164 = String(cfg.phoneE164 || "447795311799").replace(/\D/g, "");
  cfg.defaultMessage = String(cfg.defaultMessage || "Hi Project 55 Motors — I’d like to arrange a viewing. Please can you confirm availability and location?");
  cfg._currentMessage = cfg._currentMessage || "";

  function buildHref() {
    const phone = String(cfg.phoneE164 || "").replace(/\D/g, "");
    const text = String(cfg._currentMessage || cfg.defaultMessage || "").trim();
    const u = new URL("https://wa.me/" + phone);
    u.searchParams.set("text", text);
    return u.toString();
  }

  function ensureFab() {
    // Reuse existing if present (supports older templates)
    let a = document.getElementById("whatsapp-btn") || document.getElementById("whatsapp-fab");
    if (a) {
      a.id = "whatsapp-btn";
      a.classList.add("p55-fab");
      a.setAttribute("href", buildHref());
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");
      return a;
    }

    a = document.createElement("a");
    a.id = "whatsapp-btn";
    a.className = "p55-fab";
    a.href = buildHref();
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");

    a.innerHTML = `
      <span class="p55-fab__icon" aria-hidden="true">
        <img class="p55-wa-badge" src="/assets/icons/whatsapp.svg" alt="">
      </span>
    `;

    // Start hidden; reveal is controlled via class .is-visible (CSS)
    a.classList.remove("is-visible");

    document.body.appendChild(a);
    return a;
  }

  function setVisible(el, visible) {
    if (!el) return;
    if (visible) el.classList.add("is-visible");
    else el.classList.remove("is-visible");
  }

  function updateFab() {
    const el = ensureFab();
    el.setAttribute("href", buildHref());
    return el;
  }

  // Public API for other scripts (vehicle.js)
  cfg.setMessage = function (message) {
    cfg._currentMessage = String(message || "");
    updateFab();
  };
  cfg.setPhoneE164 = function (digitsOnly) {
    cfg.phoneE164 = String(digitsOnly || "").replace(/\D/g, "");
    updateFab();
  };
  cfg.setVisible = function (visible) {
    setVisible(document.getElementById("whatsapp-btn"), !!visible);
  };
  cfg.refresh = function () {
    updateFab();
  };

  function isVehiclePage() {
    return /\/vehicle(\.html)?$/i.test(path) || path.includes("/vehicle");
  }

  function attachScrollReveal(el) {
    // Vehicle page visibility is handled by vehicle.js
    if (isVehiclePage()) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const shortPage = (doc.scrollHeight - window.innerHeight) < 420;
      const show = shortPage || window.scrollY > 160;
      setVisible(el, show);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const el = ensureFab();
    updateFab();
    attachScrollReveal(el);
  });
})();
