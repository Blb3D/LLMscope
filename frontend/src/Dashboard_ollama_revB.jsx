import React, { useEffect, useState, useCallback, useMemo } from "react";
import ChartSelector from "./components/charts/ChartSelector";
import CopilotWidget from "./components/CopilotWidget";
import OllamaTelemetry from "./components/OllamaTelemetry";
// import ViolationZoomedChart from "./components/ViolationZoomedChart";
// import ViolationReport from "./components/ViolationReport";

/**
 * LLMscope Dashboard - Real-time SPC Monitoring for LLM Performance
 * 
 * 🌐 DASHBOARD LOCATION: http://localhost:8081
 * 🔌 API ENDPOINT: http://localhost:8000
 * 🔑 API KEY: dev-123
 * 
 * Features:
 * - Live mode: Last 90 data points with 1-second updates
 * - Historical modes: 6h/24h with full data access  
 * - Complete SPC statistics (Mean, Std Dev, UCL, LCL, P95)
 * - Nelson Rules violation detection (R1, R2, R3)
 * - System telemetry monitoring
 * - Violation acknowledgment and resolution
 * - CSV export functionality
 * 
 * Architecture:
 * - Frontend: React + Recharts + Tailwind CSS (Port 8081)
 * - Backend: FastAPI + SQLite (Port 8000) 
 * - Monitor: Continuous data collection service
 * - Docker: Fully containerized deployment
 */

const FALLBACK_MODELS = [
  "llama3.2:1b",
  "llama3.2:3b", 
  "llama3.2",
  "gemma3:1b",
  "gemma3:4b",
  "qwen2.5:0.5b-instruct",
  "mistral",
  "llama3",
  "llama2",
  "gpt-oss:20b",
];

