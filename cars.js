// cars.js — PUBLIC STOCK LISTING (Home + Stock Page)
// Populates both the horizontal carousel (#car-carousel) and full grid (#car-grid)

const API_URL = 'https://project55motors.co.uk/cars-api';

document.addEventListener('DOMContentLoaded', () => {
  loadCars();
});

/* ---------------------------------------------------
   FETCH CARS & POPULATE BOTH ELEMENTS
--------------------------------------------------- */
async function loadCars() {
  const carousel = document.getElementById('car-carousel');
  const grid = document.getElementById('car-grid');

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data = await res.json();
    const records = data.records || [];

    // Only available vehicles
    const cars = records.filter(r =>
      (r.fields.Status || '').toLowerCase() === 'available'
    );

    /* ----------- Populate Carousel (Homepage) ----------- */
    if (carousel) {
      carousel.innerHTML = '';

      cars.forEach(rec => {
        const f = rec.fields;
        const img = f.Photos?.[0]?.url || '';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : 'POA';
        const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : '';

        const short = f.Short_Description || '';
        const mot = f.MOT_Date || '';

        const specParts = [];
        if (mileage) specParts.push(mileage);
        if (mot) specParts.push(`MOT: ${mot}`);
        const specLine = specParts.join(' · ');

        const card = document.createElement('a');
        card.href = `vehicle.html?id=${rec.id}`;
        card.className = 'car-card carousel-card';
        card.innerHTML = `
          <img src="${img}" class="car-thumb">
          <div class="car-info">
            <h3>${f.Make_Model || ''}</h3>
            <p class="reg">${f.Registration || ''}</p>
            <p class="price">${price}</p>
            ${short ? `<p class="card-short-desc">${short}</p>` : ''}
            ${specLine ? `<p class="card-spec-line">${specLine}</p>` : ''}
          </div>
        `;
        carousel.appendChild(card);
      });
    }

    /* ----------- Populate Grid (Stock Page) ----------- */
    if (grid) {
      grid.innerHTML = '';

      cars.forEach(rec => {
        const f = rec.fields;
        const img = f.Photos?.[0]?.url || '';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : 'POA';
        const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : '';

        const short = f.Short_Description || '';
        const mot = f.MOT_Date || '';

        const specParts = [];
        if (mileage) specParts.push(mileage);
        if (mot) specParts.push(`MOT: ${mot}`);
        const specLine = specParts.join(' · ');

        const card = document.createElement('a');
        card.href = `vehicle.html?id=${rec.id}`;
        card.className = 'car-card';
        card.innerHTML = `
          <img src="${img}" class="car-thumb">
          <div class="car-info">
            <h3>${f.Make_Model || ''}</h3>
            <p class="reg">${f.Registration || ''}</p>
            <p class="price">${price}</p>
            ${short ? `<p class="card-short-desc">${short}</p>` : ''}
            ${specLine ? `<p class="card-spec-line">${specLine}</p>` : ''}
          </div>
        `;
        grid.appendChild(card);
      });
    }

  } catch (err) {
    console.error(err);

    if (grid) {
      grid.innerHTML = `<p style="color:red;text-align:center;">Failed to load stock.</p>`;
    }
  }
}
