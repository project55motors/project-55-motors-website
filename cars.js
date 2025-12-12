// cars.js — Public stock rendering (Project 55 Motors)

// RESPONSIBILITIES:

// - Fetch cars from /cars-api

// - Render homepage carousel (if present)

// - Render inventory grid (if present)

// - Display ESSENTIALS with SVG icons

// - Apply 2-car layout logic

//

// DOES NOT:

// - Touch admin

// - Touch vehicle.js

// - Touch SEO

// - Touch hero logic



const API_URL = "/cars-api";



document.addEventListener("DOMContentLoaded", () => {

    loadCars();

});



async function loadCars() {

    const carousel = document.getElementById("car-carousel");

    const grid = document.getElementById("car-grid");



    try {

        const res = await fetch(API_URL);

        if (!res.ok) throw new Error("cars-api failed");



        const data = await res.json();

        const records = Array.isArray(data) ? data : data.records || [];



        // Available cars only, sorted

        const cars = records

            .filter(r => (r.fields?.Status || "").toLowerCase() === "available")

            .sort((a, b) => {

                const ai = Number(a.fields?.Sort_Index ?? 999);

                const bi = Number(b.fields?.Sort_Index ?? 999);

                return ai - bi;

            });



        /* ---------------- Inventory Grid ---------------- */

        if (grid) {

            grid.innerHTML = "";



            // Apply 2-car layout class

            if (cars.length === 2) {

                grid.classList.add("two-cars");

            } else {

                grid.classList.remove("two-cars");

            }



            cars.forEach(rec => {

                grid.appendChild(buildCarCard(rec));

            });

        }



        /* ---------------- Homepage Carousel ---------------- */

        if (carousel) {

            carousel.innerHTML = "";

            cars.forEach(rec => {

                carousel.appendChild(buildCarCard(rec, true));

            });

        }



    } catch (err) {

        console.error("Error loading cars:", err);

        if (grid) {

            grid.innerHTML =

                "<p style='text-align:center;color:red;'>Failed to load stock.</p>";

        }

    }

}



/* =======================================================

   Card Builder

======================================================= */



function buildCarCard(record, isCarousel = false) {

    const f = record.fields || {};



    const photo = f.Photos?.[0];

    const image =

        photo?.thumbnails?.large?.url ||

        photo?.thumbnails?.small?.url ||

        photo?.url ||

        "";



    const card = document.createElement("a");

    card.href = `vehicle.html?id=${record.id}`;

    card.className = "car-card" + (isCarousel ? " carousel-card" : "");



    card.innerHTML = `

        <img src="${image}" alt="${escape(f.Make_Model || f.Registration || "Vehicle")}">



        <div class="car-info">

            <h3>${escape(f.Make_Model || "")}</h3>

            <p class="price">${formatPrice(f.Price)}</p>



            <div class="car-essentials">

                ${iconSpec("registration", f.Registration)}

                ${iconSpec("engine", f.Engine_size)}

                ${iconSpec("transmission", f.Transmission, true)}

                ${iconSpec("mileage", f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "")}

                ${iconSpec("mot", f.MOT_Date)}

                ${iconSpec("fuel", f.Fuel_type)}

            </div>



            ${f.Short_Description

                ? `<p class="car-short-desc">${escape(f.Short_Description)}</p>`

                : ""

            }

        </div>

    `;



    return card;

}



/* =======================================================

   Icon Helpers

======================================================= */



function iconSpec(type, value, isTransmission = false) {

    if (!value) return "";



    let icon = type;



    if (isTransmission) {

        icon = value.toLowerCase().includes("manual")

            ? "transmission-manual"

            : "transmission_auto";

    }



    return `

        <span class="spec">

            <img src="assets/icons/${icon}.svg" alt="">

            <span>${escape(value)}</span>

        </span>

    `;

}



/* =======================================================

   Utilities

======================================================= */



function formatPrice(price) {

    return price

        ? `£${Number(price).toLocaleString()}`

        : "POA";

}



function escape(str) {

    return String(str)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;");

}