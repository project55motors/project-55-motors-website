// final-seo.js — Lightweight canonical hygiene + diagnostics
// Purpose: Ensure consistent canonicals across clean routes vs .html during transition.
// Safe to include site-wide (no dependencies).

(function () {
  "use strict";

  function setCanonical(url) {
    try {
      let el = document.querySelector('link[rel="canonical"]');
      if (!el) {
        el = document.createElement("link");
        el.rel = "canonical";
        document.head.appendChild(el);
      }
      el.href = url;
    } catch (_) {}
  }

  function normalize() {
    const base = "https://project55motors.co.uk";
    const path = (location.pathname || "/").toLowerCase();

    // Vehicle pages keep query-string canonical (id is the unique key)
    if (path.endsWith("/vehicle.html")) {
      const params = new URLSearchParams(location.search);
      const id = params.get("id");
      if (id) setCanonical(`${base}/vehicle.html?id=${encodeURIComponent(id)}`);
      else setCanonical(`${base}/vehicle.html`);
      return;
    }

    // Clean routes for core pages
    const map = {
      "/": "/",
      "/index.html": "/",
      "/inventory.html": "/inventory",
      "/inventory": "/inventory",
      "/about.html": "/about",
      "/about": "/about",
      "/contact.html": "/contact",
      "/contact": "/contact"
    };

    if (map[path] !== undefined) {
      setCanonical(base + map[path]);
      return;
    }

    // Default: non-www, preserve path (strip trailing /index.html)
    const normalized = path.endsWith("/index.html") ? path.slice(0, -"/index.html".length) || "/" : path;
    setCanonical(base + normalized);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalize, { once: true });
  } else {
    normalize();
  }
})();
