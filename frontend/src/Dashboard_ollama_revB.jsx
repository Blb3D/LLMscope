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
  const [telemetry, setTelemetry] = useState({ cpu: 0, memory: 0 });
  const [err, setErr] = useState("");
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [mounted, setMounted] = useState(false);

  const apiKey = "dev-123";

  // Force re-render on mount to fix Recharts rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/spc", { headers: { Authorization: `Bearer ${apiKey}` } });
      const j = await r.json();
      const unique = [...new Set((j.models || []).filter(m => m && m.trim() !== ""))];
      const merged = [...new Set([...AVAILABLE_MODELS, ...unique])];
      setModels(merged.sort());
    } catch (e) {
      console.warn("fetchModels error", e);
      setModels(AVAILABLE_MODELS);
    }
  }, []);

  function detectNelsonViolations(data, mean, std) {
    const violations = [];
    const ucl = mean + 3 * std;
    const lcl = mean - 3 * std;

    data.forEach((point, idx) => {
      const y = point.y;
      if (y > ucl || y < lcl) {
        violations.push({ index: idx, rule: "R1", deviation: (y - mean) / std });
        return;
      }
      if (idx >= 8) {
        const last9 = data.slice(idx - 8, idx + 1).map(p => p.y);
        if (last9.every(v => v > mean) || last9.every(v => v < mean)) {
          violations.push({ index: idx, rule: "R2", deviation: (y - mean) / std });
          return;
        }
      }
      if (idx >= 5) {
        const last6 = data.slice(idx - 5, idx + 1).map(p => p.y);
        const inc = last6.every((v, i) => i === 0 || v >= last6[i - 1]);
        const dec = last6.every((v, i) => i === 0 || v <= last6[i - 1]);
        if ((inc || dec) && last6[0] !== last6[last6.length - 1]) {
          violations.push({ index: idx, rule: "R3", deviation: (y - mean) / std });
        }
      }
    });
    return violations;
  }

  const fetchSPC = useCallback(async () => {
    try {
      const q = new URLSearchParams({ hours: hours.toString() });
      if (provider) q.append("provider", provider);
      if (model) q.append("model", model);

      const r = await fetch(`/api/stats/spc?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
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
      const values = series.map(v => v.y);
      let statsObj = {};
      let violarr = [];

      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        const ucl = mean + 3 * std;
        const lcl = Math.max(0, mean - 3 * std);

        statsObj = { count: totalCount, mean, std, min: sorted[0], max: sorted[sorted.length - 1], p95: sorted[Math.floor(sorted.length * 0.95)], ucl, lcl };
        violarr = detectNelsonViolations(series, mean, std);
      }

      setData(series);
      setStats(statsObj);
      setViolations(violarr);
      setErr("");
    } catch (e) {
      console.error("fetchSPC:", e);
      setErr(e.message);
    }
  }, [provider, model, timeMode, hours]);

  const fetchTelemetry = useCallback(async () => {
    try {
      const r = await fetch("/api/system", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (r.ok) {
        const j = await r.json();
        setTelemetry(j || {});
      }
    } catch (e) {
      console.warn("telemetry:", e);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [provider, fetchModels]);
  useEffect(() => { fetchSPC(); }, [timeMode, hours, provider, model]);
  useEffect(() => { const i = setInterval(fetchSPC, 1000); return () => clearInterval(i); }, [fetchSPC]);
  useEffect(() => { fetchTelemetry(); const i = setInterval(fetchTelemetry, 5000); return () => clearInterval(i); }, [fetchTelemetry]);

  // Build violations log with full context
  const violationLog = useMemo(() => {
    return violations.map(v => {
      const idx = v.index ?? 0;
      const point = data[idx];
      if (!point) return null;
      return {
        ...v,
        timestamp: point.t,
        model: point.model,
        latency: point.y,
        provider: point.provider,
      };
    }).filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [violations, data]);

  // Get context around a violation (±10 points)
  const getViolationContext = (idx) => {
    const start = Math.max(0, idx - 10);
    const end = Math.min(data.length - 1, idx + 10);
    return data.slice(start, end + 1);
  };

  const handleViolationClick = (violation) => {
    setSelectedViolation(violation);
  };

  const ruleDescriptions = {
    R1: "Point beyond 3σ from mean",
    R2: "9+ points on same side of mean",
    R3: "6+ points in increasing/decreasing trend",
  };

  function exportViolationsCSV() {
    let csv = "timestamp,model,rule,latency_s,deviation_sigma\n";
    violationLog.forEach(v => {
      csv += `"${v.timestamp}","${v.model}","${v.rule}",${v.latency.toFixed(6)},${v.deviation.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llmscope_violations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isLive = data.length > 0 && timeMode === "live";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6 overflow-hidden">
      <div className="flex gap-6 h-screen flex-row overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 space-y-6 overflow-y-auto border-r border-slate-800 pr-4 flex-shrink-0">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">LLMscope</h1>
            <p className="text-slate-400 text-sm mt-2">Real-time SPC Monitoring</p>
          </div>

          <div className={`p-4 rounded-2xl border-2 ${isLive ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="font-bold">{isLive ? '🚀 Live' : '📊 Historical'}</span>
              </div>
              <span className="text-xs text-slate-400">{data.length} pts</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="ollama">🦙 Ollama</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">All</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Window</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button onClick={() => { setTimeMode("1h"); setHours(1); }} className={`px-2 py-2 rounded text-xs font-bold ${timeMode === "1h" ? 'bg-cyan-600' : 'bg-slate-800'}`}>1h (Live)</button>
                <button onClick={() => { setTimeMode("6h"); setHours(6); }} className={`px-2 py-2 rounded text-xs font-bold ${timeMode === "6h" ? 'bg-cyan-600' : 'bg-slate-800'}`}>6h</button>
                <button onClick={() => { setTimeMode("24h"); setHours(24); }} className={`px-2 py-2 rounded text-xs font-bold ${timeMode === "24h" ? 'bg-cyan-600' : 'bg-slate-800'}`}>24h</button>
              </div>
            </div>
          </div>

          {stats.mean && (
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-cyan-300">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Mean:</span><span className="font-bold text-emerald-400">{stats.mean.toFixed(3)}s</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Std:</span><span className="font-bold text-purple-400">{stats.std.toFixed(3)}s</span></div>
                <div className="flex justify-between"><span className="text-slate-400">P95:</span><span className="font-bold text-amber-400">{stats.p95.toFixed(3)}s</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Violations:</span><span className="font-bold text-red-400">{violations.length}</span></div>
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
              <div className="w-full bg-slate-700 rounded h-2"><div className="bg-cyan-500 h-full" style={{width: `${Math.min(100, telemetry.cpu || 0)}%`}} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Mem</span>
                <span className="font-bold text-purple-400">{(telemetry.memory || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2"><div className="bg-purple-500 h-full" style={{width: `${Math.min(100, telemetry.memory || 0)}%`}} /></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          {err && <div className="bg-red-950/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">⚠️ {err}</div>}
          
          {/* Chart - Takes 60% of available space */}
          <div className="h-3/5 bg-slate-900/50 border border-slate-800 rounded-xl p-6 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              {/* Stats Bar */}
              <div className="bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">Mean</div>
                    <div className="text-lg font-bold text-cyan-400">{Number(stats.mean || 0).toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">Std Dev</div>
                    <div className="text-lg font-bold text-purple-400">{Number(stats.std || 0).toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-red-500/30">
                    <div className="text-slate-400 uppercase tracking-wider">UCL</div>
                    <div className="text-lg font-bold text-red-400">{Number(stats.ucl || 0).toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-green-500/30">
                    <div className="text-slate-400 uppercase tracking-wider">LCL</div>
                    <div className="text-lg font-bold text-green-400">{Number(stats.lcl || 0).toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-slate-400 uppercase tracking-wider">R1 Violations</div>
                    <div className="text-lg font-bold text-red-400">{violations.filter(v => v.rule === 'R1').length}</div>
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
                      domain={[0, 'dataMax + 1']}
                      type="number"
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload;
                        return (
                          <div className="rounded-lg p-3 shadow-lg text-xs z-50 bg-slate-950 border-2 border-cyan-500">
                            <div className="text-slate-200"><span className="text-slate-400">Time: </span><span className="font-mono text-cyan-300">{new Date(p.t).toLocaleTimeString()}</span></div>
                            <div className="text-slate-200 mt-1"><span className="text-slate-400">Latency: </span><span className="font-mono font-bold text-emerald-300">{Number(p.y).toFixed(3)}s</span></div>
                            <div className="text-slate-200"><span className="text-slate-400">Model: </span><span className="font-mono text-blue-300">{p.model}</span></div>
                            <div className="text-slate-200"><span className="text-slate-400">Deviation: </span><span className="font-mono">{((p.y - stats.mean) / stats.std).toFixed(2)}σ</span></div>
                            <div className="border-t border-slate-700 mt-2 pt-2 text-slate-300">
                              <div><span className="text-slate-400">Mean: </span><span className="text-cyan-400 font-mono">{Number(stats.mean || 0).toFixed(3)}s</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    
                    {/* Control Lines */}
                    <ReferenceLine y={stats.mean} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={2} label={{ value: "Mean", position: "right", fill: "#22d3ee", fontSize: 11 }} />
                    <ReferenceLine y={stats.ucl} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: "UCL", position: "right", fill: "#ef4444", fontSize: 11 }} />
                    <ReferenceLine y={stats.lcl} stroke="#10b981" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: "LCL", position: "right", fill: "#10b981", fontSize: 11 }} />
                    
                    {/* Main Line - fully hoverable */}
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

          {/* Violations Log - Takes remaining 40% of space */}
          {violationLog.length > 0 && (
            <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-sm font-bold text-cyan-300">🚨 Violations ({violationLog.length})</h3>
                <button onClick={exportViolationsCSV} className="text-xs bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded">📥 Export</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {violationLog.slice(0, 50).map((v, i) => (
                  <div key={i} onClick={() => handleViolationClick(v)} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded p-2 cursor-pointer transition flex-shrink-0">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-cyan-300">{new Date(v.timestamp).toLocaleTimeString()}</span>
                      <span className="font-bold text-red-400">{v.rule}</span>
                      <span className="text-slate-400">{v.latency.toFixed(3)}s</span>
                      <span className="text-purple-400">{v.deviation.toFixed(2)}σ</span>
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
              <button onClick={() => setSelectedViolation(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Violation Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/30">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Rule Triggered:</span>
                    <div className="font-bold text-red-400 text-lg">{selectedViolation.rule}</div>
                    <div className="text-slate-400 text-xs mt-1">{ruleDescriptions[selectedViolation.rule]}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp:</span>
                    <div className="font-mono text-cyan-300">{new Date(selectedViolation.timestamp).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Latency:</span>
                    <div className="font-bold text-emerald-400 text-lg">{selectedViolation.latency.toFixed(3)}s</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Deviation:</span>
                    <div className="font-bold text-purple-400 text-lg">{selectedViolation.deviation.toFixed(2)}σ</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Model:</span>
                    <div className="font-mono text-blue-300">{selectedViolation.model}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Provider:</span>
                    <div className="font-mono text-blue-300">{selectedViolation.provider}</div>
                  </div>
                </div>
              </div>

              {/* Statistics Context */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-cyan-300 mb-3">Process Statistics</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Mean:</span>
                    <div className="font-bold text-cyan-400">{stats.mean?.toFixed(3)}s</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Std Dev:</span>
                    <div className="font-bold text-purple-400">{stats.std?.toFixed(3)}s</div>
                  </div>
                  <div>
                    <span className="text-slate-400">UCL:</span>
                    <div className="font-bold text-red-400">{stats.ucl?.toFixed(3)}s</div>
                  </div>
                </div>
              </div>

              {/* System Telemetry */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-cyan-300 mb-3">System Telemetry</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">CPU:</span>
                    <div className="font-bold text-cyan-400">{(telemetry.cpu || 0).toFixed(0)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Memory:</span>
                    <div className="font-bold text-purple-400">{(telemetry.memory || 0).toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              {/* Context Data Table */}
              <div>
                <h3 className="text-sm font-bold text-cyan-300 mb-3">Context (±10 points)</h3>
                <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="px-3 py-2 text-left text-slate-400">Time</th>
                        <th className="px-3 py-2 text-left text-slate-400">Latency</th>
                        <th className="px-3 py-2 text-left text-slate-400">Deviation</th>
                        <th className="px-3 py-2 text-left text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getViolationContext(selectedViolation.index).map((point, i) => {
                        const isViolationPoint = point.t === selectedViolation.timestamp;
                        const dev = (point.y - stats.mean) / stats.std;
                        const isOutOfControl = Math.abs(dev) > 3;
                        return (
                          <tr key={i} className={`border-b border-slate-700 ${isViolationPoint ? 'bg-red-950/40 font-bold' : ''}`}>
                            <td className="px-3 py-2 text-slate-400">{new Date(point.t).toLocaleTimeString()}</td>
                            <td className="px-3 py-2 font-mono">{point.y.toFixed(3)}s</td>
                            <td className={`px-3 py-2 font-mono ${isOutOfControl ? 'text-red-400' : 'text-slate-400'}`}>{dev.toFixed(2)}σ</td>
                            <td className={`px-3 py-2 ${isViolationPoint ? 'text-red-400 font-bold' : isOutOfControl ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {isViolationPoint ? '🚨 VIOLATION' : isOutOfControl ? '⚠️ Alert' : '✓ OK'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}