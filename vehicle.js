/* ---------------------------------------------------------
   Project 55 Motors — Vehicle Detail Page Controller
   Includes: Hero image, swipeable gallery, enquire prefill
--------------------------------------------------------- */

/*
  IMPORTANT:
  - Do not hard-code apex vs www. The site may load on either host.
  - Always call the API on the SAME ORIGIN to avoid redirects/CORS issues.
  - Avoid fetch cache bypass so Cloudflare edge caching remains effective.
*/

const API_BASE_PATH = "/cars-api";

function apiUrl(suffix = "") {
  const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);

  // Debug aid: add &nocache=1 to the vehicle page URL to force Airtable refresh
  // Example: /vehicle.html?id=recXXXX&nocache=1
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u;
}

function getWhatsAppPhone() {
  return String(window.P55?.whatsapp?.phoneE164 || "").replace(/\D/g, "");
}

function buildWhatsAppUrl(phone, text) {
  const u = new URL(`https://wa.me/${phone}`);
  u.searchParams.set("text", text);
  return u.toString();
}

function setVehicleWhatsAppCTA(fields, isSold) {
  const a = document.getElementById("whatsapp-btn");
  if (!a) return;

  const phone = getWhatsAppPhone();
  if (!phone) {
    a.style.display = "none";
    return;
  }

  const makeModel = fields?.Make_Model || "this vehicle";
  const reg = fields?.Registration ? ` (${fields.Registration})` : "";
  const price = fields?.Price ? `£${Number(fields.Price).toLocaleString()}` : "POA";
  const link = window.location.href;

  const text = isSold
    ? `Hi Project 55 Motors — I’m looking for something similar to the ${makeModel}${reg} you’ve sold.\n\nLink: ${link}`
    : `Hi Project 55 Motors — I’m interested in the ${makeModel}${reg} (${price}). Is it still available?\n\nLink: ${link}`;

  a.href = buildWhatsAppUrl(phone, text);
  a.style.display = "";
}

