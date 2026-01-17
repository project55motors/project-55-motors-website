/* Project 55 Motors - Admin shortcut
   - Desktop: Shift + A  -> /admin-dashboard
   - Mobile: Long-press (2s+) on the hero banner image (.hero-banner) -> /admin-dashboard

   Notes:
   - This is a convenience shortcut only; authentication still controls access.
   - iOS Safari shows an image "callout" menu on long-press; we suppress it via
     -webkit-touch-callout: none and contextmenu prevention.
*/

(function () {
  const ADMIN_URL = "/admin-dashboard";
  const HOLD_MS = 2100; // 2 seconds+
  const MOVE_PX = 12;   // cancel if finger moves (scroll gesture)

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
  }

  function setupKeyboardShortcut() {
    // Guard against double-install if the script is included twice
    if (window.__p55AdminShortcutKeyboardInstalled) return;
    window.__p55AdminShortcutKeyboardInstalled = true;

    // Capture phase helps if other listeners stop propagation
    window.addEventListener(
      "keydown",
      function (e) {
        try {
          if (isTypingTarget(document.activeElement)) return;
        } catch (err) {}

        // Require Shift + A only (no other modifiers)
        if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.repeat) return;

        const key = typeof e.key === "string" ? e.key : "";
        const isA = e.code === "KeyA" || (key && key.toLowerCase() === "a");
        if (!isA) return;

        e.preventDefault();
        window.location.assign(ADMIN_URL);
      },
      true
    );
  }

  function setupHeroLongPress() {
    const hero = document.querySelector(".hero-banner");
    if (!hero) return;

    // Suppress iOS image callout / selection behaviour
    try {
      hero.setAttribute("draggable", "false");
      hero.style.webkitTouchCallout = "none";
      hero.style.webkitUserSelect = "none";
      hero.style.userSelect = "none";
      hero.style.touchAction = "manipulation";
      hero.style.webkitTapHighlightColor = "transparent";
    } catch (e) {}

    hero.addEventListener(
      "contextmenu",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );

    let timer = null;
    let startX = 0,
      startY = 0;
    let active = false;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      active = false;
    }

    function onTouchStart(e) {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      active = true;

      // Start timer; we don't preventDefault here so users can still scroll naturally.
      // The iOS callout is prevented by CSS + contextmenu handler above.
      timer = setTimeout(function () {
        if (!active) return;
        clearTimer();
        window.location.href = ADMIN_URL;
      }, HOLD_MS);
    }

    function onTouchMove(e) {
      if (!active || !e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx > MOVE_PX || dy > MOVE_PX) clearTimer();
    }

    function onTouchEnd() {
      clearTimer();
    }

    function onTouchCancel() {
      clearTimer();
    }

    hero.addEventListener("touchstart", onTouchStart, { passive: true });
    hero.addEventListener("touchmove", onTouchMove, { passive: true });
    hero.addEventListener("touchend", onTouchEnd, { passive: true });
    hero.addEventListener("touchcancel", onTouchCancel, { passive: true });
  }

  function init() {
    setupKeyboardShortcut();
    setupHeroLongPress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
