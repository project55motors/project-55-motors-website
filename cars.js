// cars.js — PUBLIC STOCK DISPLAY



const API_URL = "https://project55motors.co.uk/cars-api/";



document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("car-grid")) loadCars();

});



async function loadCars() {

    const grid = document.getElementById("car-grid");

    if (!grid) return;



    try {

        const res = await fetch(API_URL, { cache: "no-store" });

        if (!res.ok) throw new Error("API error");



        const data = await res.json();

        const records = data.records || [];



        grid.innerHTML = "";



        if (!records.length) {

            grid.innerHTML = `<p>No vehicles currently available.</p>`;

            return;

        }



        records.forEach(rec => {

            const f = rec.fields;

            const img = f.Photos?.[0]?.url || "";

            const title = f.Make_Model || "";

            const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";



            const card = document.createElement("a");

            card.className = "car-card";

            card.href = `vehicle.html?id=${rec.id}`; // FIXED



            card.innerHTML = `

                <img src="${img}" alt="${title}">

                <div class="info">

                    <h3>${title}</h3>

                    <p>${price}</p>

                </div>

            `;



            grid.appendChild(card);

        });



    } catch (err) {

        console.error(err);

        grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;

    }

}