/* Project 55 Motors — WhatsApp integration (public)

   Uses the official WhatsApp SVG (which includes its own wordmark),

   so we DO NOT render any separate "WhatsApp" label.

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

    a.setAttribute("aria-label", "Message Project 55 Motors on WhatsApp");

    a.title = "Message on WhatsApp";



    // No label here — SVG already contains wordmark

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

    const shortPage = doc.scrollHeight <= window.innerHeight + 120;



    // Vehicle detail pages: reveal only when the user is near the bottom

    const isVehiclePage =

      (location.pathname || "").toLowerCase().includes("vehicle") ||

      document.getElementById("vehicle-page");



    let show;



    if (isVehiclePage) {

      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);

      // "Almost bottom" threshold (px). Adjust if you want earlier/later.

      show = shortPage || remaining <= 260;

    } else {

      // Other pages: show after a small scroll, or immediately if the page is short

      show = shortPage || window.scrollY > 160;

    }



    el.classList.toggle("is-visible", !!show);

  }



  document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("p55-whatsapp-fab")) return;



    const baseMsg = String(

      window.P55?.whatsapp?.defaultMessage ||

      "Hi Project 55 Motors — I’d like to arrange a viewing."

    );



    const fab = makeFab();

    fab.href = buildWaUrl(`${baseMsg}\n\nLink: ${location.href}`);



    document.body.appendChild(fab);



    const onScroll = () => updateVisibility(fab);

    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("resize", onScroll);

    onScroll();

  });



})();