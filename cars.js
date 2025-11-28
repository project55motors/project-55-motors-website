// cars.js — FINAL (uses /api/cars on your domain)



const API_URL = 'https://project55motors.co.uk/api/cars';



document.addEventListener('DOMContentLoaded', loadCars);



async function loadCars() {

  const grid = document.getElementById('car-grid');

  if (!grid) return;



  try {

    const res = await fetch(API_URL, { cache: 'no-store' });



    if (!res.ok) {

      throw new Error(`API error ${res.status}`);

    }



    const data = await res.json();

    const records = data.records || [];



    grid.innerHTML = '';



    if (!records.length) {

      grid.innerHTML =

        '<p style="text-align:center;">No cars available at the moment.</p>';

      return;

    }



    const path = window.location.pathname;

    const isHome =

      path === '/' ||

      path === '/index.html';



    // Remove sold cars first

    const available = records.filter(rec => {

      const status = rec.fields?.Status;

      return !status || status.toLowerCase() !== 'sold';

    });



    const carsToShow = isHome ? available.slice(0, 3) : available;



    carsToShow.forEach(rec => {

      const f = rec.fields || {};



      const img = (Array.isArray(f.Photos) && f.Photos[0]?.url) || '';

      const title = f.Make_Model || '';

      const reg = f.Registration || '';



      const price = f.Price

        ? `£${Number(f.Price).toLocaleString()}`

        : 'POA';



      const mileage = f.Mileage

        ? `${Number(f.Mileage).toLocaleString()} miles`

        : '';



      const short = f.Short_Description || '';



      const regParam = encodeURIComponent(reg.replace(/\s+/g, ''));



      const card = document.createElement('a');

      card.className = 'car-card';

      card.href = `car.html?reg=${regParam}`;



      card.innerHTML = `

        <img src="${img}" loading="lazy" alt="${title}">

        <div class="car-info">

          <h3>${title}</h3>

          <p class="reg">${reg}</p>

          <p class="price">${price}</p>

          ${mileage ? `<p class="miles">${mileage}</p>` : ''}

          ${short ? `<p class="desc">${short}</p>` : ''}

        </div>

      `;



      grid.appendChild(card);

    });

  } catch (err) {

    console.error('Error loading cars:', err);

    grid.innerHTML =

      '<p style="text-align:center;color:red;">Failed to load stock.</p>';

  }

}