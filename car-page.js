// car-page.js – FINAL (uses /api/cars only)



const CARS_API = "https://project55motors.co.uk/api/cars";



document.addEventListener("DOMContentLoaded", async () => {



  const params = new URLSearchParams(window.location.search);

  const id = params.get("id");



  if (!id) return;



  try {

    const res = await fetch(CARS_API);



    if (!res.ok) {

      throw new Error(`API error: ${res.status}`);

    }



    const data = await res.json();

    const record = data.records.find(r => r.id === id);



    if (!record) {

      document.body.innerHTML = "<h2>Vehicle not found</h2>";

      return;

    }



    const f = record.fields;



    const img = f.Photos?.[0]?.url || "";

    const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";



    document.getElementById("car-title").textContent = f.Make_Model || "";

    document.getElementById("car-price").textContent = price;

    document.getElementById("car-image").src = img;

    document.getElementById("car-desc").textContent = f.Full_Description || "";



  } catch (err) {

    console.error("CAR PAGE ERROR:", err);

  }



});