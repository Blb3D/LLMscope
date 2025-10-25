/**
 * ============================================================
 *  LLMscope Dashboard (Chart.js version)
 *  Clean rewrite – visible mean, UCL, and LCL lines
 * ============================================================
 */

let chartInstance;
let chartData = [];
let lastUpdate = null;
let controlLimitsHistory = []; // Store control limits for each point

// ============================
// Fetch live latency data
// ============================
async function fetchLiveData() {
  try {
    const response = await fetch("/api/live");
    const result = await response.json();

    if (!result.samples || result.samples.length === 0) return;

    chartData = result.samples.map(d => ({
      x: new Date(d.timestamp),
      y: parseFloat(d.latency)
    }));

    updateChart();
    updateStats();
  } catch (err) {
    console.error("Error fetching live data:", err);
  }
}

// ============================
// Initialize Chart.js instance
// ============================
function initChart() {
  const ctx = document.getElementById("latencyChart").getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        // Primary latency line
        {
          label: "Response Latency (seconds)",
          data: [],
          borderColor: "#D37E3E",
          backgroundColor: "rgba(244,201,138,0.15)",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#F4C98A",
          yAxisID: "y",
          order: 4
        },
        // Mean latency line
        {
          label: "Mean",
          data: [],
          borderColor: "#00BFFF",      // bright electric blue
          borderWidth: 3,
          borderDash: [10, 5],         // dashed line
          pointRadius: 0,
          fill: false,
          tension: 0,
          yAxisID: "y",
          order: 1
        },
        // Upper Control Limit (UCL)
        {
          label: "UCL (Mean + 3σ)",
          data: [],
          borderColor: "#FF4444",      // red
          borderWidth: 2,
          borderDash: [10, 5],         // dashed line
          pointRadius: 0,
          fill: false,
          tension: 0,
          yAxisID: "y",
          order: 2
        },
        // Lower Control Limit (LCL)
        {
          label: "LCL (Mean - 3σ)",
          data: [],
          borderColor: "#44FF44",      // green
          borderWidth: 2,
          borderDash: [10, 5],         // dashed line
          pointRadius: 0,
          fill: false,
          tension: 0,
          yAxisID: "y",
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: { top: 15, bottom: 10, left: 10, right: 10 }
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "HH:mm:ss"
          },
          ticks: { color: "#F4C98A" },
          grid: { color: "rgba(244,201,138,0.1)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#F4C98A" },
          grid: { color: "rgba(244,201,138,0.1)" },
          title: { display: true, text: "Latency (s)", color: "#F4C98A" }
        }
      },
      plugins: {
        legend: {
          labels: { color: "#F4C98A" }
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}s`,
            footer: (tooltipItems) => {
              // Get the data point index from the first tooltip item
              if (tooltipItems.length > 0 && controlLimitsHistory.length > 0) {
                const dataIndex = tooltipItems[0].dataIndex;
                
                if (dataIndex < controlLimitsHistory.length) {
                  const stats = controlLimitsHistory[dataIndex];
                  
                  return [
                    `───────────────`,
                    `Mean (at this point): ${stats.mean.toFixed(2)}s`,
                    `UCL (at this point): ${stats.ucl.toFixed(2)}s`,
                    `LCL (at this point): ${stats.lcl.toFixed(2)}s`
                  ];
                }
              }
              return [];
            }
          }
        }
      }
    }
  });
  
  console.log("Chart initialized with", chartInstance.data.datasets.length, "datasets");
}

// ============================
// Calculate standard deviation
// ============================
function calculateStdDev(values, mean) {
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

// ============================
// Update chart data and control lines
// ============================
function updateChart() {
  if (!chartInstance) return;

  // Update latency curve
  chartInstance.data.datasets[0].data = chartData;

  // Calculate rolling control limits for each point
  controlLimitsHistory = [];
  
  if (chartData.length > 0) {
    // Calculate control limits using all data up to each point
    for (let i = 0; i < chartData.length; i++) {
      const dataUpToPoint = chartData.slice(0, i + 1);
      const latencies = dataUpToPoint.map(d => d.y);
      const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
      const stdDev = calculateStdDev(latencies, mean);
      const ucl = mean + (3 * stdDev);
      const lcl = Math.max(0, mean - (3 * stdDev));
      
      controlLimitsHistory.push({
        timestamp: chartData[i].x,
        mean: mean,
        ucl: ucl,
        lcl: lcl
      });
    }
    
    // Use the final values for the displayed lines
    const finalStats = controlLimitsHistory[controlLimitsHistory.length - 1];
    const xMin = chartData[0].x;
    const xMax = chartData[chartData.length - 1].x;

    // Set mean line
    chartInstance.data.datasets[1].data = [
      { x: xMin, y: finalStats.mean },
      { x: xMax, y: finalStats.mean }
    ];

    // Set UCL line
    chartInstance.data.datasets[2].data = [
      { x: xMin, y: finalStats.ucl },
      { x: xMax, y: finalStats.ucl }
    ];

    // Set LCL line
    chartInstance.data.datasets[3].data = [
      { x: xMin, y: finalStats.lcl },
      { x: xMax, y: finalStats.lcl }
    ];

    console.log("Control limits updated:", {
      mean: finalStats.mean.toFixed(2),
      stdDev: calculateStdDev(chartData.map(d => d.y), finalStats.mean).toFixed(2),
      ucl: finalStats.ucl.toFixed(2),
      lcl: finalStats.lcl.toFixed(2)
    });
  } else {
    // Clear all lines
    chartInstance.data.datasets[1].data = [];
    chartInstance.data.datasets[2].data = [];
    chartInstance.data.datasets[3].data = [];
  }

  // Force update without animation
  chartInstance.update("none");
  lastUpdate = new Date();
  updateLastUpdated();
}

// ============================
// Update stats cards
// ============================
function updateStats() {
  if (chartData.length === 0) return;

  const latencies = chartData.map(d => d.y);
  const avg = (
    latencies.reduce((a, b) => a + b, 0) / latencies.length
  ).toFixed(2);
  const latest = latencies[latencies.length - 1].toFixed(2);
  const min = Math.min(...latencies).toFixed(2);
  const max = Math.max(...latencies).toFixed(2);
  const stdDev = calculateStdDev(latencies, parseFloat(avg)).toFixed(2);

  // Update individual metric elements if they exist
  const avgEl = document.getElementById("avgLatency");
  const latestEl = document.getElementById("latestLatency");
  const totalEl = document.getElementById("totalSamples");
  const minEl = document.getElementById("minLatency");
  const maxEl = document.getElementById("maxLatency");

  if (avgEl) avgEl.textContent = `${avg} s`;
  if (latestEl) latestEl.textContent = `${latest} s`;
  if (totalEl) totalEl.textContent = chartData.length;
  if (minEl) minEl.textContent = `${min} s`;
  if (maxEl) maxEl.textContent = `${max} s`;

  // Update stats box if it exists
  const statsBox = document.getElementById("stats");
  if (statsBox) {
    statsBox.innerHTML = `
      Average: ${avg}s<br>
      Latest: ${latest}s<br>
      Min: ${min}s<br>
      Max: ${max}s<br>
      Std Dev: ${stdDev}s<br>
      Total Samples: ${chartData.length}
    `;
  }
}

// ============================
// Update timestamp label
// ============================
function updateLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (el && lastUpdate) {
    el.textContent = `Last Updated: ${lastUpdate.toLocaleTimeString()}`;
  }
}

// ============================
// Start the dashboard loop
// ============================
initChart();
fetchLiveData();
setInterval(fetchLiveData, 5000);