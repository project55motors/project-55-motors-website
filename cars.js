// cars.js — PUBLIC STOCK DISPLAY (ICON SPECS + FULL CARD INFO + FULL-WIDTH IMAGES)
//
// Update:
// - Uses your exact Airtable field names: MOT_Date and Transmission
// - Specs row shows ICON + VALUE (no visible text labels), but remains accessible via aria-labels
// - Card image fills the media window (premium), with only corner crop from rounded mask
//
// IMPORTANT:
// - Do not hard-code apex vs www.
// - Always call the API on the SAME ORIGIN to avoid redirects/CORS issues (especially on iOS Safari).

const API_BASE_PATH = "/cars-api";

function apiUrl(suffix = "") {
  const u = new URL(`${API_BASE_PATH}${suffix}`, window.location.origin);

  // Optional debug: add ?nocache=1 to the page URL to force Airtable refresh
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u;
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

  // Fallback: try version alone
  try {
    const r = await fetch(apiUrl("/version").toString(), { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) out.version = j.version ?? out.version;
  } catch {
    // ignore
  }

  return out;
}


/* ---------------------------
   ICON CONFIG
   Update filenames here to match your /assets/icons folder.
---------------------------- */
const ICONS = {
  mileage: "/assets/icons/mileage.svg",
  fuel: "/assets/icons/fuel.svg",
  transmission: "/assets/icons/transmission.svg",
  mot: "/assets/icons/mot.svg",
  year: "/assets/icons/year.svg",
  engine: "/assets/icons/engine.svg",
  colour: "/assets/icons/colour.svg",
  ulez: "/assets/icons/ulez.svg",
  tax: "/assets/icons/tax.svg"
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("car-grid")) loadCars();
});

