async function fetchLiveData() {
  try {
    const res = await fetch("/api/live");
    const data = await res.json();
    const chart = document.getElementById("chart");
    if (data.status === "ok") {
      const latest = data.latencies[data.latencies.length - 1];
      chart.innerHTML = `<h3>Latest Latency: ${latest}s</h3>`;
    } else {
      chart.innerHTML = `<p>${data.message || "Waiting for samples..."}</p>`;
    }
  } catch (err) {
    console.error("Error fetching live data", err);
  }
}

setInterval(fetchLiveData, 2000);
fetchLiveData();
