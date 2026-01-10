// final-seo.js — lightweight, safe SEO hooks
// Build: 20260110a
//
// This file should never throw. It is intentionally conservative.

(function () {
  "use strict";

  function applyDynamicSEO() {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("seoDebug") === "1") {
        console.log("final-seo.js loaded");
      }
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDynamicSEO, { once: true });
  } else {
    applyDynamicSEO();
  }
})();
