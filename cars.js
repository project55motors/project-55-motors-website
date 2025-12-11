// cars.js — PUBLIC STOCK LISTING (Home + Stock Page, restored essentials)
//
// Uses the Project 55 Motors cars-api endpoint which returns either:
//   [ { id, fields: { ... } }, ... ]
// or:
//   { records: [ { id, fields: { ... } }, ... ] }
//
// This script:
//   • Populates the horizontal carousel on the homepage (#car-carousel)
//   • Populates the full stock grid on inventory.html (#car-grid)
//   • Shows Registration, Make/Model, Price, Short Description
//   • Shows essential specs: Mileage, MOT, Engine size, Transmission

const API_URL = 'https://project55motors.co.uk/cars-api';

document.addEventListener('DOMContentLoaded', () => {
  loadCars();
});

/**
 * Fetch cars from the API and populate both the carousel and grid.
 */
async function loadCars() {
  const carousel = document.getElementById('car-carousel');
  const grid = document.getElementById('car-grid');

  try {
    const res = await fetch(API_URL, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error('cars-api returned ' + res.status);
    }

    const data = await res.json();

    // Support both array and {records:[...]} shapes
    let records = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (Array.isArray(data.records)) {
      records = data.records;
    }

    // Only "Available" vehicles, sorted by Sort_Index
    const cars = records
      .filter(r => (r.fields?.Status || '').toLowerCase() === 'available')
      .sort((a, b) => {
        const ai = Number(a.fields?.Sort_Index ?? 9999);
        const bi = Number(b.fields?.Sort_Index ?? 9999);
        return ai - bi;
      });

    /* ---------------- CAROUSEL (HOME) ---------------- */
    if (carousel) {
      carousel.innerHTML = '';

      cars.forEach(rec => {
        const card = buildCarCard(rec, true);
        if (card) carousel.appendChild(card);
      });
    }

    /* ---------------- GRID (INVENTORY) ---------------- */
    if (grid) {
      grid.innerHTML = '';

      cars.forEach(rec => {
        const card = buildCarCard(rec, false);
        if (card) grid.appendChild(card);
      });
    }

  } catch (err) {
    console.error('Error loading cars:', err);

    if (grid) {
      grid.innerHTML =
        '<p style="color:red;text-align:center;">Failed to load stock.</p>';
    }
  }
}

/**
 * Build a single car card element.
 * @param {object} rec - Airtable record { id, fields }
 * @param {boolean} isCarousel - true = smaller carousel card
 * @returns {HTMLAnchorElement}
 */
function buildCarCard(rec, isCarousel) {
  const f = rec.fields || {};

  const photo = (f.Photos && f.Photos[0]) || null;
  const img =
    photo?.thumbnails?.large?.url ||
    photo?.thumbnails?.small?.url ||
    photo?.url ||
    '';

  const price = f.Price
    ? `£${Number(f.Price).toLocaleString()}`
    : 'POA';

  const mileage = f.Mileage
    ? `${Number(f.Mileage).toLocaleString()} miles`
    : '';

  const short = f.Short_Description || '';
  const mot = f.MOT_Date || '';
  const engine = f.Engine_size || '';
  const trans = f.Transmission || '';

  // Essentials line – mileage · MOT · engine · transmission
  const essentialsParts = [];
  if (mileage) essentialsParts.push(mileage);
  if (mot) essentialsParts.push(`MOT: ${mot}`);
  if (engine) essentialsParts.push(engine);
  if (trans) essentialsParts.push(trans);

  const essentialsLine = essentialsParts.join(' · ');

  const a = document.createElement('a');
  a.href = `vehicle.html?id=${encodeURIComponent(rec.id)}`;
  a.className = 'car-card' + (isCarousel ? ' carousel-card' : '');

  a.innerHTML = `
    <img src="${img}" class="car-thumb" alt="${escapeHtml(
      f.Make_Model || f.Registration || 'Vehicle'
    )}">
    <div class="car-info">
      <h3>${escapeHtml(f.Make_Model || '')}</h3>
      <p class="reg">${escapeHtml(f.Registration || '')}</p>
      <p class="price">${price}</p>
      ${
        short
          ? `<p class="card-short-desc">${escapeHtml(short)}</p>`
          : ''
      }
      ${
        essentialsLine
          ? `<p class="card-spec-line">${escapeHtml(essentialsLine)}</p>`
          : ''
      }
    </div>
  `;

  return a;
}

/**
 * Basic HTML escaping for injected text content.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
