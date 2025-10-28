// ================================================
// Dashboard_ollama_revA.jsx - LLMscope SPC Gold Standard Dashboard
// ================================================
import React, { useEffect, useState, useMemo } from "react";
import SPCChart_ollama_revA from "./SPCChart_ollama_revA";

export default function Dashboard_ollama_revA() {
  const [provider, setProvider] = useState("ollama");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [hours, setHours] = useState(24);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [violations, setViolations] = useState([]);
  const [err, setErr] = useState("");

  const apiKey = "dev-123"; // adjust if using env

  async function fetchModels() {
    try {
      const r = await fetch("/api/ollama/models", { headers: { Authorization: `Bearer ${apiKey}` } });
      const j = await r.json();
      setModels(j.models || []);
    } catch (e) { console.warn("model fetch error", e); }
  }

  async function fetchSPC() {
    try {
      const q = new URLSearchParams({ hours });
      if (provider) q.append("provider", provider);
      if (model) q.append("model", model);
      const r = await fetch(`/api/stats/spc?${q.toString()}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const j = await r.json();
      setData(j.series || []);
      setStats(j.stats || {});
      setViolations(j.violations || []);
      setErr("");
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  async function exportCSV() {
    try {
      const q = new URLSearchParams({ hours });
      if (provider) q.append("provider", provider);
      if (model) q.append("model", model);
      const r = await fetch(`/api/report.csv?${q.toString()}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const j = await r.json();
      if (j.ok && j.csv) {
        const blob = new Blob([j.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const fn = `llmscope_report_${provider || "all"}_${model || "any"}_${hours}h.csv`;
        const a = document.createElement("a");
        a.href = url; a.download = fn; a.click(); URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  }

  useEffect(() => {
    fetchModels();
    fetchSPC();
    const id = setInterval(fetchSPC, 4000);
    return () => clearInterval(id);
  }, [provider, model, hours]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">LLMscope SPC Dashboard</h1>
            <span className="text-sm text-slate-400">Live model performance</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={provider} onChange={(e)=>setProvider(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <select value={model} onChange={(e)=>setModel(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
              <option value="">All Models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={hours} onChange={(e)=>setHours(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
              {[1,6,12,24,48,72].map(h=><option key={h} value={h}>{h}h</option>)}
            </select>
            <button onClick={exportCSV} className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-3 py-2 rounded-lg text-sm shadow">Export CSV</button>
          </div>
        </div>

        {err && <div className="bg-red-950/50 border border-red-800 text-red-200 p-3 rounded-xl">{err}</div>}

        <SPCChart_ollama_revA data={data} stats={stats} violations={violations} />

        {stats && stats.mean ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
            {["mean","std","p95","p99","ucl","lcl"].map(k=>(
              <div key={k} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
                <div className="text-xs text-slate-400">{k.toUpperCase()}</div>
                <div className="text-xl font-semibold">{stats[k]?.toFixed(3)}s</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 mt-8">Waiting for live data...</div>
        )}
      </div>
    </div>
  );
}
