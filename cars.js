// cars.js – FINAL layout version for Project 55 Motors

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

        const photo   = f.Photos?.[0]?.url || '';
        const make    = f.Make_Model || 'Vehicle';
        const reg     = f.Registration || '—';
        const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : '—';
        const price   = f.Price ? `£${Number(f.Price).toLocaleString()}` : '—';
        const mot     = f.MOT_Date || '—';
        const desc    = f.Short_Description || '';

        const card = document.createElement('div');
        card.className = 'car-card';

        card.innerHTML = `
          <a href="detail.html?id=${record.id}" style="text-decoration:none;color:inherit;">

            <div class="car-image">
              ${photo ? `<img src="${photo}" alt="${make}">` : ``}
            </div>

            <div class="car-info">

              <h3 style="font-weight:700;margin-bottom:0.6rem;">
                ${make}
              </h3>

              <div class="car-spec-grid" style="
                display:grid;
                grid-template-columns: 1fr 1fr;
                gap:0.4rem 1.2rem;
                margin-bottom:0.8rem;
                font-size:0.95rem;
              ">

                <div><strong>Reg:</strong> ${reg}</div>
                <div><strong>Price:</strong> ${price}</div>

                <div><strong>MOT:</strong> ${mot}</div>
                <div><strong>Mileage:</strong> ${mileage}</div>

              </div>

              ${desc ? `
                <div style="
                  border-top:1px solid #e5e7eb;
                  margin-top:0.6rem;
                  padding-top:0.6rem;
                  font-size:0.9rem;
                  color:#374151;
                ">
                  ${desc}
                </div>
              ` : ''}

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
