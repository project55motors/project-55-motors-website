/* Project 55 Motors — Site footer (public pages only)
   - Rebuilds footer content to ensure premium, compact, consistent output
   - Includes ONLY legal links row (Terms / Privacy / Cookies) + small meta line
   - Removes any legacy "No distance selling..." line by overwriting footer content
   - Suppressed on any path containing "admin"
*/
(function () {
  "use strict";

  const path = (location.pathname || "").toLowerCase();
  if (path.includes("admin")) return;

  const FOOTER_LINKS = [
    { href: "/terms.html",  text: "Terms" },
    { href: "/privacy.html", text: "Privacy" },
    { href: "/cookies.html", text: "Cookies" },
  ];

  const META_LINE = "Viewing by appointment";

  function buildFooterHtml(){
    const year = new Date().getUTCFullYear();
    const links = FOOTER_LINKS.map(l => `<a class="p55-footer-link" href="${l.href}">${l.text}</a>`).join("");
    return `
      <div class="p55-footer-legal" aria-label="Legal links">
        ${links}
      </div>
      <div class="p55-footer-meta">${META_LINE}</div>
      <div class="p55-footer-copy">© ${year} Project 55 Motors</div>
    `.trim();
  }

  function ensureFooterStyles(){
    if (document.getElementById("p55-footer-style")) return;
    const style = document.createElement("style");
    style.id = "p55-footer-style";
    style.textContent = `
      .p55-footer-legal{
        display:flex;flex-wrap:wrap;gap:14px;
        justify-content:center;align-items:center;
        margin: 0 0 10px;
      }
      .p55-footer-link{
        text-decoration:none;
        font-weight: 900;
        color: rgba(255,255,255,0.82);
        letter-spacing: -0.01em;
      }
      .p55-footer-link:hover{ color: rgba(255,255,255,0.95); text-decoration: underline; text-underline-offset: 3px; }
      .p55-footer-meta{
        text-align:center;
        color: rgba(255,255,255,0.62);
        font-weight: 850;
        font-size: 0.95rem;
        line-height: 1.45;
        margin: 0 0 10px;
      }
      .p55-footer-copy{
        text-align:center;
        color: rgba(255,255,255,0.55);
        font-weight: 800;
        font-size: 0.9rem;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function apply(){
    const footer = document.querySelector("#siteFooter, footer.site-footer, footer#site-footer, footer");
    if (!footer) return false;

    ensureFooterStyles();
    footer.innerHTML = buildFooterHtml();
    return true;
  }

  function run(){
    if (apply()) return;
    const obs = new MutationObserver(() => { apply(); });
    obs.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => obs.disconnect(), 5000);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", run, { once:true });
  } else {
    run();
  }
})();