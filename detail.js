// detail.js — FINAL

// ✅ Source of truth: https://project55motors.co.uk/api/cars



const API_URL = 'https://project55motors.co.uk/api/cars';



async function loadCars() {

  const grid = document.getElementById('car-grid');

  if (!grid) return;



  try {

    const res = await fetch(API_URL);

    const data = await res.json();

    const records = data.records || [];



    grid.innerHTML = '';



    if (!records.length) {

      grid.innerHTML = '<p style="text-align:center;">No cars available</p>';

      return;

    }



    records.forEach(car => {

      const f = car.fields;



      if (f.Status && f.Status.toLowerCase() === 'sold') return;



      const img = f.Photos?.[0]?.url || '';



      const reg = encodeURIComponent(f.Registration || '');



      const card = document.createElement('a');

      card.className = 'car-card';

      card.href = `car.html?reg=${reg}`;



      card.innerHTML = `

        <img src="${img}" loading="lazy">

        <div class="car-info">

          <h3>${f.Make_Model || ''}</h3>

          <p><strong>£${Number(f.Price || 0).toLocaleString()}</strong></p>

          <p>${Number(f.Mileage || 0).toLocaleString()} miles</p>

        </div>

      `;



      grid.appendChild(card);

    });



  } catch (err) {

    console.error('Error loading cars:', err);

    grid.innerHTML = '<p style="text-align:center;color:red;">Failed to load stock</p>';

  }

}



document.addEventListener('DOMContentLoaded', loadCars);