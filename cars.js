// cars.js – FINAL CLEAN VERSION



const API = "https://project55motors.co.uk/api/cars";

const container = document.getElementById("car-list");



async function loadCars() {

  try {

    const res = await fetch(API);

    const data = await res.json();



    if (!data.records || !Array.isArray(data.records)) {

      container.innerHTML = "<p>No cars found.</p>";

      return;

    }



    container.innerHTML = "";



    data.records.forEach(record => {

      const f = record.fields;



      const image = f.Photos?.[0]?.url || "no-image.png";



      const card = document.createElement("div");

      card.className = "car-card";



      card.innerHTML = `

        <img src="${image}" alt="${f.Make_Model || ''}">

        <h3>${f.Make_Model || ''}</h3>

        <p>${f.Registration || ''}</p>

        <p>£${f.Price || ''}</p>

        <a href="detail.html?id=${record.id}">View</a>

      `;



      container.appendChild(card);

    });



  } catch (err) {

    console.error(err);

    container.innerHTML = "<p>Error loading cars.</p>";

  }

}



document.addEventListener("DOMContentLoaded", loadCars);