export default function Dashboard_ollama_revB() {
  const [provider, setProvider] = useState("ollama");
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [model, setModel] = useState("llama3.2:1b");
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
  const [mounted, setMounted] = useState(false);
  const [acknowledgeInput, setAcknowledgeInput] = useState("");
  const [loadingAck, setLoadingAck] = useState(false);
  const [ackError, setAckError] = useState("");
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotViolation, setCopilotViolation] = useState(null);
  const [copilotStatus, setCopilotStatus] = useState({ available: false, modelCount: 0 });
  const [loading, setLoading] = useState({ spc: false, violations: false, telemetry: false });
  const [violationView, setViolationView] = useState("new"); // "new", "analyzed", "fixed"
  const [analyzedViolations, setAnalyzedViolations] = useState(new Set());
  const [fixedViolations, setFixedViolations] = useState(new Set());
  const [showZoomedChart, setShowZoomedChart] = useState(false);
  const [zoomedViolation, setZoomedViolation] = useState(null);
  const [violationStats, setViolationStats] = useState({ total: 0, displayed: 0 });
  const [featureFlags, setFeatureFlags] = useState({ enhanced_telemetry: false });

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
      const merged = [...new Set([...FALLBACK_MODELS, ...unique])];
      setModels(merged.sort());
    } catch (e) {
      console.warn("fetchModels error", e);
      setModels(FALLBACK_MODELS);
    }
  }, []);

  // Fetch feature flags
  const fetchFeatureFlags = useCallback(async () => {
    try {
      const r = await fetch("/api/feature-flags", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await r.json();
      setFeatureFlags(j);
    } catch (e) {
      console.warn("fetchFeatureFlags error", e);
    }
  }, []);

  // Check AI Copilot status
  const fetchCopilotStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/copilot/test", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = await r.json();
      setCopilotStatus({
        available: j.success && j.ollama_available,
        modelCount: j.available_models?.length || 0,
        recommendedModels: j.recommended_models || []
      });
    } catch (e) {
      console.warn("fetchCopilotStatus error", e);
      setCopilotStatus({ available: false, modelCount: 0 });
    }
  }, []);

  // Fetch SPC chart data (telemetry)
  const fetchSPC = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, spc: true }));
      const q = new URLSearchParams({ 
        hours: hours.toString()
      });
      
      // No point limits - let each chart component handle its own data constraints
      
      if (provider) q.append("provider", provider);
      if (model) q.append("model", model);

      const r = await fetch(`/api/stats/spc?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      console.log(`[Dashboard] API returned ${j.timestamps?.length || 0} points for ${hours}h request`);

      let series = (j.timestamps || []).map((t, i) => ({
        t,
        y: Number(j.values?.[i] || 0) / 1000,
        model: j.models?.[i] || "unknown",
        provider: j.providers?.[i] || "unknown",
        // Enhanced telemetry (P0-1)
        total_duration: j.total_durations?.[i] || 0,
        load_duration: j.load_durations?.[i] || 0,
        prompt_eval_duration: j.prompt_eval_durations?.[i] || 0,
        eval_duration: j.eval_durations?.[i] || 0,
        prompt_count: j.prompt_counts?.[i] || 0,
        eval_count: j.eval_counts?.[i] || 0,
      }));

      console.log(`[Dashboard] Created series with ${series.length} points`);
      const totalCount = series.length;
      
      // For Live mode, calculate stats from last 90 points to match chart display
      // For Historical modes, use all data
      const statsData = timeMode === "live" ? series.slice(-90) : series;
      const values = statsData.map((v) => v.y);
      let statsObj = {};

      console.log(`[Dashboard] Calculating stats from ${statsData.length} points (mode: ${timeMode})`);

      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        const ucl = mean + 3 * std;
        const lcl = Math.max(0, mean - 3 * std);

        statsObj = {
          count: statsData.length, // Count should match what's displayed on chart
          totalAvailable: totalCount, // Track total points available from API
          mean,
          std,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          ucl,
          lcl,
        };
      }

      console.log(`[Dashboard] Stats calculated: mean=${statsObj.mean?.toFixed(3)}, ucl=${statsObj.ucl?.toFixed(3)}, lcl=${statsObj.lcl?.toFixed(3)}`);
      console.log(`[Dashboard] Setting data with ${series.length} points`);
      setData(series);
      setStats(statsObj);
      setErr("");
      setLoading(prev => ({ ...prev, spc: false }));
    } catch (e) {
      console.error("fetchSPC:", e);
      setErr(e.message);
      setLoading(prev => ({ ...prev, spc: false }));
    }
  }, [provider, model, hours, timeMode]);

  // Fetch violations from database (server-side detected)
  const fetchViolations = useCallback(async () => {
    try {
      const q = new URLSearchParams({
        hours: hours.toString() // Respect the selected time window
      });
      if (model) q.append("model", model);
      
      // Different limits based on time window
      if (timeMode === "live") {
        q.append("limit", "50");   // Live: recent violations only
      } else if (timeMode === "6h") {
        q.append("limit", "200");  // 6h: more violations
      } else {
        q.append("limit", "500");  // 24h: many violations
      }

      const r = await fetch(`/api/violations?${q.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const response = await r.json();
      
      // Handle new API response format
      const vios = response.violations || response; // Support both old and new format
      const totalCount = response.total_count || vios.length;
      const displayedCount = response.displayed_count || vios.length;
      
      // Sort by timestamp descending
      vios.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setViolations(vios);
      setViolationStats({ total: totalCount, displayed: displayedCount });
    } catch (e) {
      console.warn("fetchViolations error:", e);
      setViolations([]);
    }
  }, [model, hours, timeMode]);

  // Fetch system telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, telemetry: true }));
      const r = await fetch("/api/system", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const j = await r.json();
        console.log("Telemetry data:", j); // Debug log
        
        // Set backward compatible telemetry state
        setTelemetry({
          cpu: j.cpu || 0,
          memory: j.memory || 0,
          gpu: j.gpu || 0
        });
        
        // Set detailed system telemetry
        setSystemTelemetry({
          cpu: j.cpu || 0,
          memory: j.memory || 0,
          gpu: j.gpu || 0,
          gpu_memory: j.gpu_memory || 0,
          system: j.system || '',
          release: j.release || '',
          timestamp: j.timestamp || ''
        });
        
        // Set Ollama telemetry
        setOllamaTelemetry(j.ollama || { available: false, running_models: 0, models: [] });
      }
    } catch (e) {
      console.warn("telemetry:", e);
    } finally {
      setLoading(prev => ({ ...prev, telemetry: false }));
    }
  }, []);

  // Setup initial fetches and intervals
  useEffect(() => {
    fetchFeatureFlags();
    fetchModels();
    fetchCopilotStatus();
  }, [provider, fetchModels, fetchCopilotStatus, fetchFeatureFlags]);

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

  // Check AI Copilot status every 30 seconds
  useEffect(() => {
    const i = setInterval(fetchCopilotStatus, 30000);
    return () => clearInterval(i);
  }, [fetchCopilotStatus]);

  // Filter violations based on current view
  const filteredViolations = useMemo(() => {
    const newViolations = violations.filter(v => 
      !analyzedViolations.has(v.id) && !fixedViolations.has(v.id)
    );
    const analyzed = violations.filter(v => 
      analyzedViolations.has(v.id) && !fixedViolations.has(v.id)
    );
    const fixed = violations.filter(v => fixedViolations.has(v.id));

    switch (violationView) {
      case "new": return newViolations;
      case "analyzed": return analyzed;
      case "fixed": return fixed;
      default: return newViolations;
    }
  }, [violations, analyzedViolations, fixedViolations, violationView]);

  // Mark violation as analyzed
  const markAsAnalyzed = useCallback((violationId) => {
    setAnalyzedViolations(prev => new Set([...prev, violationId]));
  }, []);

  // Mark violation as fixed with action taken
  const markAsFixed = useCallback((violationId, actionTaken) => {
    setFixedViolations(prev => new Set([...prev, violationId]));
    // You could store actionTaken in localStorage or send to backend
    console.log(`Violation ${violationId} fixed with action: ${actionTaken}`);
  }, []);

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

  const isLive = data.length > 0 && timeMode === "live";

  const ruleDescriptions = {
    R1: "Point beyond 3σ from mean",
    R2: "9+ points on same side of mean",
    R3: "6+ points in increasing/decreasing trend",
  };

  const violationCounts = useMemo(() => {
    const counts = { new: 0, analyzed: 0, fixed: 0 };
    if (!violations || !Array.isArray(violations)) return counts;
    
    violations.forEach(v => {
      try {
        if (fixedViolations.has(v.id)) {
          counts.fixed++;
        } else if (analyzedViolations.has(v.id)) {
          counts.analyzed++;
        } else {
          counts.new++;
        }
      } catch (e) {
        console.warn('Error processing violation:', v, e);
        counts.new++; // Default to new if error
      }
    });
    return counts;
  }, [violations, analyzedViolations, fixedViolations]);

  const generateAnalyticsReport = useCallback(() => {
    const timestamp = new Date().toLocaleString();
    const reportData = {
      timestamp,
      violations: violations.length,
      systemTelemetry,
      ollamaTelemetry,
      violationCounts
    };
    
    const reportContent = `# LLMscope Analytics Report
Generated: ${timestamp}

## Summary
- Total Violations: ${violations.length}
- New: ${violationCounts.new}
- Analyzed: ${violationCounts.analyzed}  
- Fixed: ${violationCounts.fixed}

## System Status
- CPU: ${systemTelemetry.cpu}%
- Memory: ${systemTelemetry.memory}%
- GPU: ${systemTelemetry.gpu}%
- System: ${systemTelemetry.system} ${systemTelemetry.release}

## Ollama Status
- Available: ${ollamaTelemetry.available}
- Running Models: ${ollamaTelemetry.running_models}
- Memory Usage: ${ollamaTelemetry.total_memory_usage_gb}GB
`;

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llmscope-report-${timestamp.replace(/[/:]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [violations, systemTelemetry, ollamaTelemetry, violationCounts]);

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
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-base"
              >
                <option value="ollama">🦙 Ollama</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-base"
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
              <label className="text-sm font-bold text-slate-400 uppercase">Window</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => {
                    setTimeMode("live");
                    setHours(1);
                  }}
                  className={`px-2 py-2 rounded text-sm font-bold ${
                    timeMode === "live" ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => {
                    setTimeMode("6h");
                    setHours(6);
                  }}
                  className={`px-2 py-2 rounded text-sm font-bold ${
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
                  className={`px-2 py-2 rounded text-sm font-bold ${
                    timeMode === "24h" ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  24h
                </button>
              </div>
            </div>
          </div>

          {stats && Object.keys(stats).length > 0 && stats.mean && (
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
              <h3 className="text-base font-bold text-cyan-300">SPC Stats ({stats.count || 0} pts)</h3>
              
              {/* Core Statistics */}
              <div className="space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean:</span>
                  <span className="font-bold text-emerald-400">{stats.mean.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Std Dev:</span>
                  <span className="font-bold text-purple-400">{stats.std.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">UCL:</span>
                  <span className="font-bold text-red-400">{stats.ucl.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LCL:</span>
                  <span className="font-bold text-red-400">{stats.lcl.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">P95:</span>
                  <span className="font-bold text-amber-400">{stats.p95.toFixed(3)}s</span>
                </div>
              </div>

              {/* Violation Breakdown */}
              <div className="border-t border-slate-700 pt-3">
                <div className="text-sm font-bold text-slate-400 uppercase mb-2">Nelson Rules</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">R1:</span>
                    <span className="font-bold text-red-400">{violations.filter(v => v.rule === 'R1').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">R2:</span>
                    <span className="font-bold text-orange-400">{violations.filter(v => v.rule === 'R2').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">R3:</span>
                    <span className="font-bold text-yellow-400">{violations.filter(v => v.rule === 'R3').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-white">{violations.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-orange-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-cyan-300">🖥️ System</h3>
              <div className={`w-2 h-2 rounded-full ${
                telemetry.cpu > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`} />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU</span>
                <span className={`font-bold ${
                  telemetry.cpu > 80 ? "text-red-400" : 
                  telemetry.cpu > 60 ? "text-yellow-400" : "text-cyan-400"
                }`}>{(telemetry.cpu || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    telemetry.cpu > 80 ? "bg-red-500" : 
                    telemetry.cpu > 60 ? "bg-yellow-500" : "bg-cyan-500"
                  }`}
                  style={{ width: `${Math.min(100, telemetry.cpu || 0)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory</span>
                <span className={`font-bold ${
                  telemetry.memory > 80 ? "text-red-400" : 
                  telemetry.memory > 60 ? "text-yellow-400" : "text-purple-400"
                }`}>{(telemetry.memory || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    telemetry.memory > 80 ? "bg-red-500" : 
                    telemetry.memory > 60 ? "bg-yellow-500" : "bg-purple-500"
                  }`}
                  style={{ width: `${Math.min(100, telemetry.memory || 0)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>GPU</span>
                <span className={`font-bold ${
                  telemetry.gpu === undefined || telemetry.gpu === null ? "text-slate-500" :
                  telemetry.gpu > 80 ? "text-red-400" : 
                  telemetry.gpu > 60 ? "text-yellow-400" : "text-emerald-400"
                }`}>
                  {telemetry.gpu === undefined || telemetry.gpu === null ? "N/A" : `${telemetry.gpu.toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded h-2">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    telemetry.gpu === undefined || telemetry.gpu === null ? "bg-slate-600" :
                    telemetry.gpu > 80 ? "bg-red-500" : 
                    telemetry.gpu > 60 ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${telemetry.gpu === undefined || telemetry.gpu === null ? 0 : Math.min(100, telemetry.gpu || 0)}%` }}
                />
              </div>
              {(telemetry.gpu === undefined || telemetry.gpu === null) && (
                <div className="text-xs text-slate-500 mt-1">GPU monitoring not available</div>
              )}
            </div>
          </div>

          {/* Enhanced Ollama Telemetry (P0-1) */}
          {featureFlags.enhanced_telemetry && provider === "ollama" && (
            <OllamaTelemetry 
              data={data.map(d => ({
                ...d,
                eval_duration: d.eval_duration || 0,
                eval_count: d.eval_count || 0,
                load_duration: d.load_duration || 0,
                prompt_eval_duration: d.prompt_eval_duration || 0,
                prompt_count: d.prompt_count || 0,
              }))}
              latestPoint={data.length > 0 ? {
                ...data[data.length - 1],
                eval_duration: data[data.length - 1].eval_duration || 0,
                eval_count: data[data.length - 1].eval_count || 0,
                load_duration: data[data.length - 1].load_duration || 0,
                prompt_eval_duration: data[data.length - 1].prompt_eval_duration || 0,
                prompt_count: data[data.length - 1].prompt_count || 0,
              } : null}
            />
          )}

          {/* AI Copilot Status */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-purple-300">🤖 AI Copilot</h3>
              <div className={`w-2 h-2 rounded-full ${
                copilotStatus.available ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`} />
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${
                  copilotStatus.available ? "text-emerald-400" : "text-red-400"
                }`}>
                  {copilotStatus.available ? "🟢 Online" : "🔴 Offline"}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Models:</span>
                <span className="font-bold text-cyan-400">{copilotStatus.modelCount}</span>
              </div>
              
              {copilotStatus.recommendedModels && copilotStatus.recommendedModels.length > 0 && (
                <div className="text-xs text-slate-400 mt-2">
                  <div>Recommended: {copilotStatus.recommendedModels[0]}</div>
                </div>
              )}
              
              {telemetry.ollama?.available && (
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div>Running Models: {telemetry.ollama.running_models}</div>
                  <div>VRAM Usage: {telemetry.ollama.total_memory_usage_gb}GB</div>
                </div>
              )}
              
              {!copilotStatus.available && (
                <div className="text-xs text-yellow-300 mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-600/30">
                  ⚠️ Install Ollama to enable AI analysis
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-blue-500/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-base font-bold text-blue-300">⚡ Quick Actions</h3>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/test/inject-violation', {
                    method: 'POST',
                    headers: { 
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type: 'mixed' })
                  });
                  if (response.ok) {
                    setTimeout(() => {
                      fetchViolations();
                      fetchSPC();
                    }, 1000);
                  }
                } catch (e) {
                  console.warn('Inject test violation failed:', e);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded px-3 py-2 text-sm font-bold text-white transition"
            >
              🧪 Add Test Violation
            </button>
            
            <div className="text-xs text-slate-400">
              Injects demo violations for testing AI Copilot analysis
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
            <div className="h-full flex flex-col">
              {/* Chart */}
              <div className="flex-1">
                <ChartSelector 
                  timeMode={timeMode}
                  data={data}
                  stats={stats}
                  violations={violations}
                />
              </div>
            </div>
          </div>

          {/* Violations Log - 40% */}
          {violations.length > 0 && (
            <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3 flex-shrink-0 p-4 border-b border-slate-800">
                <div className="flex gap-4">
                  <button
                    onClick={() => setViolationView("new")}
                    className={`px-3 py-1 rounded text-sm font-bold transition ${
                      violationView === "new" ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    🆕 New ({violationCounts.new})
                  </button>
                  <button
                    onClick={() => setViolationView("analyzed")}
                    className={`px-3 py-1 rounded text-sm font-bold transition ${
                      violationView === "analyzed" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    � Analyzed ({violations.filter(v => analyzedViolations.has(v.id) && !fixedViolations.has(v.id)).length})
                  </button>
                  <button
                    onClick={() => setViolationView("fixed")}
                    className={`px-3 py-1 rounded text-sm font-bold transition ${
                      violationView === "fixed" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    ✅ Fixed ({violations.filter(v => fixedViolations.has(v.id)).length})
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-slate-400">
                    Total: {violationStats.total} | Showing: {filteredViolations.length}
                  </span>
                  <button
                    onClick={exportViolationsCSV}
                    className="text-sm bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded"
                  >
                    📥 Export
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-4">
                {filteredViolations.slice(0, 50).map((v, i) => (
                  <div
                    key={i}
                    className={`rounded p-2 transition flex-shrink-0 ${
                      v.is_acknowledged
                        ? "bg-slate-800/30 border border-emerald-500/30"
                        : "bg-slate-800/50 hover:bg-slate-800 border border-slate-700"
                    }`}
                  >
                    <div 
                      onClick={() => {
                        setSelectedViolation(v);
                        setAcknowledgeInput("");
                        setAckError("");
                      }}
                      className="cursor-pointer"
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
                    
                    {/* AI Copilot Button */}
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedViolation(v);
                          setShowZoomedChart(true);
                          setCopilotViolation(v);
                          setShowCopilot(true);
                          markAsAnalyzed(v.id);
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded transition flex items-center gap-1 flex-1"
                      >
                        🤖 Analyze with AI Copilot
                      </button>
                      
                      {violationView === "analyzed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const action = prompt("What action was taken to fix this violation?");
                            if (action) {
                              markAsFixed(v.id, action);
                            }
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded transition"
                        >
                          ✅ Mark Fixed
                        </button>
                      )}
                    </div>
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
                    <div className="font-bold text-red-400">{selectedViolation.lcl_ms?.toFixed(0)}ms</div>
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

              {/* AI Copilot Section */}
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
                <h3 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                  🤖 AI Analysis
                  <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">NEW</span>
                </h3>
                <p className="text-xs text-blue-200 mb-3">
                  Get AI-powered explanations with business impact analysis and remediation steps
                </p>
                <button
                  onClick={() => {
                    setCopilotViolation(selectedViolation);
                    setShowCopilot(true);
                    setSelectedViolation(null); // Close modal
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded px-3 py-2 text-sm font-bold text-white transition"
                >
                  🧠 Analyze with AI Copilot
                </button>
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

      {/* Advanced Analytics Section */}
      {violations.length > 0 && (
        <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">📊 Advanced Analytics</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowZoomedChart(!showZoomedChart)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {showZoomedChart ? 'Hide' : 'Show'} Chart Analysis
              </button>
              <button 
                onClick={() => generateAnalyticsReport()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                📊 Generate Report
              </button>
            </div>
          </div>
          
          {showZoomedChart && violations.length > 0 && (
            <div className="mt-4 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                📊 Violation Analysis Dashboard
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{violations.length}</div>
                  <div className="text-sm text-slate-400">Total Violations</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{violationCounts.new}</div>
                  <div className="text-sm text-slate-400">New Violations</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{violationCounts.fixed}</div>
                  <div className="text-sm text-slate-400">Fixed Violations</div>
                </div>
              </div>
              
              <div className="text-sm text-slate-400">
                <div>Latest violation: {violations[0] ? new Date(violations[0].timestamp).toLocaleString() : 'None'}</div>
                <div>Most common rule: {violations.length > 0 ? 
                  Object.entries(violations.reduce((acc, v) => { acc[v.rule] = (acc[v.rule] || 0) + 1; return acc; }, {}))
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A' : 'N/A'
                }</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Copilot Widget */}
      <CopilotWidget 
        violation={showCopilot ? copilotViolation : null}
        apiKey="dev-123"
        onViolationUpdate={() => {
          fetchViolations();
          setShowCopilot(false);
          setCopilotViolation(null);
        }}
      />
    </div>
  );
}