// vehicle.js — Vehicle detail page (Project 55 Motors)
//
// Uses the same cars-api endpoint as cars.js and finds a single record
// by its Airtable record id (?id=recXXXX).
//
// Shows:
//   • Large main image
//   • Scrollable thumbnail strip
//   • Registration, price, mileage, MOT, engine size, fuel type
//   • Full description with preserved line breaks

const API_URL = 'https://project55motors.co.uk/cars-api';

// URL param: ?id=recXXXX
const CAR_ID = new URLSearchParams(window.location.search).get('id');

const MAIN_PHOTO = document.getElementById('vehicle-main-photo');
const THUMBS = document.getElementById('vehicle-thumbnails');

// Fullscreen elements
const FULLSCREEN = document.getElementById('fullscreen-overlay');
const FULL_IMG = document.getElementById('fullscreen-image');

async function loadVehicle() {
  if (!CAR_ID) {
    console.error('No CAR_ID in URL');
    return;
  }

  try {
    const res = await fetch(API_URL, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error('cars-api returned ' + res.status);
    }

    const data = await res.json();
    let records = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (Array.isArray(data.records)) {
      records = data.records;
    }

    const rec = records.find(r => r.id === CAR_ID);
    if (!rec) {
      console.error('Vehicle not found for id:', CAR_ID);
      document.getElementById('vehicle-title').textContent =
        'Vehicle not found';
      return;
    }

    const f = rec.fields || {};

    // TITLE
    document.getElementById('vehicle-title').textContent =
      f.Make_Model || f.Registration || 'Vehicle';

    // SPEC FIELDS
    document.getElementById('spec-reg').textContent =
      f.Registration || '';

    document.getElementById('spec-price').textContent = f.Price
      ? `£${Number(f.Price).toLocaleString()}`
      : 'POA';

    document.getElementById('spec-mileage').textContent = f.Mileage
      ? `${Number(f.Mileage).toLocaleString()} miles`
      : '';

    document.getElementById('spec-mot').textContent = f.MOT_Date || '';
    document.getElementById('spec-engine').textContent =
      f.Engine_size || '';
    document.getElementById('spec-fuel').textContent =
      f.Fuel_type || '';

    // FULL DESCRIPTION (preserve line breaks)
    const desc = (f.Full_Description || '').replace(/\n/g, '<br>');
    document.getElementById('vehicle-description').innerHTML =
      desc ? `<p>${desc}</p>` : '';

    // PHOTOS
    const photos = Array.isArray(f.Photos) ? f.Photos : [];
    if (photos.length) {
      const firstPhoto =
        photos[0].thumbnails?.large?.url ||
        photos[0].thumbnails?.small?.url ||
        photos[0].url;
      if (firstPhoto) {
        MAIN_PHOTO.src = firstPhoto;
      }
    }

    // Build thumbnails
    THUMBS.innerHTML = '';
    photos.forEach((p, index) => {
      const url =
        p.thumbnails?.large?.url ||
        p.thumbnails?.small?.url ||
        p.url;

      if (!url) return;

      const t = document.createElement('img');
      t.src = url;
      t.className = 'vehicle-thumb';
      if (index === 0) t.classList.add('active');

      t.addEventListener('click', () => {
        MAIN_PHOTO.src = url;

        // update active state
        document
          .querySelectorAll('.vehicle-thumb')
          .forEach(el => el.classList.remove('active'));
        t.classList.add('active');
      });

      THUMBS.appendChild(t);
    });

    // Click to open full screen
    MAIN_PHOTO.addEventListener('click', () => {
      if (!MAIN_PHOTO.src) return;
      FULL_IMAGESHOW(MAIN_PHOTO.src);
    });
  } catch (err) {
    console.error('Error loading vehicle:', err);
  }
}

function FULL_IMAGESHOW(src) {
  FULL_IMG.src = src;
  FULLSCREEN.style.display = 'flex';
}

FULLSCREEN.addEventListener('click', () => {
  FULLSCREEN.style.display = 'none';
});

loadVehicle();
