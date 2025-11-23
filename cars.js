const CAR_GRID = document.getElementById("car-grid");
const WORKER_URL = "https://cars-api.nathan-ed2.workers.dev";

async function fetchCars() {
    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            CAR_GRID.innerHTML = "<p>No cars in stock at the moment.</p>";
            return;
        }

        CAR_GRID.innerHTML = "";

        data.records.forEach(record => {
            const f = record.fields;

            const card = document.createElement("a");
            card.href = `/inventory.html?id=${record.id}`;
            card.className = "car-card";

            const imgSrc = f.Photos?.[0]?.url || "placeholder.jpg";

            card.innerHTML = `
                <img src="${imgSrc}" alt="${f.Make_Model || "Vehicle"}">

                <div class="car-details">
                    <h2>${f.Make_Model || "Vehicle"}</h2>
                    <p>${f.Short_Description || ""}</p>

                    <div class="specs">
                        <div><strong>Reg</strong><br>${f.Registration || ""}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage || ""}</div>
                        <div><strong>MOT</strong><br>${f.MOT_Date || ""}</div>
                        <div><strong>Price</strong><br>£${f.Price || ""}</div>
                    </div>
                </div>
            `;

            CAR_GRID.appendChild(card);
        });

    } catch (err) {
        CAR_GRID.innerHTML = "<p>Error loading vehicles.</p>";
        console.error(err);
    }
}

fetchCars();
