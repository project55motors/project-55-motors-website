// car-page.js — FINAL

// ✅ Source of truth: https://project55motors.co.uk/api/cars



const API_URL = 'https://project55motors.co.uk/api/cars';



function getRegFromUrl() {

  const params = new URLSearchParams(window.location.search);

  return params.get('reg');

}



async function loadCar() {

  const reg = getRegFromUrl();

  if (!reg) return;



  try {

    const res = await fetch(API_URL);

    const data = await res.json();

    const cars = data.records || [];



    const car = cars.find(c =>

      c.fields?.Registration?.toLowerCase().replace(/\s+/g, '') ===

      reg.toLowerCase().replace(/\s+/g, '')

    );



    if (!car) {

      document.body.innerHTML = `<h2 style="text-align:center;padding:3rem;">Car not found</h2>`;

      return;

    }



    const f = car.fields;



    const mainImage = document.getElementById('main-image');

    const gallery = document.getElementById('gallery');

    const title = document.getElementById('car-title');

    const price = document.getElementById('car-price');

    const mileage = document.getElementById('car-mileage');

    const description = document.getElementById('car-description');



    title.textContent = f.Make_Model || '';

    price.textContent = f.Price ? `£${Number(f.Price).toLocaleString()}` : '';

    mileage.textContent = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : '';

    description.textContent = f.Full_Description || '';



    if (Array.isArray(f.Photos) && f.Photos.length) {

      mainImage.src = f.Photos[0].url;



      f.Photos.forEach(photo => {

        const img = document.createElement('img');

        img.src = photo.url;

        img.loading = "lazy";

        img.addEventListener('click', () => {

          mainImage.src = photo.url;

        });

        gallery.appendChild(img);

      });

    }



  } catch (err) {

    console.error('Error loading car:', err);

  }

}



document.addEventListener('DOMContentLoaded', loadCar);