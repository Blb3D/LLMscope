// ================================================
// Dashboard.jsx  (LLMscope Rev B Core)
// ================================================
import React, { useState, useEffect } from "react";
import SPCChart from "./SPCChart";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [system, setSystem] = useState({ cpu: 0, memory: 0, gpuTemp: null });
  const [mode, setMode] = useState("simulated");
  const [provider, setProvider] = useState("unknown");
  const [loading, setLoading] = useState(true);

  // fetch backend stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:8081/api/stats");
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setStats(data.logs);
          if (data.logs.length > 0) {
            setMode(data.logs.at(-1).mode || "simulated");
            setProvider(data.logs.at(-1).provider || "unknown");
          }
        }
      } catch (e) {
        console.error("stats error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, []);

  // fetch system info
  useEffect(() => {
    const fetchSys = async () => {
      try {
        const res = await fetch("http://localhost:8081/api/system");
        if (res.ok) {
          const data = await res.json();
          setSystem(data);
        }
      } catch {}
    };
    fetchSys();
    const id = setInterval(fetchSys, 5000);
    return () => clearInterval(id);
  }, []);

  // compute basic statistics
  const latencies = stats.map((d) => d.latency_ms || d.latency || 0);
  const mean =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const stdDev = Math.sqrt(
    latencies.reduce((a, b) => a + (b - mean) ** 2, 0) / (latencies.length || 1)
  );
  const median =
    latencies.length > 0
      ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
      : 0;
  const ucl = mean + 3 * stdDev;
  const lcl = mean - 3 * stdDev;
  const cp = (ucl - lcl) / (6 * stdDev || 1);
  const cpk = Math.min(ucl - mean, mean - lcl) / (3 * stdDev || 1);

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">LLMscope Dashboard (Rev B Core)</h1>
        <Link
          to="/analysis"
          className="bg-amber-600 px-4 py-2 rounded hover:bg-amber-700"
        >
          Switch to Analysis View
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="CPU %" value={system.cpu.toFixed(1)} />
        <StatCard title="Memory %" value={system.memory.toFixed(1)} />
        <StatCard
          title="GPU Temp °C"
          value={system.gpuTemp ? system.gpuTemp.toFixed(1) : "—"}
        />
        <StatCard
          title="Mode"
          value={
            mode === "ollama"
              ? "🟢 Ollama Live"
              : mode === "simulated"
              ? "🔵 Simulated"
              : "🟣 Other"
          }
        />
      </section>

      <SPCChart data={stats} mean={mean} stdDev={stdDev} ucl={ucl} lcl={lcl} />

      <div className="mt-6 p-4 bg-neutral-900 rounded">
        <h2 className="text-lg font-semibold mb-2">Statistics Summary</h2>
        <p>Mean (ms): {mean.toFixed(2)}</p>
        <p>Median (ms): {median.toFixed(2)}</p>
        <p>Std Dev (ms): {stdDev.toFixed(2)}</p>
        <p>UCL (ms): {ucl.toFixed(2)}</p>
        <p>LCL (ms): {lcl.toFixed(2)}</p>
        <p>Cp: {cp.toFixed(3)}</p>
        <p>Cpk: {cpk.toFixed(3)}</p>
      </div>

      {!loading && stats.length === 0 && (
        <p className="mt-8 text-center text-gray-500">
          No data yet — waiting for benchmark or simulation feed…
        </p>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-neutral-900 p-4 rounded text-center">
      <h3 className="text-sm text-gray-400">{title}</h3>
      <p className="text-xl font-bold text-amber-400">{value}</p>
    </div>
  );
}
