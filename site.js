/* Project 55 Motors — site-wide cleanup (public)
   Purpose: remove the non-premium footer line "No distance selling. More info in Terms"
   WITHOUT touching the legal links row (Terms / Privacy / Cookies etc.)

   Safe: runs on public pages only and only removes that specific phrase.
*/
(function () {
  "use strict";

  const p = (location.pathname || "").toLowerCase();
  // never run on admin surfaces
  if (p.includes("admin")) return;

  const PHRASES = [
    "no distance selling. more info in terms",
    "no distance selling. more info in term",
    "no distance selling",
  ];

  function normalize(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function stripPhraseFromText(text) {
    let t = text;
    // remove the longest/most specific first
    for (const ph of PHRASES) {
      const re = new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
      t = t.replace(re, "");
    }
    // cleanup separators left behind
    t = t
      .replace(/\s*•\s*•\s*/g, " • ")
      .replace(/^\s*•\s*/g, "")
      .replace(/\s*•\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return t;
  }

  function cleanNode(el) {
    if (!el) return;
    // Don't touch the actual legal links row (anchors)
    if (el.querySelector && el.querySelector("a")) return;

    const before = el.textContent || "";
    const norm = normalize(before);
    if (!PHRASES.some(ph => norm.includes(ph))) return;

    const after = stripPhraseFromText(before);

    if (!after) {
      // remove just the line element if it became empty
      el.remove();
      return;
    }

    // If it's a simple text container, replace its text only
    // (preserves layout and avoids nuking footer structure)
    el.textContent = after;
  }

  function runCleanup() {
    // Prefer to target the footer if it exists
    const footer = document.querySelector("footer, .site-footer, #siteFooter, #site-footer");
    if (footer) {
      // Find candidate text-only elements within footer
      const candidates = footer.querySelectorAll("p, div, span, small, li");
      candidates.forEach(cleanNode);
    } else {
      // Fallback: scan common small text nodes on the page
      document.querySelectorAll("p, div, span, small, li").forEach(cleanNode);
    }
  }

  function observeOnce() {
    const footer = document.querySelector("footer, .site-footer, #siteFooter, #site-footer");
    const root = footer || document.body;
    if (!root) return;

    const obs = new MutationObserver(() => runCleanup());
    obs.observe(root, { childList: true, subtree: true });
    // stop observing after a short window (footer injection completes quickly)
    setTimeout(() => obs.disconnect(), 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        runCleanup();
        observeOnce();
      },
      { once: true }
    );
  } else {
    runCleanup();
    observeOnce();
  }
})();
