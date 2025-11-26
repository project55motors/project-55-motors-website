// cars.js – loads cars from Cloudflare Worker (Airtable proxy)
// Correct Worker URL: https://cars-api.nathan-ed2.workers.dev

async function loadCars() {
  const grid = document.getElementById('car-grid');

  if (!grid) {
    console.warn("car-grid not found. Skipping loadCars.");
    return;
  }

  try {
    // ✅ CORRECT ENDPOINT
    const response = await fetch('https://cars-api.nathan-ed2.workers.dev', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Worker responded with HTTP ${response.status}`);
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#c00;">Error loading stock. Status: ${response.status}.</p>`;
      return;
    }

    const data = await response.json();

    if (!data.records || !data.records.length) {
      grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;'>No vehicles found.</p>";
      return;
    }

    // ✅ Only show available cars
    const availableCars = data.records.filter(car => car.fields.Status !== "Sold");

    grid.innerHTML = '';

    availableCars.forEach(car => {
      const f = car.fields;

      // Clean up photos
      let photos = f.Photos || [];
      const uniquePhotos = [];
      const seenUrls = new Set();

      photos.forEach(p => {
        if (p.url && !seenUrls.has(p.url)) {
          uniquePhotos.push(p);
          seenUrls.add(p.url);
        }
      });

      const mainPhoto = uniquePhotos[0]?.url || 'placeholder.jpg';
      const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : 'POA';
      const mileage = f.Mileage ? f.Mileage.toLocaleString() : 'N/A';
      const reg = f.Registration || 'N/A';

      const mot = f.MOT_Date
        ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : 'N/A';

      // Link to full car page
      const card = document.createElement('a');
      card.href = `/car.html?id=${car.id}`;
      card.className = 'car-card';

      card.innerHTML = `
        <img src="${mainPhoto}" alt="${f.Make_Model || 'Car'}" />
        <div class="car-details">
          <h2>${f.Make_Model || 'Unknown Model'}</h2>
          <p>${f.Short_Description || ''}</p>
          <div class="specs">
            <div><strong>Reg</strong><br>${reg}</div>
            <div><strong>Mileage</strong><br>${mileage}</div>
            <div><strong>MOT</strong><br>${mot}</div>
            <div><strong>Price</strong><br>${price}</div>
          </div>
          <div class="cta" style="margin-top:1rem;">View Full Details →</div>
        </div>
      `;

      grid.appendChild(card);
    });

    // ✅ Add “Coming Soon” fillers on main page only
    if (grid.parentElement.querySelector('a[href="/inventory.html"]')) {
      const totalCards = availableCars.length;

      for (let i = totalCards; i < 3; i++) {
        const comingSoon = document.createElement('div');
        comingSoon.className = 'car-card';
        comingSoon.style.opacity = '0.7';

        comingSoon.innerHTML = `
          <div style="background:#f0f0f0;height:300px;display:flex;align-items:center;justify-content:center;border-radius:18px 18px 0 0;">
            <p style="font-size:1.4rem;color:#999;">Coming Soon</p>
          </div>
          <div class="car-details">
            <h2 style="color:#999;">New Arrival</h2>
            <p style="color:#999;">Currently being prepared</p>
            <div class="specs" style="visibility:hidden;"></div>
          </div>
        `;

        grid.appendChild(comingSoon);
      }
    }

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    grid.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:#c00;">
        We are currently updating our stock. Please try again shortly.
      </p>`;
  }
}

// Required to run script
document.addEventListener('DOMContentLoaded', loadCars);
