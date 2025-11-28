// detail.js OR car-page.js



const params = new URLSearchParams(window.location.search);

const id = params.get("id");



if (!id) {

  document.body.innerHTML = "<h2>No car ID provided</h2>";

} else {

  fetch(`https://project55motors.co.uk/api/cars?id=${id}`)

    .then(res => res.json())

    .then(data => {



      const car = data.records?.[0]?.fields;



      if (!car) {

        document.body.innerHTML = "<h2>Car not found</h2>";

        return;

      }



      const img = car.Photos?.[0]?.url || "no-image.png";



      document.getElementById('car-image').src = img;

      document.getElementById('car-title').textContent = car.Make_Model || '';

      document.getElementById('car-price').textContent = "£" + (car.Price || '');

      document.getElementById('car-description').textContent = car.Full_Description || '';



    })

    .catch(err => {

      console.error(err);

      document.body.innerHTML = "<h2>Error loading car</h2>";

    });

}