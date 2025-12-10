// -----------------------------

// ADMIN ACCESS / LOGIN CONTROL

// -----------------------------



const API_BASE = "/api";

let loginOpen = false;



// ---- SECRET ENTRY ----

let clickCount = 0;

document.addEventListener("click", e => {

    if (!e.target.closest(".admin-brand")) return;

    clickCount++;

    setTimeout(() => clickCount = 0, 600);

    if (clickCount >= 3) showLogin();

});



document.addEventListener("keydown", e => {

    if (e.shiftKey && e.key.toLowerCase() === "a") showLogin();

});



// ---- LOGIN MODAL ----

function showLogin() {

    ensureLoginUI();

    document.getElementById("admin-login-modal").style.display = "flex";

}



function closeLogin() {

    document.getElementById("admin-login-modal").style.display = "none";

}



function ensureLoginUI() {

    if (document.getElementById("admin-login-modal")) return;



    const el = document.createElement("div");

    el.id = "admin-login-modal";

    el.style = `

        position:fixed; inset:0; background:rgba(0,0,0,.65);

        display:none; align-items:center; justify-content:center; z-index:9999;

    `;

    el.innerHTML = `

        <div style="background:white;padding:20px;border-radius:10px;width:300px;">

            <h2>Admin Login</h2>

            <label>Username</label>

            <input id="adminUser" style="width:100%;margin-bottom:10px;">

            <label>Password</label>

            <input id="adminPass" type="password" style="width:100%">

            <p id="adminError" style="color:red;font-size:12px;"></p>

            <button id="adminSubmit" style="margin-top:15px;width:100%;background:#0044cc;color:white;padding:8px;border-radius:6px;border:none;">

                Login

            </button>

        </div>

    `;

    document.body.appendChild(el);



    document.getElementById("adminSubmit").onclick = loginRequest;

}



async function loginRequest() {

    const user = document.getElementById("adminUser").value;

    const pass = document.getElementById("adminPass").value;

    const err = document.getElementById("adminError");



    err.textContent = "";



    const res = await fetch(`${API_BASE}/login`, {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ username: user, password: pass })

    });



    if (!res.ok) {

        err.textContent = "Incorrect details";

        return;

    }



    closeLogin();

    location.reload();

}



// ---- AUTO CHECK ----

async function checkSession() {

    const res = await fetch(`${API_BASE}/login-check`, {

        method: "GET",

        credentials: "include"

    });



    const data = await res.json();

    if (!data.loggedIn) showLogin();

}



checkSession();