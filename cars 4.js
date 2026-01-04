// cars.js — Project 55 Motors (public stock cards)
//
// Patch 2026-01-02:
// - Fixes MOT formatter syntax error and undefined motLong usage that prevented rendering.
// - Displays MOT as a short date in the pill (e.g., "05 Jul 26") with full date in tooltip.
// - Keeps registration in its own pill and formats UK spacing where appropriate.

const API_URL = (() => {
  const u = new URL("/cars-api", window.location.origin);

  // Optional debug: add ?nocache=1 to the page URL to force Airtable refresh
  const p = new URLSearchParams(window.location.search);
  if (p.get("nocache") === "1") u.searchParams.set("nocache", "1");

  return u.toString();
})();

const ICONS = {
  mileage: "/assets/icons/mileage.svg",
  fuel: "/assets/icons/fuel.svg",
  transmission: "/assets/icons/transmission.svg",
  mot: "/assets/icons/mot.svg",
  registration: "/assets/icons/registration.svg",
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

function fmtReg(v) {
  if (!v) return "";
  const raw = String(v).trim().toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  if (cleaned.includes(" ")) return cleaned;

  // Tasteful spacing for common UK formats
  const s = cleaned;
  if (s.length === 7) return `${s.slice(0, 4)} ${s.slice(4)}`;
  if (s.length === 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
  return s;
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

function parseDateLoose(v) {
  if (!v) return null;
  const s = String(v).trim();

  // ISO / Airtable datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes("T")) {
    const tmp = new Date(s);
    if (!Number.isNaN(tmp.getTime())) return tmp;
  }

  // UK dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/").map(n => parseInt(n, 10));
    const tmp = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(tmp.getTime())) return tmp;
  }

  // Last attempt
  const tmp = new Date(s);
  if (!Number.isNaN(tmp.getTime())) return tmp;

  return null;
}

function fmtMotLong(v) {
  const d = parseDateLoose(v);
  if (!d) return v ? String(v).trim() : "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}

function fmtMotShort(v) {
  const long = fmtMotLong(v);
  if (!long) return "";
  const m = long.match(/^(\d{2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3].slice(2)}`;
  return long;
}

function pickBestImage(att) {
  if (!att) return "";
  return att.url || att.thumbnails?.large?.url || att.thumbnails?.small?.url || "";
}

function specItem(iconUrl, label, value, extraClass = "", titleOverride = "") {
  if (!value) return "";
  const icon = iconUrl ? `<img class="spec-icon" src="${esc(iconUrl)}" alt="${esc(label)}">` : "";
  const cls = ["spec", extraClass].filter(Boolean).join(" ");
  const titleText = titleOverride || `${label}: ${value}`;
  return `
    <div class="${cls}" aria-label="${esc(label)}: ${esc(value)}" title="${esc(titleText)}">
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

  items.forEach(el => el.classList.remove("span-2", "span-3"));

  const cols = (getComputedStyle(specsEl).gridTemplateColumns || "")
    .split(" ")
    .filter(Boolean).length || 3;

  const remainder = items.length % cols;
  if (remainder === 0) return;

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
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data = await res.json();
    const records = Array.isArray(data?.records) ? data.records : [];

    grid.innerHTML = "";

    if (!records.length) {
      grid.innerHTML = `<p>No vehicles currently available.</p>`;
      return;
    }

    bindSpecsTidy();

    records.forEach((rec) => {
      const f = rec.fields || {};

      const title = getField(f, ["Make_Model", "Title", "Vehicle", "Name"]);
      const price = fmtPrice(getField(f, ["Price", "Asking_Price"]));

      const mileage = fmtMiles(getField(f, ["Mileage", "Miles", "Odometer", "Mileage_miles"]));
      const fuel = getField(f, ["Fuel_type", "Fuel", "FuelType"]);

      const transmission = getField(f, ["Transmission"]);
      const motLong = fmtMotLong(getField(f, ["MOT_Date"]));
      const motShort = fmtMotShort(getField(f, ["MOT_Date"]));
      const registration = fmtReg(getField(f, ["Registration", "Reg", "VRM", "Number_Plate", "NumberPlate", "Registration_Plate", "Reg_Plate", "Plate"]));

      const year = fmtYear(getField(f, ["Year", "Registration_Year"]));
      const engine = fmtEngine(getField(f, ["Engine_size", "Engine", "EngineSize", "CC", "cc"]));
      const shortDesc = getField(f, ["Short_Description", "Summary", "Tagline", "Description_Short"]);

      const firstPhoto = f.Photos?.[0] || null;
      const imgUrl = pickBestImage(firstPhoto);

      const card = document.createElement("a");
      card.className = "car-card";
      card.href = `vehicle.html?id=${rec.id}`;

      const img = document.createElement("img");
      img.className = "car-image";
      img.alt = title ? String(title) : "Vehicle photo";
      img.loading = "lazy";
      img.decoding = "async";
      if (imgUrl) img.src = imgUrl;

      img.addEventListener("error", () => {
        img.removeAttribute("src");
      });

      card.appendChild(img);

      // SOLD ribbon (premium)
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
        card.appendChild(ribbon);
      }

      const info = document.createElement("div");
      info.className = "info";

      const specsHtml = [
        specItem(ICONS.transmission, "Transmission", transmission),
        specItem(ICONS.mileage, "Mileage", mileage),
        specItem(ICONS.fuel, "Fuel", fuel),
        specItem(ICONS.engine, "Engine", engine, "spec--engine"),
        specItem(ICONS.year, "Year", year),
        specItem(ICONS.registration, "Registration", registration, "spec--reg"),
        specItem(ICONS.mot, "MOT", motShort || motLong, "spec--mot", motLong ? `MOT: ${motLong}` : "")
      ].filter(Boolean).slice(0, 7).join("");

      info.innerHTML = `
        <div class="car-card-top">
          <h3>${esc(title)}</h3>
          <p class="price">${esc(price)}</p>
        </div>

        ${specsHtml ? `<div class="car-specs">${specsHtml}</div>` : ""}

        ${shortDesc ? `<p class="car-desc">${esc(shortDesc)}</p>` : ""}
      `;

      tidySpecsGrid(info.querySelector(".car-specs"));

      card.appendChild(info);
      grid.appendChild(card);
    });

    tidyAllSpecsGrids();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div style="padding:14px;border:1px solid rgba(15,23,42,.12);border-radius:14px;background:#fff;">
        <p style="margin:0 0 8px;color:#b91c1c;font-weight:800;">Failed to load stock.</p>
        <p style="margin:0;color:#334155;font-size:13px;">${esc(String(err?.message || err))}</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:12px;">Endpoint: ${esc(API_URL)}</p>
      </div>
    `;
  }
}
