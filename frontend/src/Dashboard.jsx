import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, DollarSign, Zap, TrendingUp, AlertCircle, Clock, Database, CheckCircle, XCircle } from 'lucide-react';

const LLMscopeDashboard = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    current: 0,
    mean: 0,
    stdDev: 0,
    p95: 0,
    min: 0,
    max: 0,
    totalCost: 0,
    todayCost: 0,
    requestCount: 0,
    errorRate: 0
  });
  const [violations, setViolations] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [provider, setProvider] = useState('openai');
  const dataRef = useRef([]);
  const countRef = useRef(0);

  // Nelson Rules implementation
  const checkNelsonRules = (values, mean, stdDev) => {
    if (values.length < 2 || stdDev === 0) return [];
    
    const violations = [];
    const latest = values[values.length - 1];
    const idx = values.length - 1;

    // Rule 1: Point beyond 3σ
    if (Math.abs(latest - mean) > 3 * stdDev) {
      violations.push({ 
        rule: 1, 
        index: idx, 
        severity: 'critical',
        message: `Latency spike: ${latest.toFixed(2)}s (>3σ from mean)`
      });
    }

    // Rule 2: 9 points on same side of mean
    if (values.length >= 9) {
      let count = 0;
      const side = values[values.length - 1] > mean;
      for (let i = values.length - 1; i >= Math.max(0, values.length - 9); i--) {
        if ((values[i] > mean) === side) count++;
        else break;
      }
      if (count === 9) {
        violations.push({ 
          rule: 2, 
          index: idx,
          severity: 'warning',
          message: '9 consecutive points on same side of mean'
        });
      }
    }

    // Rule 3: 6 points increasing or decreasing
    if (values.length >= 6) {
      let increasing = true, decreasing = true;
      for (let i = values.length - 1; i > Math.max(0, values.length - 6); i--) {
        if (values[i] <= values[i - 1]) increasing = false;
        if (values[i] >= values[i - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        violations.push({ 
          rule: 3, 
          index: idx,
          severity: 'warning',
          message: `Consistent ${increasing ? 'degradation' : 'improvement'} trend detected`
        });
      }
    }

    return violations;
  };

  // Simulate real API monitoring with more realistic patterns
  useEffect(() => {
    const interval = setInterval(() => {
      countRef.current += 1;
      const time = countRef.current;
      
      // Simulate different time-of-day patterns
      const hourOfDay = (time / 12) % 24;
      const peakHourMultiplier = hourOfDay >= 9 && hourOfDay <= 17 ? 1.3 : 1.0;
      
      // Base latency with occasional spikes
      const baseLatency = 1.5;
      const spike = Math.random() > 0.95 ? Math.random() * 3 : 0;
      const noise = (Math.random() - 0.5) * 0.4;
      const trend = Math.sin(time / 30) * 0.3;
      
      const latency = Math.max(0.5, baseLatency + trend + noise + spike) * peakHourMultiplier;
      
      // Token usage (random but realistic)
      const tokensIn = Math.floor(50 + Math.random() * 200);
      const tokensOut = Math.floor(100 + Math.random() * 400);
      
      // Cost calculation (OpenAI GPT-4 pricing as example)
      const costPerInputToken = 0.00003;
      const costPerOutputToken = 0.00006;
      const cost = (tokensIn * costPerInputToken) + (tokensOut * costPerOutputToken);

      const newPoint = {
        time: time,
        timestamp: new Date(Date.now() - (60 - time) * 5000).toISOString(),
        latency: parseFloat(latency.toFixed(3)),
        tokensIn,
        tokensOut,
        tokensTotal: tokensIn + tokensOut,
        cost: parseFloat(cost.toFixed(6)),
        success: Math.random() > 0.02, // 98% success rate
      };

      dataRef.current.push(newPoint);
      if (dataRef.current.length > 60) dataRef.current.shift();

      // Calculate statistics
      const latencies = dataRef.current.map(d => d.latency);
      const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const variance = latencies.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / latencies.length;
      const stdDev = Math.sqrt(variance);
      
      const sorted = [...latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];

      // Cost calculations
      const totalCost = dataRef.current.reduce((sum, d) => sum + d.cost, 0);
      const todayData = dataRef.current.filter(d => {
        const age = Date.now() - new Date(d.timestamp).getTime();
        return age < 24 * 60 * 60 * 1000;
      });
      const todayCost = todayData.reduce((sum, d) => sum + d.cost, 0);

      // Error rate
      const failures = dataRef.current.filter(d => !d.success).length;
      const errorRate = (failures / dataRef.current.length) * 100;

      const newViolations = checkNelsonRules(latencies, mean, stdDev);

      setData(dataRef.current.map((d, i) => ({
        ...d,
        violation: newViolations.some(v => v.index === i)
      })));

      setViolations(newViolations);
      setStats({
        current: latency,
        mean,
        stdDev,
        p95,
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        totalCost,
        todayCost,
        requestCount: dataRef.current.length,
        errorRate
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatCost = (cost) => `$${cost.toFixed(4)}`;
  const formatLatency = (lat) => `${lat.toFixed(2)}s`;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold">LLMscope</h1>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">MVP v0.1</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Real-time AI Performance Monitoring</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
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
            
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="cohere">Cohere</option>
              <option value="local">Local Model</option>
            </select>

            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition">
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Zap className="w-4 h-4" />
              Current Latency
            </div>
            <div className="text-3xl font-bold text-blue-400">{formatLatency(stats.current)}</div>
            <div className="text-xs text-slate-500 mt-1">Mean: {formatLatency(stats.mean)}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <TrendingUp className="w-4 h-4" />
              P95 Latency
            </div>
            <div className="text-3xl font-bold text-purple-400">{formatLatency(stats.p95)}</div>
            <div className="text-xs text-slate-500 mt-1">σ = {stats.stdDev.toFixed(3)}s</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              Today's Cost
            </div>
            <div className="text-3xl font-bold text-green-400">{formatCost(stats.todayCost)}</div>
            <div className="text-xs text-slate-500 mt-1">Total: {formatCost(stats.totalCost)}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Database className="w-4 h-4" />
              Requests
            </div>
            <div className="text-3xl font-bold text-amber-400">{stats.requestCount}</div>
            <div className="text-xs text-slate-500 mt-1">
              Errors: {stats.errorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Violations Alert */}
        {violations.length > 0 && (
          <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-300 mb-2">Performance Anomalies Detected</h3>
                <div className="space-y-1 text-sm text-red-200">
                  {violations.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${v.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                      {v.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Latency Chart with SPC */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Response Latency (SPC Analysis)
            </h2>
            <div className="text-xs text-slate-400">
              Last 60 requests • Live updating
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                label={{ value: 'Latency (seconds)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#3b82f6" 
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.violation) {
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={5} 
                        fill="#ef4444" 
                        stroke="#fca5a5" 
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle cx={cx} cy={cy} r={2} fill="#3b82f6" />;
                }}
                name="Latency"
              />
              <ReferenceLine 
                y={stats.mean} 
                stroke="#64748b" 
                strokeDasharray="5 5"
                label={{ value: `μ=${stats.mean.toFixed(2)}s`, position: 'right', fill: '#94a3b8', fontSize: 11 }}
              />
              <ReferenceLine 
                y={stats.mean + 3 * stats.stdDev} 
                stroke="#fca5a5" 
                strokeDasharray="3 3"
                label={{ value: '+3σ', position: 'right', fill: '#fca5a5', fontSize: 10 }}
              />
              <ReferenceLine 
                y={Math.max(0, stats.mean - 3 * stats.stdDev)} 
                stroke="#fca5a5" 
                strokeDasharray="3 3"
                label={{ value: '-3σ', position: 'right', fill: '#fca5a5', fontSize: 10 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost & Token Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Cost Over Time
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  formatter={(value) => formatCost(value)}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Token Usage</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="tokensIn" fill="#3b82f6" name="Input" stackId="a" />
                <Bar dataKey="tokensOut" fill="#8b5cf6" name="Output" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Session Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">Min Latency</div>
              <div className="text-xl font-semibold text-blue-300">{formatLatency(stats.min)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Max Latency</div>
              <div className="text-xl font-semibold text-red-300">{formatLatency(stats.max)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Avg Cost/Request</div>
              <div className="text-xl font-semibold text-green-300">
                {stats.requestCount > 0 ? formatCost(stats.totalCost / stats.requestCount) : '$0.0000'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Success Rate</div>
              <div className="text-xl font-semibold text-emerald-300">
                {(100 - stats.errorRate).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-4 pb-2">
          <p>LLMscope MVP • Statistical Process Control for AI APIs</p>
          <p className="mt-1">Free Tier: Last 24 hours • Single provider • Upgrade for multi-provider, alerts & more</p>
        </div>
      </div>
    </div>
  );
};

export default LLMscopeDashboard;