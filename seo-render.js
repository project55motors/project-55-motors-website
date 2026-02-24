// Project 55 Motors — SEO Render Worker
// Purpose: Serve SSR HTML for vehicles + dynamic sitemap.xml using the cached cars-api JSON.
// No Airtable reads here; we piggyback on /cars-api (cached + versioned)  [oai_citation:4‡cars-api.js](sediment://file_00000000ef387246932b86ba1146b92d)

const SITE_ORIGIN = "https://project55motors.co.uk"; // keep apex canonical

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatGBP(n) {
  const num = Number(String(n ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(num);
}

function formatMiles(n) {
  const num = Number(String(n ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("en-GB").format(Math.round(num)) + " miles";
}

function pickFirstPhoto(rec) {
  const photos = rec?.fields?.Photos;
  const first = Array.isArray(photos) ? photos[0] : null;
  return first?.url || "";
}

function getSlugFromRecord(rec) {
  // cars-api has a /resolve endpoint that looks for fields.Slug  [oai_citation:5‡cars-api.js](sediment://file_00000000ef387246932b86ba1146b92d)
  // If you already maintain Slug in Airtable, we’ll use it.
  const s = String(rec?.fields?.Slug || "").trim();
  if (s) return slugify(s);

  // Else derive from Make_Model + Registration
  const mm = String(rec?.fields?.Make_Model || "").trim();
  const reg = String(rec?.fields?.Registration || "").trim();
  return slugify([mm, reg].filter(Boolean).join(" "));
}

function canonicalPathFor(rec) {
  const slug = getSlugFromRecord(rec) || "vehicle";
  return `/stock/${slug}-${rec.id}`;
}

async function fetchStockJson(request) {
  // Use the same origin as the request (works on preview domains too),
  // but keep canonical output pointed at SITE_ORIGIN.
  const origin = new URL(request.url).origin;
  const apiUrl = new URL("/cars-api", origin).toString();

  const res = await fetch(apiUrl, {
    // Allow edge cache to do its thing (cars-api already sets s-maxage)
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function buildVehicleSchema(rec, canonicalUrl) {
  const f = rec.fields || {};
  const makeModel = String(f.Make_Model || "").trim();
  const reg = String(f.Registration || "").trim();
  const price = Number(String(f.Price ?? "").replace(/[^\d.]/g, ""));
  const mileage = Number(String(f.Mileage ?? "").replace(/[^\d.]/g, ""));

  const images = Array.isArray(f.Photos) ? f.Photos.map(p => p?.url).filter(Boolean).slice(0, 10) : [];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoDealer",
        "@id": `${canonicalUrl}#dealer`,
        "name": "Project 55 Motors",
        "url": SITE_ORIGIN,
        "areaServed": "GB",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Cleobury Mortimer",
          "addressRegion": "Shropshire",
          "addressCountry": "GB"
        }
      },
      {
        "@type": "Vehicle",
        "@id": `${canonicalUrl}#vehicle`,
        "name": [makeModel, reg].filter(Boolean).join(" • "),
        "vehicleIdentificationNumber": undefined,
        "vehicleConfiguration": undefined,
        "image": images.length ? images : undefined,
        "mileageFromOdometer": Number.isFinite(mileage) ? {
          "@type": "QuantitativeValue",
          "value": Math.round(mileage),
          "unitCode": "SMI"
        } : undefined,
        "fuelType": f.Fuel_type || undefined,
        "vehicleTransmission": f.Transmission || undefined,
        "offers": Number.isFinite(price) ? {
          "@type": "Offer",
          "priceCurrency": "GBP",
          "price": Math.round(price),
          "availability": "https://schema.org/InStock",
          "url": canonicalUrl,
          "seller": { "@id": `${canonicalUrl}#dealer` }
        } : undefined
      }
    ]
  };
}

function renderVehicleHtml(rec) {
  const f = rec.fields || {};
  const makeModel = String(f.Make_Model || "").trim() || "Vehicle";
  const reg = String(f.Registration || "").trim();
  const titleCore = reg ? `${makeModel} (${reg})` : makeModel;

  const canonical = SITE_ORIGIN + canonicalPathFor(rec);

  const price = formatGBP(f.Price);
  const miles = formatMiles(f.Mileage);
  const mot = String(f.MOT_Date || "").trim();
  const fuel = String(f.Fuel_type || "").trim();
  const trans = String(f.Transmission || "").trim();
  const engine = (f.Engine_size !== null && f.Engine_size !== undefined && f.Engine_size !== "")
    ? `${f.Engine_size}L` : "";

  const shortDesc = String(f.Short_Description || "").trim();
  const fullDesc = String(f.Full_Description || "").trim();

  const descForMeta =
    (shortDesc || fullDesc || `Available from Project 55 Motors. UK-wide purchase by appointment; delivery available.`)
      .replace(/\s+/g, " ")
      .slice(0, 155);

  const hero = pickFirstPhoto(rec);

  const schema = buildVehicleSchema(rec, canonical);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">

  <title>${escapeHtml(titleCore)} | Project 55 Motors</title>
  <meta name="description" content="${escapeHtml(descForMeta)}">
  <link rel="canonical" href="${canonical}">

  <meta property="og:title" content="${escapeHtml(titleCore)} | Project 55 Motors">
  <meta property="og:description" content="${escapeHtml(descForMeta)}">
  <meta property="og:url" content="${canonical}">
  ${hero ? `<meta property="og:image" content="${escapeHtml(hero)}">` : ""}

  <script type="application/ld+json">${escapeHtml(JSON.stringify(schema))}</script>

  <!-- Keep your existing styling (adjust if your public site uses a different CSS path) -->
  <link rel="stylesheet" href="/styles.css?v=20260117b">
</head>
<body>
  <header class="site-header">
    <a href="/" class="brand">Project 55 Motors</a>
    <nav class="nav">
      <a href="/inventory">Current stock</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>

  <main class="vehicle-page" style="max-width:1100px;margin:0 auto;padding:18px 14px;">
    <h1 style="margin:10px 0 6px;">${escapeHtml(makeModel)}</h1>
    ${reg ? `<div style="opacity:.8;margin-bottom:10px;">Registration: <strong>${escapeHtml(reg)}</strong></div>` : ""}

    <section style="display:grid;grid-template-columns:1fr;gap:14px;">
      ${hero ? `<img src="${escapeHtml(hero)}" alt="${escapeHtml(titleCore)}" style="width:100%;height:auto;border-radius:14px;border:1px solid rgba(255,255,255,.10);" loading="eager">` : ""}

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
        ${price ? `<div><strong>Price</strong><div>${escapeHtml(price)}</div></div>` : ""}
        ${miles ? `<div><strong>Mileage</strong><div>${escapeHtml(miles)}</div></div>` : ""}
        ${fuel ? `<div><strong>Fuel</strong><div>${escapeHtml(fuel)}</div></div>` : ""}
        ${trans ? `<div><strong>Transmission</strong><div>${escapeHtml(trans)}</div></div>` : ""}
        ${engine ? `<div><strong>Engine</strong><div>${escapeHtml(engine)}</div></div>` : ""}
        ${mot ? `<div><strong>MOT</strong><div>${escapeHtml(mot)}</div></div>` : ""}
        <div><strong>Buying</strong><div>UK-wide by appointment • Delivery available</div></div>
        <div><strong>Based</strong><div>Cleobury Mortimer, South Shropshire</div></div>
      </div>

      ${shortDesc ? `<section><h2>Overview</h2><p>${escapeHtml(shortDesc)}</p></section>` : ""}
      ${fullDesc ? `<section><h2>Description</h2><p>${escapeHtml(fullDesc).replaceAll("\\n","<br>")}</p></section>` : ""}

      <section>
        <h2>Enquire</h2>
        <p>Get in touch about <strong>${escapeHtml(titleCore)}</strong>.</p>
        <p><a href="/contact" class="btn">Enquire</a></p>
      </section>
    </section>
  </main>

  <footer class="site-footer">
    <div>© ${new Date().getFullYear()} Project 55 Motors • Cleobury Mortimer</div>
  </footer>

  <!-- Optional: keep your existing client-side experience if you want -->
  <script>
    window.__P55_VEHICLE__ = ${JSON.stringify({ id: rec.id, fields: f })};
  </script>
</body>
</html>`;
}

function buildSitemapXml(urls) {
  const esc = (s) => escapeHtml(s);
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);
  for (const u of urls) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${esc(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${esc(u.lastmod)}</lastmod>`);
    lines.push(`  </url>`);
  }
  lines.push(`</urlset>`);
  return lines.join("\n");
}

function extractIdFromStockPath(pathname) {
  // /stock/<slug>-recXXXXXXXX
  const lastDash = pathname.lastIndexOf("-");
  if (lastDash === -1) return "";
  return pathname.slice(lastDash + 1).trim();
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1) Dynamic sitemap.xml (includes vehicles)
    if (path === "/sitemap.xml") {
      const stock = await fetchStockJson(request);
      const records = Array.isArray(stock?.records) ? stock.records : [];

      const urls = [
        { loc: `${SITE_ORIGIN}/` },
        { loc: `${SITE_ORIGIN}/inventory` },
        { loc: `${SITE_ORIGIN}/about` },
        { loc: `${SITE_ORIGIN}/contact` }
      ];

      for (const rec of records) {
        // Only include public-facing records (cars-api already filters Inactive/Hidden)  [oai_citation:6‡cars-api.js](sediment://file_00000000ef387246932b86ba1146b92d)
        urls.push({ loc: `${SITE_ORIGIN}${canonicalPathFor(rec)}` });
      }

      return new Response(buildSitemapXml(urls), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=900"
        }
      });
    }

    // 2) Legacy: /vehicle?id=recXXXX -> 301 to canonical /stock/<slug>-<id>
    if (path === "/vehicle") {
      const id = url.searchParams.get("id") || "";
      if (!id) return new Response("Missing id", { status: 400 });

      const stock = await fetchStockJson(request);
      const records = Array.isArray(stock?.records) ? stock.records : [];
      const rec = records.find(r => r?.id === id);

      if (!rec) return new Response("Not found", { status: 404 });

      const canonicalUrl = SITE_ORIGIN + canonicalPathFor(rec);
      return Response.redirect(canonicalUrl, 301);
    }

    // 3) Canonical: /stock/<slug>-<id> -> SSR HTML
    if (path.startsWith("/stock/")) {
      const id = extractIdFromStockPath(path);
      if (!id) return new Response("Not found", { status: 404 });

      const stock = await fetchStockJson(request);
      const records = Array.isArray(stock?.records) ? stock.records : [];
      const rec = records.find(r => r?.id === id);

      if (!rec) return new Response("Not found", { status: 404 });

      // If slug portion changed, 301 to correct canonical path
      const canonical = SITE_ORIGIN + canonicalPathFor(rec);
      if (SITE_ORIGIN + path !== canonical) return Response.redirect(canonical, 301);

      const html = renderVehicleHtml(rec);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }

    // Anything else: let your static site handle it
    return fetch(request);
  }
};