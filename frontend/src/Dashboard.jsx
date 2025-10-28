// ================================================
// Dashboard.jsx - LLMscope Professional Dashboard
// ================================================
import React, { useState, useEffect } from "react";
import SPCChart from "./SPCChart";
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
        const res = await fetch("/api/");
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setStats(data.logs);
          if (data.logs.length > 0) {
            setMode(data.logs[0].mode || "simulated");
            setProvider(data.logs[0].provider || "unknown");
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
        const res = await fetch("/api/system");
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

  // compute basic statistics - use latency_ms from backend
  const latencies = stats.map((d) => d.latency_ms || 0);
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
  const lcl = Math.max(0, mean - 3 * stdDev);
  const cp = (ucl - lcl) / (6 * stdDev || 1);
  const cpk = Math.min(ucl - mean, mean - lcl) / (3 * stdDev || 1);

  // Process capability assessment
  const getCapabilityStatus = () => {
    if (cpk >= 1.67) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (cpk >= 1.33) return { label: "Capable", color: "text-green-400", bg: "bg-green-500/20" };
    if (cpk >= 1.0) return { label: "Adequate", color: "text-yellow-400", bg: "bg-yellow-500/20" };
    return { label: "Poor", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const capabilityStatus = getCapabilityStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                LLMscope
              </h1>
              <p className="text-sm text-gray-400 mt-1">Statistical Process Control Dashboard</p>
            </div>
            <Link
              to="/analysis"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20"
            >
              Advanced Analysis
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* System Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="CPU Usage"
            value={`${system.cpu.toFixed(1)}%`}
            subtitle="Host System"
            icon="🖥️"
            trend={system.cpu > 80 ? "high" : system.cpu > 50 ? "medium" : "low"}
          />
          <MetricCard
            title="Memory"
            value={`${system.memory.toFixed(1)}%`}
            subtitle="RAM Usage"
            icon="💾"
            trend={system.memory > 80 ? "high" : system.memory > 50 ? "medium" : "low"}
          />
          <MetricCard
            title="Temperature"
            value={system.gpuTemp ? `${system.gpuTemp.toFixed(0)}°C` : "—"}
            subtitle="GPU Sensor"
            icon="🌡️"
            trend={system.gpuTemp > 80 ? "high" : system.gpuTemp > 60 ? "medium" : "low"}
          />
          <MetricCard
            title="Data Source"
            value={mode === "ollama" ? "Ollama" : mode === "simulated" ? "Simulated" : "Other"}
            subtitle={provider}
            icon={mode === "ollama" ? "🟢" : "🔵"}
            trend={mode === "ollama" ? "active" : "inactive"}
          />
        </div>

        {/* SPC Chart Section */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Latency Control Chart</h2>
              <p className="text-sm text-gray-400 mt-1">
                Real-time SPC monitoring • {stats.length} samples
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${capabilityStatus.bg} ${capabilityStatus.color} font-semibold`}>
              {capabilityStatus.label}
            </div>
          </div>
          
          {stats.length > 0 ? (
            <SPCChart data={stats} mean={mean} stdDev={stdDev} ucl={ucl} lcl={lcl} />
          ) : (
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-400">Waiting for data collection...</p>
                <p className="text-sm text-gray-500 mt-2">Monitor will send data every 30 seconds</p>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Performance Metrics
            </h3>
            <div className="space-y-3">
              <StatRow label="Mean Latency" value={`${mean.toFixed(2)} ms`} />
              <StatRow label="Median Latency" value={`${median.toFixed(2)} ms`} />
              <StatRow label="Std Deviation (σ)" value={`${stdDev.toFixed(2)} ms`} />
              <StatRow label="Min / Max" value={`${Math.min(...latencies).toFixed(0)} / ${Math.max(...latencies).toFixed(0)} ms`} />
            </div>
          </div>

          {/* Process Capability */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Process Capability
            </h3>
            <div className="space-y-3">
              <StatRow label="UCL (+3σ)" value={`${ucl.toFixed(2)} ms`} highlight="text-orange-400" />
              <StatRow label="LCL (-3σ)" value={`${lcl.toFixed(2)} ms`} highlight="text-orange-400" />
              <StatRow label="Cp Index" value={cp.toFixed(3)} />
              <StatRow 
                label="Cpk Index" 
                value={cpk.toFixed(3)} 
                highlight={cpk >= 1.33 ? "text-emerald-400" : cpk >= 1.0 ? "text-yellow-400" : "text-red-400"}
              />
            </div>
          </div>
        </div>

        {/* Loading/Empty State */}
        {!loading && stats.length === 0 && (
          <div className="mt-8 text-center">
            <div className="inline-block bg-slate-900/50 border border-slate-800 rounded-xl px-8 py-6">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-400">
                Initializing monitoring system...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                First data point will arrive within 30 seconds
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, trend }) {
  const getTrendColor = () => {
    if (trend === "high") return "border-red-500/30 bg-red-500/5";
    if (trend === "medium") return "border-yellow-500/30 bg-yellow-500/5";
    if (trend === "active") return "border-emerald-500/30 bg-emerald-500/5";
    return "border-slate-700 bg-slate-800/30";
  };

  return (
    <div className={`rounded-xl border ${getTrendColor()} backdrop-blur-sm p-4 transition-all hover:scale-105`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-sm text-gray-400 font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-semibold ${highlight || "text-gray-100"}`}>{value}</span>
    </div>
  );
}