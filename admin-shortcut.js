// admin-shortcut.js – FINAL FIXED



document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("admin-login-modal");

  const form = document.getElementById("admin-login-form");

  const errorBox = document.getElementById("admin-login-error");



  const API = "https://project55motors.co.uk/api";



  // delay to let logo load

  setTimeout(() => {

    const logo =

      document.querySelector(".logo img") ||

      document.querySelector("nav img") ||

      document.querySelector('img[src*="logo"]');



    if (!logo) return;



    let taps = 0;



    logo.addEventListener("click", () => {

      taps++;

      clearTimeout(logo._timer);

      logo._timer = setTimeout(() => (taps = 0), 600);



      if (taps === 3) {

        taps = 0;

        modal.style.display = "flex";

      }

    });

  }, 800);



  if (!form) return;



  form.addEventListener("submit", async (e) => {

    e.preventDefault();



    const username = form.username.value;

    const password = form.password.value;



    try {

      const res = await fetch(`${API}/login`, {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ username, password })

      });



      const data = await res.json();



      if (res.ok && data.success) {

        modal.style.display = "none";

        window.location.href = "/admin-dashboard.html";

      } else {

        errorBox.innerText = "Login failed";

        errorBox.style.display = "block";

      }



    } catch (err) {

      console.error(err);

      errorBox.innerText = "Connection error";

      errorBox.style.display = "block";

    }

  });

});