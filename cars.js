// cars.js – FINAL (uses your live worker only)

const API_URL = "https://project55motors.co.uk/api/cars";



document.addEventListener("DOMContentLoaded", loadCars);



async function loadCars() {

  const grid = document.getElementById("car-grid");

  if (!grid) return;



  try {

    const res = await fetch(API_URL);

    const data = await res.json();



    if (!data.records || !data.records.length) {

      grid.innerHTML = "<p>No cars found.</p>";

      return;

    }



    grid.innerHTML = "";



    data.records.forEach(record => {

      const f = record.fields;



      const image = f.Photos?.[0]?.url || "placeholder.jpg";

      const price = f.Price ? "£" + f.Price.toLocaleString() : "POA";



      const card = document.createElement("a");

      card.href = `car.html?id=${record.id}`;

      card.className = "car-card";



      card.innerHTML = `

        <img src="${image}">

        <h3>${f.Make_Model || "Vehicle"}</h3>

        <p>${f.Registration || ""}</p>

        <strong>${price}</strong>

      `;



      grid.appendChild(card);

    });



  } catch (err) {

    console.error("Car load error:", err);

    grid.innerHTML = "<p>Error loading stock</p>";

  }

}