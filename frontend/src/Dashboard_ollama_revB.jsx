import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const AVAILABLE_MODELS = [
  "gemma3:4b",
  "gemma3:1b",
  "gpt-oss:20b",
  "llama2",
  "llama3",
  "llama3.2",
  "mistral",
  "qwen2.5:0.5b-instruct",
];

export default function Dashboard_ollama_revB() {
  const [provider, setProvider] = useState("ollama");
  const [models, setModels] = useState(AVAILABLE_MODELS);
  const [model, setModel] = useState("");
  const [timeMode, setTimeMode] = useState("24h");
  const [hours, setHours] = useState(24);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [violations, setViolations] = useState([]);
  const [telemetry, setTelemetry] = useState({ cpu: 0, memory: 0, gpu: 0 });
  const [err, setErr] = useState("");
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [acknowledgeInput, setAcknowledgeInput] = useState("");
  const [loadingAck, setLoadingAck] = useState(false);
  const [ackError, setAckError] = useState("");

  const apiKey = "dev-123";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/spc", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await r.json();
      const unique = [...new Set((j.models || []).filter((m) => m && m.trim() !== ""))];
      const merged = [...new Set([...AVAILABLE_MODELS, ...unique])];
      setModels(merged.sort());
    } catch (e) {
      console.warn("fetchModels error", e);
      setModels(AVAILABLE_MODELS);
    }
  }, []);

  // Fetch SPC chart data (telemetry)
  const fetchSPC = useCallback(async () => {
    try {
      const q = new URLSearchParams({ hours: hours.toString() });
      if (provider) q.append("provider", provider);
      if (model) q.append("model", model);

      const r = await fetch(`/api/stats/spc?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();

      let series = (j.timestamps || []).map((t, i) => ({
        t,
        y: Number(j.values?.[i] || 0) / 1000,
        model: j.models?.[i] || "unknown",
        provider: j.providers?.[i] || "unknown",
      }));

      const totalCount = series.length;
      const values = series.map((v) => v.y);
      let statsObj = {};

      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        const ucl = mean + 3 * std;
        const lcl = Math.max(0, mean - 3 * std);

        statsObj = {
          count: totalCount,
          mean,
          std,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          ucl,
          lcl,
        };
      }

      setData(series);
      setStats(statsObj);
      setErr("");
    } catch (e) {
      console.error("fetchSPC:", e);
      setErr(e.message);
    }
  }, [provider, model, hours]);

  // Fetch violations from database (server-side detected)
  const fetchViolations = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (model) q.append("model", model);
      q.append("limit", "100");

      const r = await fetch(`/api/violations?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const vios = await r.json();
      
      // Sort by timestamp descending
      vios.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setViolations(vios);
    } catch (e) {
      console.warn("fetchViolations error:", e);
      setViolations([]);
    }
  }, [model]);

  // Fetch system telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const r = await fetch("/api/system", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const j = await r.json();
        setTelemetry(j || {});
      }
    } catch (e) {
      console.warn("telemetry:", e);
    }
  }, []);

  // Setup initial fetches and intervals
  useEffect(() => {
    fetchModels();
  }, [provider, fetchModels]);

  useEffect(() => {
    fetchSPC();
  }, [timeMode, hours, provider, model, fetchSPC]);

  useEffect(() => {
    fetchViolations();
  }, [model, fetchViolations]);

  // Poll for new SPC data every 1 second
  useEffect(() => {
    const i = setInterval(fetchSPC, 1000);
    return () => clearInterval(i);
  }, [fetchSPC]);

  // Poll for new violations every 5 seconds
  useEffect(() => {
    const i = setInterval(fetchViolations, 5000);
    return () => clearInterval(i);
  }, [fetchViolations]);

  // Fetch telemetry on mount and every 5 seconds
  useEffect(() => {
    fetchTelemetry();
    const i = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(i);
  }, [fetchTelemetry]);

  // Handle acknowledge violation
  const handleAcknowledge = async () => {
    if (!acknowledgeInput.trim()) {
      setAckError("Please enter a name/email");
      return;
    }

    setLoadingAck(true);
    setAckError("");

    try {
      const response = await fetch(
        `/api/violations/${selectedViolation.id}/acknowledge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acknowledged_by: acknowledgeInput }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to acknowledge violation");
      }

      // Update the selected violation to show it's acknowledged
      setSelectedViolation({
        ...selectedViolation,
        is_acknowledged: 1,
        acknowledged_by: acknowledgeInput,
        acknowledged_at: new Date().toISOString(),
      });

      // Refresh violations list
      await fetchViolations();
      setAcknowledgeInput("");
    } catch (err) {
      setAckError(err.message);
    } finally {
      setLoadingAck(false);
    }
  };

  // Handle resolve violation
  const handleResolve = async () => {
    setLoadingAck(true);
    setAckError("");

    try {
      const response = await fetch(
        `/api/violations/${selectedViolation.id}/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to resolve violation");
      }

      // Update the selected violation
      setSelectedViolation({
        ...selectedViolation,
        resolved_at: new Date().toISOString(),
      });

      // Refresh violations list
      await fetchViolations();
    } catch (err) {
      setAckError(err.message);
    } finally {
      setLoadingAck(false);
    }
  };

  // Export violations as CSV
  function exportViolationsCSV() {
    let csv = "timestamp,model,rule,latency_ms,deviation_sigma,acknowledged\n";
    violations.forEach((v) => {
      csv += `"${v.timestamp}","${v.model}","${v.rule}",${v.latency_ms.toFixed(2)},${v.deviation_sigma.toFixed(2)},${v.is_acknowledged ? "yes" : "no"}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llmscope_violations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isLive = data.length > 0 && timeMode === "1h";

  const ruleDescriptions = {
    R1: "Point beyond 3σ from mean",
    R2: "9+ points on same side of mean",
    R3: "6+ points in increasing/decreasing trend",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6 overflow-hidden">
      <div className="flex gap-6 h-screen flex-row overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 space-y-6 overflow-y-auto border-r border-slate-800 pr-4 flex-shrink-0">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              LLMscope
            </h1>
            <p className="text-slate-400 text-sm mt-2">Real-time SPC Monitoring</p>
          </div>

          <div
            className={`p-4 rounded-2xl border-2 ${
              isLive
                ? "bg-emerald-500/10 border-emerald-500/50"
                : "bg-slate-800/50 border-slate-700/50"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                  }`}
                />
                <span className="font-bold">{isLive ? "🚀 Live" : "📊 Historical"}</span>
              </div>
              <span className="text-xs text-slate-400">{data.length} pts</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ollama">🦙 Ollama</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Window</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => {
                    setTimeMode("1h");
                    setHours(1);
                  }}
                  className={`px-2 py-2 rounded text-xs font-bold ${
                    timeMode === "1h" ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  1h (Live)
                </button>
                <button
                  onClick={() => {
                    setTimeMode("6h");
                    setHours(6);
                  }}
                  className={`px-2 py-2 rounded text-xs font-bold ${
                    timeMode === "6h" ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  6h
                </button>
                <button
                  onClick={() => {
                    setTimeMode("24h");
                    setHours(24);
                  }}
                  className={`px-2 py-2 rounded text-xs font-bold ${
                    timeMode === "24h" ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  24h
                </button>
              </div>
            </div>
          </div>

          {stats.mean && (
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-cyan-300">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean:</span>
                  <span className="font-bold text-emerald-400">{stats.mean.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Std:</span>
                  <span className="font-bold text-purple-400">{stats.std.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">P95:</span>
                  <span className="font-bold text-amber-400">{stats.p95.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Violations:</span>
                  <span className="font-bold text-red-400">{violations.length}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-orange-500/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-cyan-300">System</h3>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>CPU</span>
                <span className="font-bold text-cyan-400">{(telemetry.cpu || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className="bg-cyan-500 h-full"
                  style={{ width: `${Math.min(100, telemetry.cpu || 0)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>GPU</span>
                <span className="font-bold text-purple-400">{(telemetry.gpu || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${Math.min(100, telemetry.gpu || 0)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Mem</span>
                <span className="font-bold text-purple-400">{(telemetry.memory || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${Math.min(100, telemetry.memory || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          {err && (
            <div className="bg-red-950/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
              ⚠️ {err}
            </div>
          )}

          {/* Chart - 60% */}
          <div className="h-3/5 bg-slate-900/50 border border-slate-800 rounded-xl p-6 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              {/* Stats Bar */}
              <div className="bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">Mean</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {Number(stats.mean || 0).toFixed(3)}s
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">Std Dev</div>
                    <div className="text-lg font-bold text-purple-400">
                      {Number(stats.std || 0).toFixed(3)}s
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-red-500/30">
                    <div className="text-slate-400 uppercase tracking-wider">UCL</div>
                    <div className="text-lg font-bold text-red-400">
                      {Number(stats.ucl || 0).toFixed(3)}s
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-green-500/30">
                    <div className="text-slate-400 uppercase tracking-wider">LCL</div>
                    <div className="text-lg font-bold text-green-400">
                      {Number(stats.lcl || 0).toFixed(3)}s
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">R1 Violations</div>
                    <div className="text-lg font-bold text-red-400">
                      {violations.filter((v) => v.rule === "R1").length}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">Total Violations</div>
                    <div className="text-lg font-bold text-white">{violations.length}</div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <LineChart data={data} margin={{ top: 20, right: 30, left: 50, bottom: 20 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                    <XAxis dataKey="t" tick={false} stroke="#64748b" />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      stroke="#64748b"
                      domain={[0, "dataMax + 1"]}
                      type="number"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload;
                          return (
                            <div className="rounded-lg p-3 shadow-lg text-xs z-50 bg-slate-950 border-2 border-cyan-500">
                              <div className="text-slate-200">
                                <span className="text-slate-400">Time: </span>
                                <span className="font-mono text-cyan-300">
                                  {new Date(p.t).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-slate-200 mt-1">
                                <span className="text-slate-400">Latency: </span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {Number(p.y).toFixed(3)}s
                                </span>
                              </div>
                              <div className="text-slate-200">
                                <span className="text-slate-400">Model: </span>
                                <span className="font-mono text-blue-300">{p.model}</span>
                              </div>
                              <div className="text-slate-200">
                                <span className="text-slate-400">Deviation: </span>
                                <span className="font-mono">
                                  {((p.y - stats.mean) / stats.std).toFixed(2)}σ
                                </span>
                              </div>
                              <div className="border-t border-slate-700 mt-2 pt-2 text-slate-300">
                                <div>
                                  <span className="text-slate-400">Mean: </span>
                                  <span className="text-cyan-400 font-mono">
                                    {Number(stats.mean || 0).toFixed(3)}s
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Control Lines */}
                    <ReferenceLine
                      y={stats.mean}
                      stroke="#22d3ee"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: "Mean",
                        position: "right",
                        fill: "#22d3ee",
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={stats.ucl}
                      stroke="#ef4444"
                      strokeDasharray="8 4"
                      strokeWidth={1.5}
                      label={{
                        value: "UCL",
                        position: "right",
                        fill: "#ef4444",
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={stats.lcl}
                      stroke="#10b981"
                      strokeDasharray="8 4"
                      strokeWidth={1.5}
                      label={{
                        value: "LCL",
                        position: "right",
                        fill: "#10b981",
                        fontSize: 11,
                      }}
                    />

                    {/* Main Line */}
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                      strokeOpacity={0.8}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Violations Log - 40% */}
          {violations.length > 0 && (
            <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-sm font-bold text-cyan-300">🚨 Violations ({violations.length})</h3>
                <button
                  onClick={exportViolationsCSV}
                  className="text-xs bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded"
                >
                  📥 Export
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {violations.slice(0, 50).map((v, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedViolation(v);
                      setAcknowledgeInput("");
                      setAckError("");
                    }}
                    className={`rounded p-2 cursor-pointer transition flex-shrink-0 ${
                      v.is_acknowledged
                        ? "bg-slate-800/30 border border-emerald-500/30"
                        : "bg-slate-800/50 hover:bg-slate-800 border border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-cyan-300">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-bold text-red-400">{v.rule}</span>
                      <span className="text-slate-400">{v.latency_ms.toFixed(0)}ms</span>
                      <span className="text-purple-400">{v.deviation_sigma.toFixed(2)}σ</span>
                      {v.is_acknowledged && <span className="text-emerald-400">✓ Ack</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{v.model}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Violation Detail Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-cyan-300">🚨 Violation Details</h2>
              <button
                onClick={() => setSelectedViolation(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Violation Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/30">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Rule Triggered:</span>
                    <div className="font-bold text-red-400 text-lg">{selectedViolation.rule}</div>
                    <div className="text-slate-400 text-xs mt-1">
                      {ruleDescriptions[selectedViolation.rule] || "Unknown rule"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp:</span>
                    <div className="font-mono text-cyan-300">
                      {new Date(selectedViolation.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Latency:</span>
                    <div className="font-bold text-emerald-400 text-lg">
                      {selectedViolation.latency_ms.toFixed(0)}ms
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Deviation:</span>
                    <div className="font-bold text-purple-400 text-lg">
                      {selectedViolation.deviation_sigma.toFixed(2)}σ
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Model:</span>
                    <div className="font-mono text-blue-300">{selectedViolation.model}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Provider:</span>
                    <div className="font-mono text-blue-300">{selectedViolation.provider}</div>
                  </div>
                  {selectedViolation.is_acknowledged && (
                    <div>
                      <span className="text-slate-400">Acknowledged By:</span>
                      <div className="font-mono text-emerald-300">{selectedViolation.acknowledged_by}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(selectedViolation.acknowledged_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Frozen Statistics (From violation record) */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-cyan-300 mb-3">📊 Process Statistics (at violation time)</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Mean:</span>
                    <div className="font-bold text-cyan-400">{selectedViolation.mean_ms?.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Std Dev:</span>
                    <div className="font-bold text-purple-400">{selectedViolation.std_ms?.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <span className="text-slate-400">UCL:</span>
                    <div className="font-bold text-red-400">{selectedViolation.ucl_ms?.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <span className="text-slate-400">LCL:</span>
                    <div className="font-bold text-green-400">{selectedViolation.lcl_ms?.toFixed(0)}ms</div>
                  </div>
                </div>
              </div>

              {/* System Telemetry at violation time */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-cyan-300 mb-3">🖥️ System Telemetry (at violation time)</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">CPU:</span>
                    <div className="font-bold text-cyan-400">{selectedViolation.cpu_percent?.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Memory:</span>
                    <div className="font-bold text-purple-400">{selectedViolation.memory_percent?.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-400">GPU:</span>
                    <div className="font-bold text-purple-400">{selectedViolation.gpu_percent?.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-400">GPU Memory:</span>
                    <div className="font-bold text-purple-400">{selectedViolation.gpu_memory_percent?.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Acknowledgment Section */}
              {!selectedViolation.is_acknowledged ? (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-500/30">
                  <h3 className="text-sm font-bold text-yellow-300 mb-3">Acknowledge Violation</h3>
                  {ackError && (
                    <div className="bg-red-950/40 border border-red-500/50 text-red-200 p-2 rounded text-xs mb-3">
                      ⚠️ {ackError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={acknowledgeInput}
                      onChange={(e) => {
                        setAcknowledgeInput(e.target.value);
                        setAckError("");
                      }}
                      placeholder="Enter your name or email"
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={handleAcknowledge}
                      disabled={loadingAck}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded px-3 py-2 text-sm font-bold text-white transition"
                    >
                      {loadingAck ? "Acknowledging..." : "✓ Acknowledge Violation"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 rounded-lg p-4 border border-emerald-500/30">
                  <h3 className="text-sm font-bold text-emerald-300">✓ Acknowledged</h3>
                  <p className="text-xs text-emerald-200 mt-1">
                    {selectedViolation.acknowledged_by} on{" "}
                    {new Date(selectedViolation.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Resolve Section */}
              {!selectedViolation.resolved_at ? (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/30">
                  <h3 className="text-sm font-bold text-blue-300 mb-2">Mark as Resolved</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Indicate that you've fixed the underlying issue.
                  </p>
                  <button
                    onClick={handleResolve}
                    disabled={loadingAck}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded px-3 py-2 text-sm font-bold text-white transition"
                  >
                    {loadingAck ? "Resolving..." : "🔧 Mark as Resolved"}
                  </button>
                </div>
              ) : (
                <div className="bg-blue-950/30 rounded-lg p-4 border border-blue-500/30">
                  <h3 className="text-sm font-bold text-blue-300">✓ Resolved</h3>
                  <p className="text-xs text-blue-200 mt-1">
                    {new Date(selectedViolation.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-4 border-t border-slate-700">
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="w-full bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 text-sm font-bold text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}