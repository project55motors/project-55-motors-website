// admin-shortcut.js – FINAL STABLE VERSION



(() => {



  let clicks = 0;

  let timer;



  document.addEventListener("click", (e) => {



    const logo = document.querySelector("img[alt='Project 55 Motors']");

    if (!logo) return;



    if (!logo.contains(e.target)) return;



    clicks++;



    if (clicks === 1) {

      timer = setTimeout(() => {

        clicks = 0;

      }, 800);

    }



    if (clicks === 3) {

      clearTimeout(timer);

      clicks = 0;

      window.location.href = "/admin.html";

    }



  });



  console.log("✅ Admin shortcut active (triple-click logo)");



})();