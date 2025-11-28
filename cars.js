// cars.js – FINAL USING /api/cars



// Single source of truth for the API

const API_URL = "/api/cars";



// Elements on the homepage

const stockStatusEl = document.getElementById("stock-status");

const stockCountEl = document.getElementById("stock-count");



// Elements on inventory / stock page (if present)

const inventoryGrid = document.getElementById("inventory-grid");

const inventoryError = document.getElementById("inventory-error");



/* ──────────────────────────────────────────────

   Helper: Fetch cars JSON from Worker

────────────────────────────────────────────── */



async function fetchCars() {

  const res = await fetch(API_URL, { method: "GET" });



  if (!res.ok) {

    const detail = await res.text().catch(() => "");

    throw new Error(

      `Worker responded with HTTP Status: ${res.status}${

        detail ? ` – ${detail}` : ""

      }`

    );

  }



  const data = await res.json();

  return data.records || [];

}



/* ──────────────────────────────────────────────

   HOMEPAGE: show number of available cars

────────────────────────────────────────────── */



async function initHomepageStock() {

  if (!stockStatusEl || !stockCountEl) return; // Not on homepage



  stockStatusEl.textContent = "Loading current stock…";



  try {

    const records = await fetchCars();



    // Count records that are NOT Sold

    const available = records.filter(r => {

      const status = r.fields?.Status;

      return status && status !== "Sold";

    });



    stockCountEl.textContent = available.length.toString();

    stockStatusEl.textContent = "";



  } catch (err) {

    console.error(err);

    stockStatusEl.textContent = "Error loading stock. Status: 502.";

  }

}



/* ──────────────────────────────────────────────

   INVENTORY PAGE: big card layout

────────────────────────────────────────────── */



function formatPrice(value) {

  if (typeof value !== "number") return "";

  return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });

}



function createCarCard(record) {

  const f = record.fields || {};



  const photo = f.Photos?.[0]?.url || "";

  const makeModel = f.Make_Model || "Vehicle";

  const reg = f.Registration || "";

  const mileage = f.Mileage || 0;

  const price = f.Price || 0;

  const mot = f.MOT_Date || "";

  const status = f.Status || "Available";

  const shortDesc = f.Short_Description || "";

  const engineSize = f.Engine_size || "";

  const fuelType = (f.Fuel_type && f.Fuel_type.join(", ")) || "";



  const card = document.createElement("article");

  card.className = "car-card";



  card.innerHTML = `

    <a href="car.html?id=${encodeURIComponent(record.id)}" class="car-card-link">

      <div class="car-card-image-wrapper">

        ${

          photo

            ? `<img src="${photo}" alt="${makeModel}" loading="lazy" class="car-card-image">`

            : `<div class="car-card-placeholder">

                 <img src="car-placeholder.svg" alt="Car silhouette">

               </div>`

        }

      </div>



      <div class="car-card-body">

        <header class="car-card-header">

          <h2>${makeModel}</h2>

          <p class="car-card-price">£${formatPrice(price)}</p>

        </header>



        <p class="car-card-reg">${reg}</p>



        <dl class="car-card-specs">

          <div>

            <dt>Mileage</dt>

            <dd>${formatPrice(mileage)} miles</dd>

          </div>

          <div>

            <dt>MOT</dt>

            <dd>${mot || "TBC"}</dd>

          </div>

          <div>

            <dt>Engine</dt>

            <dd>${engineSize || "—"}</dd>

          </div>

          <div>

            <dt>Fuel</dt>

            <dd>${fuelType || "—"}</dd>

          </div>

        </dl>



        <p class="car-card-short">

          ${shortDesc || "More information coming soon."}

        </p>



        <p class="car-card-status status-${status.toLowerCase()}">

          ${status}

        </p>

      </div>

    </a>

  `;



  return card;

}



async function initInventoryPage() {

  if (!inventoryGrid) return; // Not on inventory/stock page



  inventoryGrid.innerHTML = `

    <p class="loading-message">Loading stock…</p>

  `;



  try {

    const records = await fetchCars();



    // Only show cars that are not Hidden and not Sold

    const visible = records.filter(r => {

      const status = r.fields?.Status;

      return status && status !== "Hidden" && status !== "Sold";

    });



    if (!visible.length) {

      inventoryGrid.innerHTML = `

        <p class="loading-message">

          No vehicles currently in stock. Please check back soon.

        </p>

      `;

      return;

    }



    inventoryGrid.innerHTML = "";

    visible.forEach(record => {

      inventoryGrid.appendChild(createCarCard(record));

    });



  } catch (err) {

    console.error(err);

    if (inventoryError) {

      inventoryError.textContent =

        "We couldn't load the current stock. Please try again later.";

    }

    inventoryGrid.innerHTML = "";

  }

}



/* ──────────────────────────────────────────────

   Boot

────────────────────────────────────────────── */



document.addEventListener("DOMContentLoaded", () => {

  initHomepageStock();

  initInventoryPage();

});