async function fetchPublicMeta() {
  const out = {
    version: null,
    sold: { showSold: true, keepDays: 30 }
  };

  try {
    const r = await fetch(apiUrl("/settings").toString(), { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) {
      out.version = j.version ?? out.version;
      out.sold = {
        showSold: typeof j.sold?.showSold === "boolean" ? j.sold.showSold : out.sold.showSold,
        keepDays: Number.isFinite(Number(j.sold?.keepDays)) ? Number(j.sold.keepDays) : out.sold.keepDays
      };
      return out;
    }
  } catch {
    // ignore
  }

  try {
    const r = await fetch(apiUrl("/version").toString(), { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) out.version = j.version ?? out.version;
  } catch {
    // ignore
  }

  return out;
}


document.addEventListener("DOMContentLoaded", () => {
  loadVehicle();
});

async function loadVehicle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const container = document.getElementById("vehicle-page");

  if (!id || !container) {
    if (container) container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
    return;
  }

  try {
    // Keep this a simple GET. The Worker handles edge caching.
    const meta = await fetchPublicMeta();

    const stockUrl = apiUrl("");
    if (meta.version) stockUrl.searchParams.set("v", String(meta.version));

    const res = await fetch(stockUrl.toString());
    if (!res.ok) throw new Error("API error " + res.status);

    const data = await res.json();
    const record = data.records?.find(r => r.id === id);

    if (!record) {
      container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
      return;
    }

    if (!isRecordPublic(record, meta)) {
      renderUnavailable(container, "This vehicle is no longer listed.");
      return;
    }

    renderVehicle(record);
  } catch (err) {
    console.error("Vehicle fetch failed:", err);
    container.innerHTML = "<p style='color:red;'>Failed to load vehicle details.</p>";
  }
}

function isRecordPublic(rec, meta) {
  const f = rec?.fields || {};
  const st = String(f.Status || "Available").trim() || "Available";

  if (st === "Hidden") return false;
  if (st !== "Sold") return true;

  const soldCfg = meta?.sold || { showSold: true, keepDays: 30 };
  const showSold = typeof soldCfg.showSold === "boolean" ? soldCfg.showSold : true;
  const keepDays = Number.isFinite(Number(soldCfg.keepDays)) ? Number(soldCfg.keepDays) : 30;

  if (!showSold || keepDays === 0) return false;

  const ts = Number(rec?.__p55?.soldAtTs || 0);
  if (ts > 0) {
    const age = Date.now() - ts;
    if (age > keepDays * 86400 * 1000) return false;
  }

  return true;
}

function renderUnavailable(container, message) {
  container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">
      <div class="vehicle-sold-banner" style="margin-top:16px;">
        <div class="vehicle-sold-left">
          <div class="vehicle-sold-pill">Unavailable</div>
          <div class="vehicle-sold-meta">${escapeHtml(message || "This vehicle is no longer listed.")}</div>
        </div>
        <div class="vehicle-sold-cta">
          <a href="/index.html">View current stock</a>
        </div>
      </div>
    </div>
  `;
}

function upsertSoldBanner(rec) {
  const st = String(rec?.fields?.Status || "Available").trim() || "Available";
  const isSold = st === "Sold";
  const container = document.getElementById("vehicle-page") || document.body;

  const existing = document.getElementById("vehicle-sold-banner");
  if (!isSold) {
    existing?.remove();
    return;
  }

  const soldTs = Number(rec?.__p55?.soldAtTs || 0);
  const soldDateText = soldTs > 0
    ? new Date(soldTs).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const wrap = document.createElement("div");
  wrap.id = "vehicle-sold-banner";
  wrap.className = "vehicle-sold-banner";
  wrap.innerHTML = `
    <div class="vehicle-sold-left">
      <div class="vehicle-sold-pill">Sold</div>
      <div class="vehicle-sold-meta">
        This vehicle has been sold${soldDateText ? ` on ${escapeHtml(soldDateText)}` : ""}. If you would like something similar, please get in touch.
      </div>
    </div>
    <div class="vehicle-sold-cta">
      <a href="/contact.html?msg=${encodeURIComponent("I'm looking for a similar vehicle to the one you've just sold.")}">Enquire</a>
    </div>
  `;

  // Insert near the top of the page content
  const first = container.firstElementChild;
  if (existing) existing.replaceWith(wrap);
  else if (first) container.insertBefore(wrap, first);
  else container.appendChild(wrap);
}

function renderVehicle(rec) {
  const f = rec.fields;

  upsertSoldBanner(rec);

  const heroImg = document.getElementById("vehicle-hero");
  const thumbs = document.getElementById("vehicle-thumbs");

  /* ------- Populate Text ------- */
  setText("vehicle-title", f.Make_Model);
  setText("vehicle-reg", f.Registration ? `Registration: ${f.Registration}` : "");
  setText("vehicle-price", f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA");
  setText("vehicle-mileage", f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—");
  setText("vehicle-transmission", getTransmission(f) || "—");
  setText("vehicle-mot", formatMaybeDate(f.MOT_Date) || "—");
  setText("vehicle-engine", f.Engine_size || "—");
  setText("vehicle-fuel", f.Fuel_type || "—");

  renderDescriptionSections(f.Full_Description);

  /* ------- Image Logic ------- */
  const photos = Array.isArray(f.Photos) ? f.Photos : [];
  let index = 0;

  function updateHero(i) {
    if (!photos.length || !heroImg) return;
    index = i;
    heroImg.src = photos[i].url;
    heroImg.alt = f.Make_Model || "Vehicle photo";
    updateThumbHighlight();
  }

  function updateThumbHighlight() {
    const all = document.querySelectorAll(".vehicle-thumb");
    all.forEach((el, i) => el.classList.toggle("active", i === index));
  }

  if (thumbs) {
    thumbs.innerHTML = "";
    photos.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.className = `vehicle-thumb ${i === 0 ? "active" : ""}`;
      btn.innerHTML = `<img src="${p.url}" alt="Photo ${i + 1}">`;
      btn.onclick = () => updateHero(i);
      thumbs.appendChild(btn);
    });
  }

  if (photos.length) updateHero(0);

  /* ------- Swipe Support ------- */
  let startX = 0;
  heroImg?.addEventListener("touchstart", e => (startX = e.touches[0].clientX));

  heroImg?.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && index < photos.length - 1) updateHero(index + 1);
    if (dx > 0 && index > 0) updateHero(index - 1);
  });

  /* ------- Enquire Button ------- */
  const enquireBtn = document.getElementById("enquire-btn");

  const st = String(f.Status || "Available").trim() || "Available";
  const isSold = st === "Sold";

  if (enquireBtn) {
    const main = enquireBtn.querySelector(".enquire-btn__main");
    const label = isSold ? "Enquire Similar Vehicle" : "Enquire About This Vehicle";
    if (main) main.textContent = label;
    else enquireBtn.textContent = label;
  }

  setVehicleWhatsAppCTA(f, isSold);

  if (enquireBtn) enquireBtn.onclick = () => {
    const makeModel = f.Make_Model || "vehicle";
    const reg = f.Registration ? ` (${f.Registration})` : "";

    const msg = isSold
      ? `I am looking for something similar to the ${makeModel}${reg} you have just sold.`
      : `I am interested in the ${makeModel}${reg}.`;

    location.href = `/contact.html?msg=${encodeURIComponent(msg)}`;
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function getTransmission(fields) {
  // Field names commonly used across Airtable bases
  return (
    fields.Transmission ||
    fields.Transmission_type ||
    fields.Gearbox ||
    fields.Gearbox_type ||
    ""
  );
}

function formatMaybeDate(value) {
  if (!value) return "";
  // Airtable often returns YYYY-MM-DD. If it's not parseable, we display as-is.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHeading(line) {
  const l = String(line)
    .trim()
    .replace(/[:\-–—]+\s*$/g, "")
    .toLowerCase();

  if (!l) return "";

  if (/(^opening\s*comments?$)|(^opening$)|(^overview$)|(^intro(duction)?$)/i.test(l)) return "opening";
  if (/^highlights?$/i.test(l)) return "highlights";
  if (/^(specification|specs|spec)$/i.test(l)) return "specification";
  if (/^condition$/i.test(l)) return "condition";
  if (/^why\s*(this\s*)?car\s*stands\s*out$/i.test(l)) return "standout";

  return "";
}

function parseFullDescription(raw) {
  const sections = {
    opening: [],
    highlights: [],
    specification: [],
    condition: [],
    standout: []
  };

  const lines = String(raw)
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let current = "opening";

  for (const line of lines) {
    const heading = isHeading(line);
    if (heading) {
      current = heading;
      continue;
    }

    const cleaned = line.replace(/^[•\u2022\-\*]+\s*/, "").trim();
    if (!cleaned) continue;

    sections[current].push(cleaned);
  }

  return sections;
}

function renderLinesAsParagraph(lines) {
  if (!lines || !lines.length) return "";
  return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
}

function renderLinesAsList(lines) {
  if (!lines || !lines.length) return "";
  return `<ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

function renderDescriptionSections(text) {
  const el = document.getElementById("vehicle-description");
  if (!el) return;

  const raw = (text || "").toString().trim();
  if (!raw) {
    el.innerHTML = "";
    return;
  }

  const s = parseFullDescription(raw);

  // Intro: opening comments. If missing, use the first 2 non-empty lines as a fallback.
  let introLines = s.opening;
  if (!introLines.length) {
    introLines = raw
      .replace(/\r/g, "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  const introHtml = introLines.length
    ? `<div class="vehicle-desc-intro">${renderLinesAsParagraph(introLines)}</div>`
    : "";

  const cards = [
    { title: "Highlights", lines: s.highlights },
    { title: "Specification", lines: s.specification },
    { title: "Condition", lines: s.condition },
    { title: "Why This Car Stands Out", lines: s.standout }
  ].filter(c => c.lines && c.lines.length);

  const cardsHtml = cards.length
    ? `<div class="vehicle-desc-sections">
         ${cards
           .map(
             c => `<section class="vehicle-desc-card">
                     <h2>${escapeHtml(c.title)}</h2>
                     ${renderLinesAsList(c.lines)}
                   </section>`
           )
           .join("")}
       </div>`
    : `<div class="vehicle-desc-sections">
         <section class="vehicle-desc-card">
           <h2>Vehicle Details</h2>
           ${renderLinesAsList(s.opening.length ? s.opening : raw.split(/\r?\n/).filter(Boolean))}
         </section>
       </div>`;

  el.innerHTML = `${introHtml}${cardsHtml}`;
}
