// cars.js — PUBLIC STOCK DISPLAY (NO-CROP IMAGES + FULL CARD INFO)

const API_URL = "https://project55motors.co.uk/cars-api/";

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

function fmtPrice(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `£${n.toLocaleString()}` : "POA";
}

function fmtMiles(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString()} miles` : "";
}

function fmtEngine(v) {
  // Accept 1.0 / 2.0 / 1995 etc. and keep it tidy.
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).trim();
  return s ? `${s}L` : "";
}

function fmtDate(v) {
  // Basic pass-through: keep whatever you store in Airtable (e.g. "01/2026", "2026-01-01").
  if (!v) return "";
  return String(v).trim();
}

function pickBestImage(att) {
  if (!att) return { src: "", bg: "" };

  // Since you now upload web-ready images (1600px), prefer ORIGINAL to avoid Airtable square thumbnails.
  // Fallback to thumbnails only if original missing.
  const original = att.url || "";
  const thumbs = att.thumbnails || {};
  const large = thumbs.large?.url || "";
  const small = thumbs.small?.url || "";

  const src = original || large || small || "";
  const bg = src; // used for blurred background
  return { src, bg };
}

function getField(f, keys) {
  for (const k of keys) {
    if (f && f[k] !== undefined && f[k] !== null && f[k] !== "") return f[k];
  }
  return "";
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

      // Try common variants without forcing you to rename Airtable columns
      const mileageRaw = getField(f, ["Mileage", "Miles", "Odometer", "Mileage_miles"]);
      const mileage = fmtMiles(mileageRaw);

      const mot = fmtDate(getField(f, ["MOT", "MOT_Expiry", "MOT_Expires", "MOT_Expiry_Date"]));

      const engine = getField(f, ["Engine_size", "Engine", "EngineSize"]);
      const engineNice = engine ? fmtEngine(engine) : "";

      const fuel = getField(f, ["Fuel_type", "Fuel", "FuelType"]);
      const trans = getField(f, ["Transmission", "Gearbox"]);
      const year = getField(f, ["Year", "Registration_Year"]);

      const shortDesc = getField(f, ["Short_Description", "Summary", "Tagline", "Description_Short"]);

      const firstPhoto = f.Photos?.[0] || null;
      const imgPick = pickBestImage(firstPhoto);

      const card = document.createElement("a");
      card.className = "car-card";
      card.href = `vehicle.html?id=${rec.id}`;

      // Media wrapper: fixed height, no layout collapse, no crop (contain)
      const media = document.createElement("div");
      media.className = "car-card-media";

      if (imgPick.bg) {
        media.classList.add("has-bg");
        media.style.setProperty("--card-bg", `url("${imgPick.bg}")`);
      }

      const img = document.createElement("img");
      img.alt = title ? String(title) : "Vehicle photo";
      img.loading = "lazy";
      img.decoding = "async";

      if (imgPick.src) img.src = imgPick.src;

      img.addEventListener("error", () => {
        img.removeAttribute("src");
        media.classList.add("is-missing");
        media.classList.remove("has-bg");
      });

      media.appendChild(img);

      const info = document.createElement("div");
      info.className = "info";

      // Badges row (only show what exists)
      const badges = [];
      if (year) badges.push(`<span class="badge">${esc(year)}</span>`);
      if (fuel) badges.push(`<span class="badge">${esc(fuel)}</span>`);
      if (trans) badges.push(`<span class="badge">${esc(trans)}</span>`);
      if (engineNice) badges.push(`<span class="badge">${esc(engineNice)}</span>`);

      // Meta list
      const meta = [];
      if (mileage) meta.push(`<li><span class="k">Mileage</span><span class="v">${esc(mileage)}</span></li>`);
      if (mot) meta.push(`<li><span class="k">MOT</span><span class="v">${esc(mot)}</span></li>`);

      info.innerHTML = `
        <h3>${esc(title)}</h3>
        <p class="price">${esc(price)}</p>

        ${badges.length ? `<div class="car-badges">${badges.join("")}</div>` : ""}

        ${
          meta.length
            ? `<ul class="car-meta">${meta.join("")}</ul>`
            : ""
        }

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
