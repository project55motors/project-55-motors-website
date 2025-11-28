const MAIN_PHOTO = document.getElementById("main-photo");

const THUMB_STRIP = document.getElementById("thumb-strip");

const TITLE_EL = document.getElementById("car-title");

const PRICE_EL = document.getElementById("car-price");

const SPEC_EL = document.getElementById("car-specs");

const DESC_EL = document.getElementById("car-description");

const ERROR_EL = document.getElementById("car-error");



// Use the same Worker route as everywhere else

const WORKER_URL = "/api/cars";



// Get Airtable record ID

const CAR_ID = new URLSearchParams(window.location.search).get("id");



if (!CAR_ID) {

  if (ERROR_EL) ERROR_EL.textContent = "No car selected.";

  throw new Error("Missing ?id= in URL");

}



function formatPrice(value) {

  if (typeof value !== "number") return "";

  return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });

}



function setMainPhoto(url, alt) {

  if (!MAIN_PHOTO) return;

  MAIN_PHOTO.src = url;

  MAIN_PHOTO.alt = alt || "Vehicle photo";

}



async function loadCar() {

  try {

    const res = await fetch(`${WORKER_URL}?recordId=${encodeURIComponent(CAR_ID)}`);



    if (!res.ok) {

      const detail = await res.text().catch(() => "");

      throw new Error(

        `Worker responded with HTTP Status: ${res.status}${

          detail ? ` – ${detail}` : ""

        }`

      );

    }



    const data = await res.json();

    const record = data.records?.find(r => r.id === CAR_ID) || data;



    if (!record || !record.fields) {

      throw new Error("Car not found");

    }



    const f = record.fields;



    const makeModel = f.Make_Model || "Vehicle";

    const reg = f.Registration || "";

    const mileage = f.Mileage || 0;

    const price = f.Price || 0;

    const mot = f.MOT_Date || "";

    const engineSize = f.Engine_size || "";

    const fuelType = (f.Fuel_type && f.Fuel_type.join(", ")) || "";

    const status = f.Status || "Available";

    const desc = f.Full_Description || f.Short_Description || "";



    const photos = f.Photos || [];

    const main = photos[0]?.url;



    if (main) setMainPhoto(main, makeModel);



    if (THUMB_STRIP && photos.length > 1) {

      THUMB_STRIP.innerHTML = "";

      photos.forEach(p => {

        const img = document.createElement("img");

        img.src = p.thumbnails?.small?.url || p.url;

        img.alt = makeModel;

        img.loading = "lazy";

        img.addEventListener("click", () => setMainPhoto(p.url, makeModel));

        THUMB_STRIP.appendChild(img);

      });

    }



    if (TITLE_EL) TITLE_EL.textContent = `${makeModel} (${reg})`;

    if (PRICE_EL) PRICE_EL.textContent = price ? `£${formatPrice(price)}` : "";



    if (SPEC_EL) {

      SPEC_EL.innerHTML = `

        <li><strong>Registration:</strong> ${reg}</li>

        <li><strong>Mileage:</strong> ${formatPrice(mileage)} miles</li>

        <li><strong>MOT:</strong> ${mot || "TBC"}</li>

        <li><strong>Engine:</strong> ${engineSize || "—"}</li>

        <li><strong>Fuel:</strong> ${fuelType || "—"}</li>

        <li><strong>Status:</strong> ${status}</li>

      `;

    }



    if (DESC_EL) DESC_EL.textContent = desc;



  } catch (err) {

    console.error(err);

    if (ERROR_EL) {

      ERROR_EL.textContent =

        "Sorry, we couldn't load this vehicle. Please go back and try again.";

    }

  }

}



document.addEventListener("DOMContentLoaded", loadCar);