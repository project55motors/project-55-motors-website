// car-page.js – FINAL

const API_URL = "https://project55motors.co.uk/api/cars";



const params = new URLSearchParams(window.location.search);

const carId = params.get("id");



document.addEventListener("DOMContentLoaded", loadCar);



async function loadCar() {

  if (!carId) return;



  try {

    const res = await fetch(API_URL);

    const data = await res.json();



    const car = data.records.find(r => r.id === carId);

    if (!car) return;



    const f = car.fields;



    document.getElementById("car-title").innerText = f.Make_Model;

    document.getElementById("car-price").innerText =

      f.Price ? "£" + f.Price.toLocaleString() : "POA";

    document.getElementById("car-desc").innerText =

      f.Full_Description || "";



    const mainImage = document.getElementById("main-image");

    if (f.Photos?.length) mainImage.src = f.Photos[0].url;



  } catch (e) {

    console.error("Detail error:", e);

  }

}