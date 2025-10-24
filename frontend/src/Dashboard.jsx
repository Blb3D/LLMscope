import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Activity, DollarSign, Zap, TrendingUp, AlertCircle, Clock, Database,
  CheckCircle, XCircle
} from 'lucide-react';

const LLMscopeDashboard = () => {
  // ---------------- State ----------------
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    current: 0, mean: 0, stdDev: 0, p95: 0, min: 0, max: 0,
    totalCost: 0, todayCost: 0, requestCount: 0, errorRate: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  // refs for demo stream
  const dataRef = useRef([]);
  const countRef = useRef(0);

  // Backend API base (backend exposed as localhost:8081 on host)
  const API_BASE =
    window.location.hostname === "localhost"
      ? "http://localhost:8081"
      : "http://backend:8000";

  // --------------- Hybrid: Live or Demo ---------------
  useEffect(() => {
    let liveInterval;
    let demoInterval;

    async function testBackend() {
      try {
        const res = await fetch(`${API_BASE}/health`); // simple health endpoint
        if (!res.ok) throw new Error("health not ok");
        setIsConnected(true);
        setLiveMode(true);
        console.log("✅ Live backend detected, switching to real telemetry");
        await fetchLive();
        liveInterval = setInterval(fetchLive, 5000); // refresh every 5s
      } catch (e) {
        console.log("⚙️ Using representative demo data (no live backend)");
        setIsConnected(false);
        setLiveMode(false);
        startDemo();
      }
    }

    async function fetchLive() {
      try {
        // Expecting { logs: [...] } or a flat array; normalize both
        const res = await fetch(`${API_BASE}/api/stats`);
        if (!res.ok) throw new Error(`stats ${res.status}`);
        const result = await res.json();
        const logs = Array.isArray(result) ? result : (result.logs || []);

        const mapped = logs.map((r, i) => ({
          time: i,
          timestamp: r.timestamp || new Date().toISOString(),
          latency: r.latency ?? r.response_time ?? 0,
          tokensIn: r.tokens_in ?? r.tokensIn ?? 0,
          tokensOut: r.tokens_out ?? r.tokensOut ?? 0,
          tokensTotal: (r.tokens_in ?? 0) + (r.tokens_out ?? 0),
          cost: r.cost ?? 0,
          success: r.success ?? true,
        }));

        setData(mapped);

        // compute stats
        const latencies = mapped.map(d => d.latency).filter(n => typeof n === 'number');
        const mean = latencies.length
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0;
        const variance = latencies.length
          ? latencies.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / latencies.length
          : 0;
        const stdDev = Math.sqrt(variance || 0);

        setStats({
          current: mapped.at(-1)?.latency || 0,
          mean,
          stdDev,
          p95: latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0,
          min: latencies.length ? Math.min(...latencies) : 0,
          max: latencies.length ? Math.max(...latencies) : 0,
          totalCost: mapped.reduce((a, b) => a + (b.cost || 0), 0),
          todayCost: mapped.reduce((a, b) => a + (b.cost || 0), 0),
          requestCount: mapped.length,
          errorRate: (mapped.filter(d => !d.success).length / (mapped.length || 1)) * 100,
        });
        setIsConnected(true);
        setLiveMode(true);
      } catch (err) {
        console.warn("❌ Live fetch failed, reverting to demo:", err?.message || err);
        clearInterval(liveInterval);
        setIsConnected(false);
        setLiveMode(false);
        startDemo();
      }
    }

    function startDemo() {
      // reset demo stream & stats when falling back
      dataRef.current = [];
      countRef.current = 0;

      demoInterval = setInterval(() => {
        countRef.current += 1;
        const time = countRef.current;

        // representative latency around ~1.5s with noise
        const baseLatency = 1.5;
        const noise = (Math.random() - 0.5) * 0.4;
        const latency = Math.max(0.5, baseLatency + noise);

        const tokensIn = Math.floor(50 + Math.random() * 200);
        const tokensOut = Math.floor(100 + Math.random() * 400);
        const cost = (tokensIn * 0.00003) + (tokensOut * 0.00006);

        const newPoint = {
          time,
          timestamp: new Date().toISOString(),
          latency,
          tokensIn,
          tokensOut,
          tokensTotal: tokensIn + tokensOut,
          cost,
          success: Math.random() > 0.02, // 2% error rate for demo
        };

        dataRef.current.push(newPoint);
        if (dataRef.current.length > 60) dataRef.current.shift();

        const latencies = dataRef.current.map(d => d.latency);
        const mean = latencies.length
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0;
        const variance = latencies.length
          ? latencies.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / latencies.length
          : 0;
        const stdDev = Math.sqrt(variance || 0);

        setData([...dataRef.current]);
        setStats({
          current: latency,
          mean,
          stdDev,
          p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
          min: latencies.length ? Math.min(...latencies) : 0,
          max: latencies.length ? Math.max(...latencies) : 0,
          totalCost: dataRef.current.reduce((sum, d) => sum + (d.cost || 0), 0),
          todayCost: dataRef.current.reduce((sum, d) => sum + (d.cost || 0), 0),
          requestCount: dataRef.current.length,
          errorRate:
            (dataRef.current.filter(d => !d.success).length /
              (dataRef.current.length || 1)) * 100,
        });
      }, 1000);
    }

    testBackend();

    return () => {
      clearInterval(liveInterval);
      clearInterval(demoInterval);
    };
  }, []);

  // ---------------- UI helpers ----------------
  const StatCard = ({ icon: Icon, label, value, sub }) => (
    <div className="p-4 rounded-xl bg-[#0b1020] border border-[#1b2440] flex items-center gap-3">
      <div className="p-2 rounded-lg bg-[#0f1530] border border-[#1f2a4d]">
        <Icon className="w-5 h-5 text-blue-300" />
      </div>
      <div>
        <div className="text-sm text-blue-200/70">{label}</div>
        <div className="text-lg font-semibold text-blue-50">{value}</div>
        {sub && <div className="text-xs text-blue-200/50">{sub}</div>}
      </div>
    </div>
  );

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-[#050a1a] text-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LLMscope Dashboard</h1>
            <p className="text-sm text-blue-200/70">Latency • Cost • Reliability (live or demo)</p>
          </div>

          {/* Combined status: Connected/Disconnected + Live/Demo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">Disconnected</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {liveMode ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Live API</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Demo Mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Current Latency" value={`${stats.current.toFixed(3)}s`} sub="seconds" />
          <StatCard icon={TrendingUp} label="Mean ± σ" value={`${stats.mean.toFixed(3)}s`} sub={`σ = ${stats.stdDev.toFixed(3)}s`} />
          <StatCard icon={Clock} label="p95 Latency" value={`${stats.p95.toFixed(3)}s`} sub="tail performance" />
          <StatCard icon={AlertCircle} label="Errors" value={`${stats.errorRate.toFixed(1)}%`} sub={`${stats.requestCount} requests`} />
        </div>

        {/* Latency chart */}
        <div className="p-4 rounded-xl bg-[#0b1020] border border-[#1b2440]">
          <div className="flex items-center mb-3 gap-2">
            <Zap className="w-4 h-4 text-yellow-300" />
            <h2 className="text-sm font-semibold text-blue-100">Latency over Time</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a4d" />
                <XAxis dataKey="time" stroke="#93c5fd" />
                <YAxis stroke="#93c5fd" />
                <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid #1b2440', color: '#e2e8f0' }} />
                <Legend />
                <ReferenceLine y={stats.mean} stroke="#22c55e" strokeDasharray="3 3" label="mean" />
                <Line type="monotone" dataKey="latency" stroke="#60a5fa" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tokens & cost */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0b1020] border border-[#1b2440]">
            <div className="flex items-center mb-3 gap-2">
              <Activity className="w-4 h-4 text-indigo-300" />
              <h2 className="text-sm font-semibold text-blue-100">Tokens</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a4d" />
                  <XAxis dataKey="time" stroke="#93c5fd" />
                  <YAxis stroke="#93c5fd" />
                  <Tooltip
                    contentStyle={{
                      background: '#0b1020',
                      border: '1px solid #1b2440',
                      color: '#e2e8f0'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tokensIn" stackId="a" fill="#34d399" />
                  <Bar dataKey="tokensOut" stackId="a" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1020] border border-[#1b2440]">
            <div className="flex items-center mb-3 gap-2">
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <h2 className="text-sm font-semibold text-blue-100">Cost (demo or live)</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a4d" />
                  <XAxis dataKey="time" stroke="#93c5fd" />
                  <YAxis stroke="#93c5fd" />
                  <Tooltip
                    contentStyle={{
                      background: '#0b1020',
                      border: '1px solid #1b2440',
                      color: '#e2e8f0'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cost" stroke="#34d399" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LLMscopeDashboard;
