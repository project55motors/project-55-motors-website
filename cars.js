// cars.js – Fixed & working version (Cloudflare + Airtable)

// Function to handle image switching (needs to be global)
function switchMainPhoto(element, url) {
  const modalContent = element.closest('.modal-content');
  if (!modalContent) return;

  const viewer = modalContent.querySelector('.gallery-main-viewer img');
  if (viewer) {
    viewer.src = url;
  }

  modalContent.querySelectorAll('.gallery-thumbnail-strip img').forEach(img => {
    img.classList.remove('active');
  });
  element.classList.add('active');
}

async function loadCars() {
  const grid = document.getElementById('car-grid');
  if (!grid) {
    console.warn("car-grid element not found. Exiting loadCars.");
    return;
  }

  try {

    // ✅ CORRECT WORKING ENDPOINT
    const response = await fetch('https://cars-api.nathan-ed2.workers.dev');

    if (!response.ok) {
      console.error(`Worker responded with HTTP ${response.status}`);
      grid.innerHTML = `<p style='grid-column:1/-1;text-align:center;color:#c00;'>Error loading stock. Status: ${response.status}.</p>`;
      return;
    }

    const data = await response.json();

    // Only active cars
    const availableCars = data.records.filter(car => car.fields.Status !== "Sold");

    grid.innerHTML = '';

    availableCars.forEach((car) => {
      const f = car.fields;

      // Get unique photos only
      let photos = f.Photos || [];
      const uniquePhotos = [];
      const seenUrls = new Set();

      photos.forEach(p => {
        if (p.url && !seenUrls.has(p.url)) {
          uniquePhotos.push(p);
          seenUrls.add(p.url);
        }
      });
      photos = uniquePhotos;

      const mainPhotoUrl = photos[0]?.url || 'placeholder.jpg';

      const price   = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
      const mot     = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';
      const reg     = f.Registration || 'N/A';
      const mileage = f.Mileage ? Number(f.Mileage).toLocaleString() : 'N/A';

      // Each card links to: /car.html?id=xxxx
      const card = document.createElement('a');
      card.href = `/car.html?id=${car.id}`;
      card.className = 'car-card';

      card.innerHTML = `
        <img src="${mainPhotoUrl}" alt="${f.Make_Model || 'Vehicle'}">
        <div class="car-details">
          <h2>${f.Make_Model || 'Vehicle'}</h2>
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

    // Optional "Coming Soon" filler cards (kept from your original design)
    const totalCards = availableCars.length;

    if (grid.parentElement.querySelector('a[href="/inventory.html"]')) {
      for (let i = totalCards; i < 3; i++) {

        const comingSoonCard = document.createElement('div');
        comingSoonCard.className = 'car-card';
        comingSoonCard.style.opacity = '0.7';

        comingSoonCard.innerHTML = `
          <div style="background:#f0f0f0;height:300px;display:flex;align-items:center;justify-content:center;border-radius:18px 18px 0 0;">
            <p style="font-size:1.4rem;color:#999;">Coming Soon</p>
          </div>

          <div class="car-details">
            <h2 style="color:#999;">An exceptional vehicle</h2>
            <p style="color:#999;">Hand-selected and prepared to the same exacting standards.</p>
            <div class="specs" style="visibility:hidden;"></div>
          </div>
        `;

        grid.appendChild(comingSoonCard);
      }
    }

  } catch (err) {
    console.error("CRITICAL FETCH/PARSING ERROR:", err);

    if (grid) {
      grid.innerHTML = `
        <p style='grid-column:1/-1;text-align:center;color:#c00;'>
          We are currently updating our stock list. Please check back shortly.
        </p>
      `;
    }
  }
}

// REQUIRED to start on page load
document.addEventListener('DOMContentLoaded', loadCars);
