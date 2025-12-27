/* Project 55 Motors — WhatsApp integration (public)

   Premium floating WhatsApp button with clear label.

*/

(function () {

  const phone = String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");

  if (!phone) return;



  // Avoid admin pages

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

        <img src="/assets/icons/whatsapp.svg" alt="" width="22" height="22" loading="eager" decoding="async">

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