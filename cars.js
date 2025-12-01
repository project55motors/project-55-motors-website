// cars.js — PUBLIC STOCK LISTING (Home + Inventory)
// Now links to the new premium detail page: vehicle.html?id=recordID
// Uses the public cars-api worker (Available vehicles only)

const API_URL = 'https://project55motors.co.uk/cars-api';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('car-grid')) loadCars();
});

/* ---------------------------------------------------
   LOAD ALL CARS (Home + Inventory)
--------------------------------------------------- */
async function loadCars() {
  const grid = document.getElementById('car-grid');
  if (!grid) return;

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data = await res.json();
    const records = data.records || [];

    grid.innerHTML = '';

    if (!records.length) {
      grid.innerHTML = `<p style="text-align:center;">No cars available at the moment.</p>`;
      return;
    }

    // Only show vehicles explicitly marked as "Available"
    const available = records.filter(r =>
      (r.fields.Status || '').toLowerCase() === 'available'
    );

    const path = window.location.pathname;
    const isHome = (path === '/' || path === '/index.html');
    const carsToShow = isHome ? available.slice(0, 3) : available;

    carsToShow.forEach(rec => {
      const f = rec.fields;
      const id = rec.id;

      const img = f.Photos?.[0]?.url || '';
      const title = f.Make_Model || '';
      const reg = f.Registration || '';
      const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : 'POA';

      const short = f.Short_Description || '';
      const mileage = f.Mileage
        ? `${Number(f.Mileage).toLocaleString()} miles`
        : '';
      const mot = f.MOT_Date || '';

      const specParts = [];
      if (mileage) specParts.push(mileage);
      if (mot) specParts.push(`MOT: ${mot}`);
      const specLine = specParts.join(' · ');

      // --- Card link now goes to NEW premium detail page
      const card = document.createElement('
