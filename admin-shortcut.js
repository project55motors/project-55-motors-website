/* Project 55 Motors – Admin shortcut (iOS-friendly)
   Long-press (2s+) on the hero banner image (.hero-banner) redirects to /admin-dashboard

   Notes:
   - This is a convenience shortcut only; authentication still controls access.
   - iOS Safari shows an image "callout" menu on long-press; we suppress it via
     -webkit-touch-callout: none and contextmenu prevention.
*/

(function () {
  const ADMIN_URL = "/admin-dashboard";
  const HOLD_MS = 2100;  // 2 seconds+
  const MOVE_PX = 12;    // cancel if finger moves (scroll gesture)

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

    hero.addEventListener("contextmenu", function (e) { e.preventDefault(); }, { passive: false });

    let timer = null;
    let startX = 0, startY = 0;
    let active = false;

    function clearTimer() {
      if (timer) { clearTimeout(timer); timer = null; }
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

    function onTouchEnd() { clearTimer(); }
    function onTouchCancel() { clearTimer(); }

    hero.addEventListener("touchstart", onTouchStart, { passive: true });
    hero.addEventListener("touchmove", onTouchMove, { passive: true });
    hero.addEventListener("touchend", onTouchEnd, { passive: true });
    hero.addEventListener("touchcancel", onTouchCancel, { passive: true });

    // Optional desktop convenience (does not interfere with normal clicks):
    hero.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      // no-op: we keep Shift+A as the primary desktop shortcut
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupHeroLongPress);
  } else {
    setupHeroLongPress();
  }
})();