/* ---------- helpers ---------- */

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getField(f, keys) {
  for (const k of keys) {
    const v = f?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function fmtPrice(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `£${Math.round(n).toLocaleString()}` : "POA";
}

function fmtMiles(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString()}` : "";
}

function fmtYear(v) {
  if (!v) return "";
  return String(v).trim();
}

function fmtEngine(v) {
  if (!v) return "";
  const s = String(v).trim();
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return s;

  // Heuristic: <=10 => litres; otherwise => cc
  if (num <= 10) return `${num.toFixed(num % 1 === 0 ? 0 : 1)}L`;
  return `${Math.round(num).toLocaleString()}cc`;
}

function fmtMot(v) {
  if (!v) return "";
  return String(v).trim();
}

function pickBestImage(att) {
  // You now upload web-ready images (e.g., 1600px), so prefer the original attachment URL.
  if (!att) return "";
  return att.url || att.thumbnails?.large?.url || att.thumbnails?.small?.url || "";
}

function specItem(iconUrl, label, value) {
  if (!value) return "";
  const icon = iconUrl ? `<img class="spec-icon" src="${iconUrl}" alt="${esc(label)}">` : "";
  return `
    <div class="spec" aria-label="${esc(label)}: ${esc(value)}" title="${esc(label)}: ${esc(value)}">
      ${icon}
      <div class="spec-value">${esc(value)}</div>
    </div>
  `;
}

/* ---------- main ---------- */

async function loadCars() {
  const grid = document.getElementById("car-grid");
  if (!grid) return;

  try {
    const meta = await fetchPublicMeta();

    const stockUrl = apiUrl("");
    if (meta.version) stockUrl.searchParams.set("v", String(meta.version));

    const res = await fetch(stockUrl.toString());
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const records = data.records || [];

    grid.innerHTML = "";

    if (!records.length) {
      grid.innerHTML = `<p>No vehicles currently available.</p>`;
      return;
    }

    const soldCfg = meta?.sold || { showSold: true, keepDays: 30 };
    const keepDays = Number.isFinite(Number(soldCfg.keepDays)) ? Number(soldCfg.keepDays) : 30;
    const showSold = typeof soldCfg.showSold === "boolean" ? soldCfg.showSold : true;

    const now = Date.now();
    const keepMs = Math.max(0, keepDays) * 86400 * 1000;

    const statusOf = (rec) => String(rec?.fields?.Status || "Available").trim() || "Available";
    const soldTsOf = (rec) => Number(rec?.__p55?.soldAtTs || 0);

    const visible = records.filter((rec) => {
      const st = statusOf(rec);

      if (st === "Hidden") return false;

      if (st !== "Sold") return true;

      if (!showSold) return false;
      if (keepDays === 0) return false;

      const ts = soldTsOf(rec);
      if (ts > 0 && keepMs > 0) return (now - ts) <= keepMs;

      // If we don't yet have a sold timestamp, err on the side of showing.
      return true;
    });

    // Premium ordering: available first, then sold.
    visible.sort((a, b) => (statusOf(a) === "Sold" ? 1 : 0) - (statusOf(b) === "Sold" ? 1 : 0));

    visible.forEach((rec) => {
      const f = rec.fields || {};

      const title = getField(f, ["Make_Model", "Title", "Vehicle", "Name"]);
      const price = fmtPrice(getField(f, ["Price", "Asking_Price"]));

      const mileage = fmtMiles(getField(f, ["Mileage", "Miles", "Odometer", "Mileage_miles"]));
      const fuel = getField(f, ["Fuel_type", "Fuel", "FuelType"]);

      // Exact names you provided:
      const transmission = getField(f, ["Transmission"]);
      const mot = fmtMot(getField(f, ["MOT_Date"]));

      const year = fmtYear(getField(f, ["Year", "Registration_Year"]));
      const engine = fmtEngine(getField(f, ["Engine_size", "Engine", "EngineSize", "CC", "cc"]));
      const colour = getField(f, ["Colour", "Color"]);
      const ulez = getField(f, ["ULEZ", "Ulez", "ULEZ_Compliant"]);
      const tax = getField(f, ["Road_Tax", "Tax", "VED"]);

      const shortDesc = getField(f, ["Short_Description", "Summary", "Tagline", "Description_Short"]);

      const firstPhoto = f.Photos?.[0] || null;
      const imgUrl = pickBestImage(firstPhoto);

      const card = document.createElement("a");
      card.className = "car-card";
      card.href = `vehicle.html?id=${rec.id}`;

      // Media wrapper (stable height, full-width image)
      const media = document.createElement("div");
      media.className = "car-card-media";

      const img = document.createElement("img");
      img.alt = title ? String(title) : "Vehicle photo";
      img.loading = "lazy";
      img.decoding = "async";
      if (imgUrl) img.src = imgUrl;

      img.addEventListener("error", () => {
        img.removeAttribute("src");
        media.classList.add("is-missing");
      });

      media.appendChild(img);

const st = String(f.Status || "Available").trim() || "Available";
const soldTs = Number(rec?.__p55?.soldAtTs || 0);
const soldDateText = soldTs > 0
  ? new Date(soldTs).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  : "";

if (st === "Sold") {
  card.classList.add("is-sold");

  const badge = document.createElement("div");
  badge.className = "car-card-badge";
  badge.textContent = "Sold";
  media.appendChild(badge);
}

      const info = document.createElement("div");
      info.className = "info";

      // Icon specs (only show what exists). Keep tidy: first 6 available.
      const specsHtml = [
        specItem(ICONS.transmission, "Transmission", transmission),
        specItem(ICONS.mot, "MOT", mot),
        specItem(ICONS.mileage, "Mileage", mileage ? `${mileage}` : ""),
        specItem(ICONS.fuel, "Fuel", fuel),
        specItem(ICONS.engine, "Engine", engine),
        specItem(ICONS.year, "Year", year),
        specItem(ICONS.colour, "Colour", colour),
        specItem(ICONS.ulez, "ULEZ", ulez),
        specItem(ICONS.tax, "Road Tax", tax)
      ].filter(Boolean).slice(0, 6).join("");

      info.innerHTML = `
        <div class="car-card-top">
          <h3>${esc(title)}</h3>
          <p class="price">${esc(price)}</p>
        </div>

        ${st === "Sold" ? `<div class="sold-line">Sold${soldDateText ? ` • ${soldDateText}` : ""}</div>` : ""}

        ${specsHtml ? `<div class="car-specs">${specsHtml}</div>` : ""}

        ${shortDesc ? `<p class="car-desc">${esc(shortDesc)}</p>` : ""}
      `;

      card.appendChild(media);
      card.appendChild(info);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;
  }
}
