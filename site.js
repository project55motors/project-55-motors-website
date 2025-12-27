/* Project 55 Motors — site-wide enhancements (public)
   Adds a premium, restrained WhatsApp floating button (FAB).
*/
(function () {
  const phone = String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");
  if (!phone) return;

  // Avoid showing on admin pages
  const path = (location.pathname || "").toLowerCase();
  if (path.includes("admin")) return;

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
    a.setAttribute("aria-label", "WhatsApp Project 55 Motors");
    a.title = "WhatsApp Project 55 Motors";

    a.innerHTML = `
      <span class="p55-fab__icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M16.06 3C9.43 3 4.06 8.06 4.06 14.28c0 2.13.7 4.12 1.9 5.78L4 29l9.2-1.77c1.6.54 3.32.83 5.13.83 6.63 0 12-5.06 12-11.28C30.33 8.06 24.96 3 18.06 3h-2zM18.33 25.6c-1.7 0-3.27-.3-4.68-.9l-.33-.14-5.47 1.05 1.1-5.18-.2-.3a9.4 9.4 0 0 1-1.62-5.25c0-5 4.37-9.08 9.74-9.08 5.36 0 9.73 4.08 9.73 9.08 0 5-4.37 9.08-9.73 9.08h-.54z"/>
          <path fill="currentColor" d="M23.1 19.35c-.26-.14-1.55-.75-1.8-.83-.24-.08-.42-.14-.6.14-.18.27-.7.83-.86 1-.16.18-.3.2-.56.07-.26-.14-1.1-.4-2.1-1.27-.78-.67-1.3-1.5-1.45-1.76-.15-.27-.02-.4.12-.53.12-.12.26-.3.4-.45.14-.15.18-.27.28-.45.1-.18.05-.34-.02-.48-.08-.14-.6-1.4-.82-1.92-.22-.52-.45-.44-.6-.44h-.52c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26s.98 2.62 1.12 2.8c.14.18 1.93 3.03 4.7 4.12.66.27 1.18.43 1.58.55.66.2 1.26.18 1.74.1.53-.08 1.55-.62 1.77-1.22.22-.6.22-1.1.16-1.22-.06-.12-.24-.2-.5-.34z"/>
        </svg>
      </span>
      <span class="p55-fab__label">WhatsApp</span>
    `;
    return a;
  }

  function updateVisibility(el) {
    const doc = document.documentElement;
    const shortPage = doc.scrollHeight <= window.innerHeight + 120;
    const show = shortPage || window.scrollY > 160;
    el.classList.toggle("is-visible", show);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Prevent duplicates
    if (document.getElementById("p55-whatsapp-fab")) return;

    const baseMsg = String(window.P55?.whatsapp?.defaultMessage || "Hi Project 55 Motors — I’d like to arrange a viewing.");
    const link = location.href;

    const fab = makeFab();
    fab.href = buildWaUrl(`${baseMsg}\n\nLink: ${link}`);

    document.body.appendChild(fab);

    const onScroll = () => updateVisibility(fab);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  });
})();
