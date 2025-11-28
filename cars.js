// cars.js – FINAL (uses /api/cars correctly)

const API = "/api/cars";

// Detect container automatically
const container =
  document.getElementById("stock-grid") ||
  document.getElementById("car-grid") ||
  document.getElementById("inventory") ||
  document.getElementById("cars");

if (container) {
  loadCars();
}

async function loadCars() {
  try {
    const res = await fetch(API);

    if (!res.ok) throw new Error("API error: " + res.status);

    const data = await res.json();

    if (!data.records || !Array.isArray(data.records)) {
      container.innerHTML = "<p>No vehicles found.</p>";
      return;
    }

    renderCars(data.records);

  } catch (err) {
    console.error("Cars API error:", err);
    container.innerHTML = "<p>Failed to load vehicles.</p>";
  }
}

function renderCars(records) {
  container.innerHTML = "";

  records.forEach((car) => {
    const f = car.fields;

    const image = f.Photos?.[0]?.url || "/images/placeholder.png";
    const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";
    const title = f.Make_Model || "Vehicle";
    const reg = f.Registration || "";

    const card = document.createElement("div");
    card.className = "car-card";

    card.innerHTML = `
      <img src="${image}" alt="${title}">
      <h3>${title}</h3>
      <p><strong>${reg}</strong></p>
      <p class="price">${price}</p>
    `;

    card.onclick = () => {
      window.location.href = `/car.html?id=${car.id}`;
    };

    container.appendChild(card);
  });
}
