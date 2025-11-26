// cars.js – loads cars from Airtable via Cloudflare Worker (FINAL FIXED)

async function loadCars() {

  const grid = document.getElementById('car-grid');
  if (!grid) return;

  try {
    // ✅ CORRECT WORKING ENDPOINT
    const response = await fetch('https://api.project55motors.co.uk');

    if (!response.ok) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:#c00;">
          Error loading stock. Status: ${response.status}.
        </p>`;
      return;
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;">
          No vehicles currently listed.
        </p>`;
      return;
    }

    // only show available
    const availableCars = data.records.filter(c => c.fields.Status !== "Sold");

    grid.innerHTML = "";

    availableCars.forEach(car => {
      const f = car.fields;

      // Safely grab first image
      let image = 'placeholder.jpg';

      if (f.Photos && f.Photos.length > 0 && f.Photos[0].url) {
        image = f.Photos[0].url;
      }

      const price = f.Price
        ? `£${Number(f.Price).toLocaleString()} ono`
        : "POA";

      const mot = f.MOT_Date
        ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : "N/A";

      const mileage = f.Mileage
        ? Number(f.Mileage).toLocaleString()
        : "N/A";

      const card = document.createElement("a");
      card.href = `/car.html?id=${car.id}`;
      card.className = "car-card";

      card.innerHTML = `
        <img src="${image}" alt="${f.Make_Model || "Car"}">

        <div class="car-details">
          <h2>${f.Make_Model || "Vehicle"}</h2>
          <p>${f.Short_Description || ""}</p>

          <div class="specs">
            <div>
              <strong>Reg</strong><br>
              ${f.Registration || "N/A"}
            </div>

            <div>
              <strong>Mileage</strong><br>
              ${mileage}
            </div>

            <div>
              <strong>MOT</strong><br>
              ${mot}
            </div>

            <div>
              <strong>Price</strong><br>
              ${price}
            </div>
          </div>

          <div class="cta" style="margin-top:1rem;">
            View Full Details →
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Cars load error:", err);

    grid.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:#c00;">
        We are currently updating our stock list. Please check back shortly.
      </p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", loadCars);
