/* ============================================================
   PROJECT 55 MOTORS — ADMIN TRAFFIC ANALYTICS CONTROLLER
   Premium OEM-style analytics for internal use only
   ============================================================ */

console.log("Admin Traffic Analytics JS Loaded");

const API_BASE = "/api";

const summaryBox = document.getElementById("traffic-summary");
const tableBody = document.getElementById("traffic-table-body");
const chartCanvas = document.getElementById("traffic-chart");
const logoutBtn = document.getElementById("logout-btn");


// -----------------------------------------------------------
// FETCH TRAFFIC LOGS
// -----------------------------------------------------------
async function loadTraffic() {
    try {
        const res = await fetch(`${API_BASE}/admin/traffic`, {
            method: "GET",
            credentials: "include",
        });

        if (!res.ok) {
            console.error(await res.text());
            summaryBox.innerHTML = `<p style="color:red;">Failed to load traffic logs.</p>`;
            return;
        }

        const data = await res.json();
        const logs = data.logs || [];

        renderSummary(logs);
        renderTable(logs);
        drawChart(logs);

    } catch (err) {
        console.error(err);
        summaryBox.innerHTML = `<p style="color:red;">Analytics unavailable.</p>`;
    }
}


// -----------------------------------------------------------
// SUMMARY METRICS
// -----------------------------------------------------------
function renderSummary(logs) {
    if (!logs.length) {
        summaryBox.innerHTML = `<p>No traffic data recorded yet.</p>`;
        return;
    }

    let totalVisits = logs.length;

    // Unique visitors: approximated via hashing User-Agent + Country
    const uniqueSet = new Set(
        logs.map(l => `${l.ua}_${l.country}`)
    );
    let uniqueVisitors = uniqueSet.size;

    // Most visited pages
    const pageCounts = {};
    logs.forEach(l => {
        pageCounts[l.path] = (pageCounts[l.path] || 0) + 1;
    });

    const sortedPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Render boxes
    summaryBox.innerHTML = `
        <div class="traffic-stats">
            <div class="stat-box">
                <div class="stat-title">Total Visits</div>
                <div class="stat-value">${totalVisits}</div>
            </div>

            <div class="stat-box">
                <div class="stat-title">Unique Visitors</div>
                <div class="stat-value">${uniqueVisitors}</div>
            </div>

            <div class="stat-box stat-wide">
                <div class="stat-title">Top Pages (Last 5)</div>
                <div class="stat-list">
                    ${sortedPages
                        .map(
                            ([path, count]) =>
                                `<div class="stat-item"><strong>${path}</strong> – ${count} visits</div>`
                        )
                        .join("")}
                </div>
            </div>
        </div>
    `;
}


// -----------------------------------------------------------
// LOG TABLE
// -----------------------------------------------------------
function renderTable(logs) {
    tableBody.innerHTML = "";

    logs.slice(-500).reverse().forEach(log => {
        const row = document.createElement("tr");

        const date = new Date(log.ts);
        const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}`;

        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${log.path}</td>
            <td>${log.ref || "direct"}</td>
            <td>${log.country || "--"}</td>
            <td class="ua-cell">${log.ua || "unknown"}</td>
        `;

        tableBody.appendChild(row);
    });
}


// -----------------------------------------------------------
// DAILY BAR CHART (Canvas)
// -----------------------------------------------------------
function drawChart(logs) {
    const ctx = chartCanvas.getContext("2d");

    // Clear previous render
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    // Aggregate by day
    const daily = {};

    logs.forEach(l => {
        const day = new Date(l.ts).toLocaleDateString();
        daily[day] = (daily[day] || 0) + 1;
    });

    const labels = Object.keys(daily);
    const values = Object.values(daily);

    if (labels.length === 0) return;

    // Determine bar geometry
    const width = chartCanvas.width;
    const height = chartCanvas.height;

    const barWidth = Math.max(20, (width - (labels.length + 1) * 10) / labels.length);
    const maxVal = Math.max(...values);

    // Draw bars
    labels.forEach((day, i) => {
        const x = 10 + i * (barWidth + 10);
        const barHeight = (values[i] / maxVal) * (height - 30);
        const y = height - barHeight - 10;

        // Bar
        ctx.fillStyle = "#1A5FFF";
        ctx.fillRect(x, y, barWidth, barHeight);

        // Count label
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Inter";
        ctx.fillText(values[i], x + barWidth / 3, y - 5);

        // Day label
        ctx.fillText(day, x, height - 2);
    });
}


// -----------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------
logoutBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/index.html";
});


// -----------------------------------------------------------
// INITIALISE
// -----------------------------------------------------------
loadTraffic();
