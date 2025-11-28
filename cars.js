// cars.js – FINAL VERSION FOR PROJECT 55 MOTORS

const API = "https://project55motors.co.uk/api/cars";

async function loadCars() {
  const grid = document.getElementById("car-grid");

  if (!grid) {
    console.warn("car-grid not found on this page");
    return;
  }

  try {
    const res = await fetch(API);
    const data = await res.json();

    if (!data.records || !data.records.length) {
      grid.innerHTML = "<p>No vehicles currently available.</p>";
      return;
    }

    grid.innerHTML = "";

    data.records.forEach(record => {
      const f = record.fields;

      const image = f.Photos?.[0]?.url || "images/placeholder.png";
      const make = f.Make_Model || "Vehicle";
      const reg = f.Registration || "—";
      const mot = f.MOT_Date || "—";
      const mileage = f.Mileage ? f.Mileage.toLocaleString() + " miles" : "—";
      const price = f.Price ? "£" + Number(f.Price).toLocaleString() : "—";
      const desc = f.Short_Description || "";

      const card = document.createElement("a");
      card.href = `/car.html?id=${record.id}`;
      card.className = "car-card";

      card.innerHTML = `
        <div class="car-image">
          <img src="${image}" alt="${make}">
        </div>

        <div class="car-content">
          <h3>${make}</h3>

          <div class="car-specs">
            <div>
              <strong>Reg:</strong> ${reg}<br>
              <strong>MOT:</strong> ${mot}
            </div>
            <div>
              <strong>Miles:</strong> ${mileage}<br>
              <strong>Price:</strong> ${price}
            </div>
          </div>

          <p class="car-desc">${desc}</p>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Cars load error:", err);
    grid.innerHTML = "<p style='color:red'>Error loading stock.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadCars);
