document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const res = await fetch("https://project55motors.co.uk/api");
    const cars = await res.json();
    const car = cars.find(c => c.id === id);

    if (!car) return;

    document.getElementById("vehicle-main-photo").src = car.Photos[0];
    document.getElementById("vehicle-title").textContent = car.Title;

    document.getElementById("spec-reg").textContent = car.Registration;
    document.getElementById("spec-mileage").textContent = car.Mileage;
    document.getElementById("spec-engine").textContent = car.Engine_size;
    document.getElementById("spec-fuel").textContent = car.Fuel_type;
    document.getElementById("spec-mot").textContent = car.MOT;
    document.getElementById("spec-price").textContent = "£" + car.Price.toLocaleString();

    // thumbnails
    const thumbContainer = document.getElementById("vehicle-thumbnails");
    car.Photos.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.className = "thumb";
        img.onclick = () => {
            document.getElementById("vehicle-main-photo").src = src;
        };
        thumbContainer.appendChild(img);
    });

    // description
    document.getElementById("vehicle-description").innerHTML =
        (car.Description || "").replace(/\n/g, "<br>");

    // enquiry button
    document.getElementById("enquire-btn").href =
        `contact.html?msg=I am interested in the ${car.Title} (${car.Registration}).`;

});
