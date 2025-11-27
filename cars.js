// cars.js – FINAL (uses /api/cars only)



const CARS_API = "https://project55motors.co.uk/api/cars";



document.addEventListener("DOMContentLoaded", async () => {

  const grid = document.getElementById("car-grid");

  if (!grid) return;



  try {

    const res = await fetch(CARS_API);



    if (!res.ok) {

      throw new Error(`API error: ${res.status}`);

    }



    const data = await res.json();

    const records = data.records || [];



    if (records.length === 0) {

      grid.innerHTML = "<p>No vehicles available</p>";

      return;

    }



    grid.innerHTML = records.map(r => {

      const f = r.fields;

      const img = f.Photos?.[0]?.url || "";

      const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";



      return `

        <div class="car-card">

          <a href="/detail.html?id=${r.id}">

            <img src="${img}" alt="${f.Make_Model || ""}">

          </a>

          <h3>${f.Make_Model || ""}</h3>

          <p>${price}</p>

          <span>View details →</span>

        </div>

      `;

    }).join("");



  } catch (err) {

    console.error("CARS LOAD ERROR:", err);

    grid.innerHTML = "<p>Error loading vehicles</p>";

  }

});