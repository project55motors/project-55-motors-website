// car-page.js – FINAL

const API = "/api/cars";

const params = new URLSearchParams(window.location.search);
const recordId = params.get("id");

if (!recordId) {
  document.body.insertAdjacentHTML("beforeend", "<p>Car not found.</p>");
} else {
  loadCar(recordId);
}

async function loadCar(id) {
  try {
    const res = await fetch(API);
    const data = await res.json();

    const car = data.records.find((r) => r.id === id);

    if (!car) {
      throw new Error("Car not found");
    }

    renderCar(car.fields);
  } catch (err) {
    document.body.insertAdjacentHTML("beforeend", "<p>Error loading car</p>");
    console.error(err);
  }
}

function renderCar(f) {
  const image = f.Photos?.[0]?.url || "/images/placeholder.png";

  document.getElementById("car-image").src = image;
  document.getElementById("car-title").textContent = f.Make_Model;
  document.getElementById("car-price").textContent = `£${Number(f.Price).toLocaleString()}`;
  document.getElementById("car-reg").textContent = f.Registration;
  document.getElementById("car-mileage").textContent = f.Mileage;
  document.getElementById("car-mot").textContent = f.MOT_Date;
  document.getElementById("car-short").textContent = f.Short_Description;
  document.getElementById("car-desc").textContent = f.Full_Description;
}
