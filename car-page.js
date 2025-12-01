// car-page.js — FINAL (uses public cars-api and ?reg= in URL)

// Source of truth: https://project55motors.co.uk/cars-api
const API_URL = 'https://project55motors.co.uk/cars-api';

function getRegFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('reg');
}

async function loadCar() {
  const reg = getRegFromUrl();
  if (!reg) return;

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const cars = data.records || [];

    const car = cars.find(c => {
      const carReg = c.fields?.Registration || '';
      return (
        carReg.toLowerCase().replace(/\s+/g, '') ===
        reg.toLowerCase().replace(/\s+/g, '')
      );
    });

    if (!car) {
      document.body.innerHTML =
        '<h2 style="text-align:center;padding:3rem;">Car not found</h2>';
      return;
    }

    const f = car.fields || {};

    const mainImage = document.getElementById('main-image');
    const gallery = document.getElementById('gallery');
    const title = document.getElementById('car-title');
    const priceEl = document.getElementById('car-price');
    const mileageEl = document.getElementById('car-mileage');
    const descEl = document.getElementById('car-description');
    const regEl = document.getElementById('car-reg');

    const price = f.Price
      ? `£${Number(f.Price).toLocaleString()}`
      : 'POA';

    const mileage = f.Mileage
      ? `${Number(f.Mileage).toLocaleString()} miles`
      : '';

    if (title) title.textContent = f.Make_Model || '';
    if (priceEl) priceEl.textContent = price;
    if (mileageEl) mileageEl.textContent = mileage;
    if (descEl) descEl.textContent = f.Full_Description || '';
    if (regEl) regEl.textContent = f.Registration || '';

    if (
      mainImage &&
      Array.isArray(f.Photos) &&
      f.Photos.length
    ) {
      mainImage.src = f.Photos[0].url;

      if (gallery) {
        gallery.innerHTML = '';
        f.Photos.forEach(photo => {
          const img = document.createElement('img');
          img.src = photo.url;
          img.loading = 'lazy';
          img.addEventListener('click', () => {
            mainImage.src = photo.url;
          });
          gallery.appendChild(img);
        });
      }
    }
  } catch (err) {
    console.error('Error loading car:', err);
    const container = document.getElementById('car-page') || document.body;
    container.innerHTML =
      '<h2 style="text-align:center;padding:3rem;color:red;">Error loading car details.</h2>';
  }
}

document.addEventListener('DOMContentLoaded', loadCar);
