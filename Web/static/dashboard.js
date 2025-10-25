// ============================================================
// LLMscope Live Dashboard – Chart.js Final Version
// ============================================================

let chart; // chart instance
let initialized = false;

// ------------------------------------------------------------
// Initialize chart once
// ------------------------------------------------------------
function initChart() {
  const ctx = document.getElementById("latencyChart").getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Response Latency (seconds)",
          data: [],
          borderColor: "#D37E3E",
          backgroundColor: "rgba(211,126,62,0.2)",
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#F4C98A",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Timestamp",
            color: "#F4C98A",
          },
          ticks: {
            color: "#F4C98A",
          },
          grid: {
            color: "rgba(244,201,138,0.1)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Latency (s)",
            color: "#F4C98A",
          },
          ticks: {
            color: "#F4C98A",
          },
          grid: {
            color: "rgba(244,201,138,0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#F4C98A",
          },
        },
      },
    },
  });

  initialized = true;
  console.log("[LLMscope] Chart initialized.");
}

// ------------------------------------------------------------
// Fetch data from backend
// ------------------------------------------------------------
async function fetchLiveData() {
  try {
    const res = await fetch("/api/live");
    const data = await res.json();

    if (!data.samples || data.samples.length === 0) {
      document.getElementById("chartStatus").innerText =
        "⚠️ Waiting for samples...";
      return;
    }

    // Map timestamps & latencies
    const labels = data.samples.map((d) =>
      new Date(d.timestamp).toLocaleTimeString()
    );
    const values = data.samples.map((d) => d.latency);

    if (!initialized) initChart();

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();

    // Update top metric cards
    updateMetricCards(values);

    document.getElementById("chartStatus").innerText = "✅ Live";
  } catch (err) {
    console.error("[LLMscope] Fetch failed:", err);
    document.getElementById("chartStatus").innerText = "❌ Error fetching data";
  }
}

// ------------------------------------------------------------
// Update top metric cards
// ------------------------------------------------------------
function updateMetricCards(values) {
  if (!values || values.length === 0) return;

  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  const latest = values[values.length - 1].toFixed(2);
  const min = Math.min(...values).toFixed(2);
  const max = Math.max(...values).toFixed(2);

  const avgEl = document.getElementById("avgLatency");
  const latestEl = document.getElementById("latestLatency");
  const minEl = document.getElementById("minLatency");
  const maxEl = document.getElementById("maxLatency");
  const totalEl = document.getElementById("totalSamples");

  if (avgEl) avgEl.innerText = avg + " s";
  if (latestEl) latestEl.innerText = latest + " s";
  if (minEl) minEl.innerText = min + " s";
  if (maxEl) maxEl.innerText = max + " s";
  if (totalEl) totalEl.innerText = values.length;
}

// ------------------------------------------------------------
// Main loop
// ------------------------------------------------------------
async function mainLoop() {
  await fetchLiveData();
  setTimeout(mainLoop, 5000); // update every 5s
}

window.addEventListener("DOMContentLoaded", mainLoop);
