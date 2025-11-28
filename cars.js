// cars.js – FINAL (uses /api/cars only)

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('car-grid');
  if (!grid) return;

  const API = 'https://project55motors.co.uk/api/cars';

  grid.innerHTML = `<p style="text-align:center;width:100%;">Loading vehicles…</p>`;

  fetch(API)
    .then(res => res.json())
    .then(data => {
      if (!data.records || !data.records.length) {
        grid.innerHTML = `<p style="text-align:center;width:100%;">No vehicles found.</p>`;
        return;
      }

      grid.innerHTML = '';

      data.records.forEach(record => {
        const f = record.fields;

        const photo = f.Photos?.[0]?.url || '';
        const make = f.Make_Model || 'Vehicle';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : '';
        const reg = f.Registration || '';
        const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : '';

        const card = document.createElement('div');
        card.className = 'car-card';

        card.innerHTML = `
          <a href="detail.html?id=${record.id}">
            <div class="car-image">
              ${photo ? `<img src="${photo}" alt="${make}">` : ``}
            </div>

            <div class="car-info">
              <h3>${make}</h3>
              <p>${reg}</p>
              <strong>${price}</strong>
              <span>${mileage}</span>
            </div>
          </a>
        `;

        grid.appendChild(card);
      });
    })
    .catch(err => {
      console.error('Error loading cars:', err);
      grid.innerHTML = `
        <p style="color:red;text-align:center;width:100%;">
          Error loading vehicles
        </p>
      `;
    });
});
