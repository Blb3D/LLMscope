import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

export default function SPCAnalysisPlotly() {
  const [dataPoints, setDataPoints] = useState([]);
  const [stats, setStats] = useState({
    mean: 0,
    std: 0,
    ucl: 0,
    lcl: 0,
    cp: 0,
    cpk: 0,
  });

  // --- fetch stats from API or fallback demo data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/stats");
        if (Array.isArray(res.data)) {
          setDataPoints(res.data.map((d, i) => ({ x: i + 1, y: d.latency })));
          computeStats(res.data.map((d) => d.latency));
        } else throw new Error("Unexpected response");
      } catch {
        // fallback demo points if backend not ready
        const demo = Array.from({ length: 30 }, (_, i) => ({
          x: i + 1,
          y: 150 + Math.sin(i / 3) * 10 + Math.random() * 8,
        }));
        setDataPoints(demo);
        computeStats(demo.map((d) => d.y));
      }
    };
    fetchData();
  }, []);

  // --- compute basic SPC stats ---
  const computeStats = (values) => {
    if (!values.length) return;
    const mean =
      values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      (values.length - 1);
    const std = Math.sqrt(variance);
    const ucl = mean + 3 * std;
    const lcl = mean - 3 * std;
    const specUpper = mean + 6 * std;
    const specLower = mean - 6 * std;
    const cp = (specUpper - specLower) / (6 * std || 1);
    const cpk = Math.min(
      (specUpper - mean) / (3 * std || 1),
      (mean - specLower) / (3 * std || 1)
    );
    setStats({ mean, std, ucl, lcl, cp, cpk });
  };

  // --- build Plotly traces ---
  const x = dataPoints.map((p) => p.x);
  const y = dataPoints.map((p) => p.y);

  const chartData = [
    {
      x,
      y,
      mode: "lines+markers",
      name: "Latency",
      line: { color: "#F4C98A", width: 2 },
      marker: { color: "#D37E3E", size: 6 },
    },
    {
      x,
      y: Array(x.length).fill(stats.mean),
      mode: "lines",
      name: "Mean",
      line: { color: "#1A0F08", dash: "dash" },
    },
    {
      x,
      y: Array(x.length).fill(stats.ucl),
      mode: "lines",
      name: "UCL (+3σ)",
      line: { color: "red", dash: "dot" },
    },
    {
      x,
      y: Array(x.length).fill(stats.lcl),
      mode: "lines",
      name: "LCL (-3σ)",
      line: { color: "red", dash: "dot" },
    },
  ];

  // --- chart layout ---
  const layout = {
    title: "LLMscope SPC Analysis (Plotly)",
    paper_bgcolor: "#0d0d0d",
    plot_bgcolor: "#141414",
    font: { color: "#f4f4f4" },
    xaxis: { title: "Sample", gridcolor: "#333" },
    yaxis: { title: "Latency (ms)", gridcolor: "#333" },
    shapes: [
      {
        type: "rect",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: stats.mean + 2 * stats.std,
        y1: stats.ucl,
        fillcolor: "rgba(255,0,0,0.1)",
        line: { width: 0 },
      },
      {
        type: "rect",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: stats.lcl,
        y1: stats.mean - 2 * stats.std,
        fillcolor: "rgba(255,0,0,0.1)",
        line: { width: 0 },
      },
    ],
    margin: { t: 60, r: 40, l: 60, b: 60 },
  };

  return (
    <div className="flex flex-col items-center w-full h-full p-6">
      <Plot
        data={chartData}
        layout={layout}
        useResizeHandler
        style={{ width: "100%", height: "80%" }}
        config={{ displaylogo: false, responsive: true }}
      />
      <div className="mt-6 bg-neutral-900 text-gray-200 rounded-xl p-4 w-[90%] max-w-lg shadow-md border border-neutral-700">
        <h2 className="text-lg font-semibold mb-2 text-amber-400">
          Statistical Summary
        </h2>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <p>Mean (μ): {stats.mean.toFixed(2)}</p>
          <p>Std Dev (σ): {stats.std.toFixed(2)}</p>
          <p>UCL: {stats.ucl.toFixed(2)}</p>
          <p>LCL: {stats.lcl.toFixed(2)}</p>
          <p>Cp: {stats.cp.toFixed(2)}</p>
          <p>Cpk: {stats.cpk.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
