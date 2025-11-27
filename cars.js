// cars.js – FINAL STABLE VERSION FOR PROJECT 55 MOTORS



const API = "https://project55motors.co.uk/api";



async function loadCars() {

  try {

    const res = await fetch(API, { cache: "no-store" });



    if (!res.ok) throw new Error("API error " + res.status);



    const data = await res.json();



    const container =

      document.getElementById("cars") ||

      document.getElementById("inventory") ||

      document.getElementById("stock-grid");



    if (!container) {

      console.warn("No car container found");

      return;

    }



    container.innerHTML = "";



    data.records.forEach((rec) => {



      const f = rec.fields;



      if (f.Status === "Sold") return;



      const image =

        f.Photos?.[0]?.url ||

        f.Photo?.[0]?.url ||

        "https://via.placeholder.com/600x400?text=No+Image";



      const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";

      const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—";

      const title = f.Make_Model || "Vehicle";

      const reg = f.Registration || "";

      const desc = f.Short_Description || "";



      const html = `

        <a href="car.html?id=${rec.id}" class="car-card">

          <div class="car-image">

            <img src="${image}" alt="${title}">

          </div>

          <div class="car-details">

            <h3>${title}</h3>

            <p class="reg">${reg}</p>

            <p class="price">${price}</p>

            <p class="miles">${mileage}</p>

            <p class="desc">${desc}</p>

          </div>

        </a>

      `;



      container.insertAdjacentHTML("beforeend", html);



    });



  } catch (err) {

    console.error("Cars load error:", err);

  }

}



document.addEventListener("DOMContentLoaded", loadCars);