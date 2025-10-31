import React, { useEffect, useState, useCallback } from "react";
import ChartSelector from "./components/charts/ChartSelector";
import CopilotWidget from "./components/CopilotWidget";

export default function Dashboard_Simple() {
  const [provider, setProvider] = useState("ollama");
  const [models, setModels] = useState(["mistral", "llama3"]);
  const [model, setModel] = useState("");
  const [timeMode, setTimeMode] = useState("live");
  const [hours, setHours] = useState(24);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [violations, setViolations] = useState([]);
  const [telemetry, setTelemetry] = useState({ cpu: 0, memory: 0, gpu: 0 });
  const [systemTelemetry, setSystemTelemetry] = useState({ cpu: 0, memory: 0, gpu: 0, system: '', release: '' });
  const [ollamaTelemetry, setOllamaTelemetry] = useState({ available: false, running_models: 0, models: [] });
  const [err, setErr] = useState("");
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [loading, setLoading] = useState({ spc: false, violations: false, telemetry: false });

  const apiKey = "dev-123";

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/spc", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await r.json();
      const unique = [...new Set((j.models || []).filter((m) => m && m.trim() !== ""))];
      setModels(unique.sort());
    } catch (e) {
      console.warn("fetchModels error", e);
    }
  }, []);

  const fetchSPC = useCallback(async () => {
    if (!model) return;
    setLoading(prev => ({ ...prev, spc: true }));
    try {
      const q = new URLSearchParams({ provider, model });
      if (timeMode !== "live") q.append("hours", hours);
      
      const r = await fetch(`/api/stats/spc?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await r.json();
      setData(j.data || []);
      setStats(j.stats || {});
      setErr("");
    } catch (e) {
      setErr(`SPC: ${e.message}`);
    } finally {
      setLoading(prev => ({ ...prev, spc: false }));
    }
  }, [provider, model, timeMode, hours]);

  const fetchViolations = useCallback(async () => {
    setLoading(prev => ({ ...prev, violations: true }));
    try {
      const q = new URLSearchParams();
      if (timeMode === "live") {
        q.append("limit", "50");
      } else {
        q.append("hours", hours);
        q.append("limit", "200");
      }
      
      const r = await fetch(`/api/violations?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const response = await r.json();
      const vios = response.violations || response;
      setViolations(Array.isArray(vios) ? vios : []);
    } catch (e) {
      console.warn("fetchViolations error:", e);
      setViolations([]);
    } finally {
      setLoading(prev => ({ ...prev, violations: false }));
    }
  }, [timeMode, hours]);

  const fetchTelemetry = useCallback(async () => {
    setLoading(prev => ({ ...prev, telemetry: true }));
    try {
      const r = await fetch("/api/system", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const j = await r.json();
        setTelemetry({
          cpu: j.cpu || 0,
          memory: j.memory || 0,
          gpu: j.gpu || 0
        });
        setSystemTelemetry({
          cpu: j.cpu || 0,
          memory: j.memory || 0,
          gpu: j.gpu || 0,
          gpu_memory: j.gpu_memory || 0,
          system: j.system || '',
          release: j.release || '',
          timestamp: j.timestamp || ''
        });
        setOllamaTelemetry(j.ollama || { available: false, running_models: 0, models: [] });
      }
    } catch (e) {
      console.warn("telemetry:", e);
    } finally {
      setLoading(prev => ({ ...prev, telemetry: false }));
    }
  }, []);

  useEffect(() => {
    fetchSPC();
  }, [fetchSPC]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-refresh for live mode
  useEffect(() => {
    if (timeMode !== "live") return;
    const i = setInterval(() => {
      fetchSPC();
      fetchViolations();
      fetchTelemetry();
    }, 1000);
    return () => clearInterval(i);
  }, [timeMode, fetchSPC, fetchViolations, fetchTelemetry]);

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

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="ollama">Ollama</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Select Model</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Mode</label>
              <select
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="live">Live (90 points)</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
              </select>
            </div>
          </div>

          {/* System Telemetry */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">🖥️ System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">CPU:</span>
                <span className="font-bold text-white">{telemetry.cpu}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Memory:</span>
                <span className="font-bold text-white">{telemetry.memory}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GPU:</span>
                <span className="font-bold text-white">{telemetry.gpu}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">System:</span>
                <span className="font-bold text-white text-xs">{systemTelemetry.system}</span>
              </div>
            </div>
          </div>

          {/* Ollama Status */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">🤖 Ollama Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Available:</span>
                <span className={`font-bold ${ollamaTelemetry.available ? 'text-green-400' : 'text-red-400'}`}>
                  {ollamaTelemetry.available ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Models:</span>
                <span className="font-bold text-white">{ollamaTelemetry.running_models}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Memory:</span>
                <span className="font-bold text-white">{ollamaTelemetry.total_memory_usage_gb}GB</span>
              </div>
            </div>
          </div>

          {/* Violations Summary */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">🚨 Violations</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-red-400 mb-2">{violations.length}</div>
              <div className="text-slate-400">Total Detected</div>
              {violations.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  Latest: {new Date(violations[0].timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 space-y-6 overflow-y-auto">
          {err && (
            <div className="bg-red-900/50 border border-red-800 rounded-xl p-4">
              <div className="text-red-200">Error: {err}</div>
            </div>
          )}

          {/* Chart */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <ChartSelector
              data={data}
              stats={stats}
              timeMode={timeMode}
              violations={violations}
            />
          </div>

          {/* Violations List */}
          {violations.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">📋 Recent Violations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {violations.slice(0, 10).map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => setSelectedViolation(v)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            v.rule === "R1" ? "bg-red-900 text-red-200" :
                            v.rule === "R2" ? "bg-yellow-900 text-yellow-200" :
                            "bg-blue-900 text-blue-200"
                          }`}>
                            {v.rule}
                          </span>
                          <span className="text-slate-300 text-sm">ID #{v.id}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(v.timestamp).toLocaleString()} • 
                          σ: {v.deviation_sigma?.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-400">
                          {v.latency_ms?.toFixed(0)}ms
                        </div>
                        <div className="text-xs text-slate-400">{v.model}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Copilot */}
          <CopilotWidget />
        </div>
      </div>
    </div>
  );
}