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

const API_URL = (() => {
  const u = new URL("/cars-api", window.location.origin);

  // Optional debug: add ?nocache=1 to the page URL to force Airtable refresh
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u.toString();
})();

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
  // Accept Airtable date strings (ISO or YYYY-MM-DD) and common UK formats.
  const s = String(v).trim();
  let d = null;

  // ISO / Airtable datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes("T")) {
    const tmp = new Date(s);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }

  // UK dd/mm/yyyy
  if (!d && /^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/").map(n => parseInt(n, 10));
    const tmp = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }

  // Last attempt
  if (!d) {
    const tmp = new Date(s);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }

  if (!d) return s;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}


function pickBestImage(att) {
  // You now upload web-ready images (e.g., 1600px), so prefer the original attachment URL.
  if (!att) return "";
  return att.url || att.thumbnails?.large?.url || att.thumbnails?.small?.url || "";
}

function specItem(iconUrl, label, value, extraClass = "") {
  if (!value) return "";
  const icon = iconUrl ? `<img class="spec-icon" src="${iconUrl}" alt="${esc(label)}">` : "";
  const cls = ["spec", extraClass].filter(Boolean).join(" ");
  return `
    <div class="${cls}" aria-label="${esc(label)}: ${esc(value)}" title="${esc(label)}: ${esc(value)}">
      ${icon}
      <div class="spec-value">${esc(value)}</div>
    </div>
  `;
}



/* ---------- layout tidy (fills last row so there is no blank “gap”) ---------- */

let _p55SpecsTidyBound = false;

function tidySpecsGrid(specsEl) {
  if (!specsEl) return;

  // If MOT exists, move it to the end so it becomes the “wide” pill on incomplete rows.
  const motEl = specsEl.querySelector(".spec--mot");
  if (motEl && motEl.parentElement === specsEl && motEl !== specsEl.lastElementChild) {
    specsEl.appendChild(motEl);
  }

  const items = [...specsEl.querySelectorAll(".spec")];
  if (!items.length) return;

  // Clear previous spans
  items.forEach(el => el.classList.remove("span-2", "span-3"));

  // Determine column count from computed grid-template-columns (matches CSS + breakpoints)
  const cols = (getComputedStyle(specsEl).gridTemplateColumns || "")
    .split(" ")
    .filter(Boolean).length || 3;

  const remainder = items.length % cols;
  if (remainder === 0) return;

  // Make the last item span the remaining columns (e.g., 5 items in 3 cols => last spans 2)
  const span = Math.min(cols, (cols - remainder + 1));
  items[items.length - 1].classList.add(`span-${span}`);
}


function tidyAllSpecsGrids() {
  document.querySelectorAll(".car-specs").forEach(tidySpecsGrid);
}

function bindSpecsTidy() {
  if (_p55SpecsTidyBound) return;
  _p55SpecsTidyBound = true;

  window.addEventListener("resize", () => tidyAllSpecsGrids(), { passive: true });
}

/* ---------- main ---------- */

async function loadCars() {
  const grid = document.getElementById("car-grid");
  if (!grid) return;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const records = data.records || [];

    grid.innerHTML = "";

    if (!records.length) {
      grid.innerHTML = `<p>No vehicles currently available.</p>`;
      return;
    }

    records.forEach((rec) => {
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

    // One-time: bind resize tidy + run tidy across all cards
    bindSpecsTidy();
    tidyAllSpecsGrids();

      media.appendChild(img);


// SOLD ribbon (premium): keep imagery vivid; show corner ribbon when Status === "Sold"
const statusRaw = getField(f, ["Status"]);
const statusNorm = String(
  (statusRaw && typeof statusRaw === "object" && "name" in statusRaw) ? statusRaw.name : statusRaw
).trim().toLowerCase();

if (statusNorm === "sold") {
  card.classList.add("is-sold");

  const ribbon = document.createElement("div");
  ribbon.className = "car-card-ribbon sold";
  ribbon.setAttribute("aria-hidden", "true");
  ribbon.innerHTML = `<span>SOLD</span>`;
  media.appendChild(ribbon);
}

      const info = document.createElement("div");
      info.className = "info";

      // Icon specs (only show what exists). Keep tidy: first 6 available.
      const specsHtml = [
        specItem(ICONS.transmission, "Transmission", transmission),
        specItem(ICONS.mot, "MOT", mot, "spec--mot"),
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

        ${specsHtml ? `<div class="car-specs">${specsHtml}</div>` : ""}

        ${shortDesc ? `<p class="car-desc">${esc(shortDesc)}</p>` : ""}
      `;

      // Tidy the specs grid (prevents blank gaps and ensures full values can be seen)
      tidySpecsGrid(info.querySelector(".car-specs"));

      card.appendChild(media);
      card.appendChild(info);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;
  }
}
