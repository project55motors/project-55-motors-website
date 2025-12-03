document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("car-grid");
    if (!grid) return;

    const res = await fetch("https://project55motors.co.uk/api");
    const cars = await res.json();

    grid.innerHTML = "";

    cars.forEach(car => {
        const div = document.createElement("div");
        div.className = "car-card";
        div.innerHTML = `
            <img src="${car.Photos?.[0] ?? 'assets/placeholder.jpg'}" class="car-card-img">
            <h3>${car.Title}</h3>
            <p class="reg">${car.Registration}</p>
            <p class="price">£${car.Price.toLocaleString()}</p>
            <p class="mini">${car.Mileage} miles · MOT: ${car.MOT}</p>
        `;

        div.onclick = () => {
            window.location.href = `vehicle.html?id=${car.id}`;
        };

        grid.appendChild(div);
    });
});
