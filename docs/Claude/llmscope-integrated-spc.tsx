import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, AlertTriangle, Target, Activity, Sparkles, Timer, BarChart3, TrendingDown, Home, Settings } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, ReferenceLine, ComposedChart } from 'recharts';

export default function LLMscopeIntegrated() {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');

  // Simulated real-time data
  const [data, setData] = useState([]);
  const [cognitiveMetrics, setCognitiveMetrics] = useState({
    overall: 58,
    contextUtil: 64,
    tokenEntropy: 4.8,
    perplexity: 42.3,
    vocabularyDiversity: 0.73,
    semanticCoherence: 0.82,
    ambiguityScore: 0.28,
    attentionLoad: 67,
    memoryPressure: 58
  });

  // Generate SPC data with cognitive metrics
  useEffect(() => {
    const generateData = () => {
      const newData = Array.from({ length: 50 }, (_, i) => {
        const baseLatency = 150 + Math.sin(i / 8) * 50;
        const entropy = 4.5 + Math.random() * 1.5;
        const perplexity = 35 + Math.random() * 25;
        
        return {
          index: i + 1,
          timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString(),
          latency: Math.max(50, baseLatency + (Math.random() - 0.5) * 40),
          tokenEntropy: entropy,
          perplexity: perplexity,
          contextUsage: 40 + Math.random() * 40,
          vocabularyDiv: 0.6 + Math.random() * 0.25,
          cognitiveLoad: 40 + Math.sin(i / 10) * 30 + Math.random() * 15,
          tokensIn: 50 + Math.floor(Math.random() * 200),
          tokensOut: 100 + Math.floor(Math.random() * 400)
        };
      });
      setData(newData);
    };

    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate SPC statistics
  const latencies = data.map(d => d.latency);
  const mean = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const stdDev = Math.sqrt(
    latencies.reduce((a, b) => a + (b - mean) ** 2, 0) / (latencies.length || 1)
  );
  const ucl = mean + 3 * stdDev;
  const lcl = Math.max(0, mean - 3 * stdDev);

  // Check Nelson Rules violations
  const violations = data.map((d, i) => {
    const rules = [];
    // Rule 1: Beyond 3σ
    if (d.latency > ucl || d.latency < lcl) rules.push('Rule 1');
    // Rule 2: High cognitive load
    if (d.cognitiveLoad > 80) rules.push('High CL');
    // Rule 3: High perplexity
    if (d.perplexity > 60) rules.push('High PPL');
    return { index: i, rules, hasViolation: rules.length > 0 };
  }).filter(v => v.hasViolation);

  const screens = {
    overview: <OverviewScreen data={data} cognitiveMetrics={cognitiveMetrics} violations={violations} />,
    spc: <SPCScreen data={data} mean={mean} stdDev={stdDev} ucl={ucl} lcl={lcl} violations={violations} />,
    cognitive: <CognitiveScreen data={data} cognitiveMetrics={cognitiveMetrics} />,
    analysis: <AnalysisScreen data={data} />
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Header with Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  LLMscope Pro
                </h1>
                <p className="text-sm text-gray-400">SPC + Cognitive Load Monitoring</p>
              </div>
            </div>
            <div className="flex gap-3">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
              <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <NavTab 
              active={activeScreen === 'overview'} 
              onClick={() => setActiveScreen('overview')}
              icon={<Home className="w-4 h-4" />}
              label="Overview"
            />
            <NavTab 
              active={activeScreen === 'spc'} 
              onClick={() => setActiveScreen('spc')}
              icon={<TrendingDown className="w-4 h-4" />}
              label="SPC Control Charts"
            />
            <NavTab 
              active={activeScreen === 'cognitive'} 
              onClick={() => setActiveScreen('cognitive')}
              icon={<Brain className="w-4 h-4" />}
              label="Cognitive Metrics"
            />
            <NavTab 
              active={activeScreen === 'analysis'} 
              onClick={() => setActiveScreen('analysis')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Advanced Analysis"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {screens[activeScreen]}
      </div>
    </div>
  );
}

function NavTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        active 
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
          : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function OverviewScreen({ data, cognitiveMetrics, violations }) {
  const latest = data[data.length - 1] || {};
  
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-2xl border ${violations.length > 0 ? 'bg-red-500/10 border-red-500/40' : 'bg-green-500/10 border-green-500/40'} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              System Status: {violations.length > 0 ? '⚠️ Anomalies Detected' : '✅ All Systems Normal'}
            </h2>
            <p className="text-gray-400">
              {violations.length} active violations | Overall Cognitive Load: {cognitiveMetrics.overall}/100
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-purple-400">{data.length}</div>
            <div className="text-sm text-gray-400">Samples Collected</div>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickMetric 
          label="Latency (Latest)"
          value={`${latest.latency?.toFixed(0) || 0} ms`}
          trend="+5%"
          icon={<Zap className="w-5 h-5 text-blue-400" />}
        />
        <QuickMetric 
          label="Token Entropy"
          value={latest.tokenEntropy?.toFixed(2) || '0'}
          trend="-0.2"
          icon={<Sparkles className="w-5 h-5 text-yellow-400" />}
        />
        <QuickMetric 
          label="Perplexity"
          value={latest.perplexity?.toFixed(1) || '0'}
          trend="-3.1"
          icon={<Brain className="w-5 h-5 text-purple-400" />}
        />
        <QuickMetric 
          label="Cognitive Load"
          value={`${latest.cognitiveLoad?.toFixed(0) || 0}%`}
          trend="+8%"
          icon={<Activity className="w-5 h-5 text-pink-400" />}
        />
      </div>

      {/* Combined SPC + Cognitive Chart */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Real-Time Monitoring: Latency + Cognitive Load
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="index" stroke="#64748b" />
            <YAxis yAxisId="left" stroke="#64748b" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" label={{ value: 'Cognitive Load', angle: 90, position: 'insideRight' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            
            {/* Latency Line */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="latency" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Latency (ms)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const violation = violations.find(v => v.index === payload.index - 1);
                if (violation) {
                  return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} />;
                }
                return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
              }}
            />
            
            {/* Cognitive Load Area */}
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cognitiveLoad"
              fill="#a855f7"
              fillOpacity={0.2}
              stroke="#a855f7"
              strokeWidth={2}
              name="Cognitive Load"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Violations Panel */}
      {violations.length > 0 && (
        <div className="bg-red-900/20 rounded-xl border border-red-700 p-6">
          <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Violations ({violations.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {violations.slice(0, 6).map((v, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-red-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-200">Sample #{v.index + 1}</span>
                  <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                    {v.rules.length} rule{v.rules.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {v.rules.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SPCScreen({ data, mean, stdDev, ucl, lcl, violations }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-6">Statistical Process Control Charts</h2>
        
        {/* Control Statistics */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Mean (μ)" value={`${mean.toFixed(1)} ms`} />
          <StatCard label="Std Dev (σ)" value={`${stdDev.toFixed(2)} ms`} />
          <StatCard label="UCL (+3σ)" value={`${ucl.toFixed(1)} ms`} color="text-orange-400" />
          <StatCard label="LCL (-3σ)" value={`${lcl.toFixed(1)} ms`} color="text-orange-400" />
          <StatCard label="Violations" value={violations.length} color="text-red-400" />
        </div>

        {/* Latency SPC Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="index" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            
            {/* Control Limits */}
            <ReferenceLine y={ucl} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'UCL', fill: '#f97316', fontSize: 12 }} />
            <ReferenceLine y={mean} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Mean', fill: '#10b981', fontSize: 12 }} />
            <ReferenceLine y={lcl} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'LCL', fill: '#f97316', fontSize: 12 }} />
            
            {/* Data Line */}
            <Line
              type="monotone"
              dataKey="latency"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const violation = violations.find(v => v.index === payload.index - 1);
                if (violation) {
                  return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} />;
                }
                return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Additional SPC Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Context Usage SPC */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold mb-4">Context Usage Control Chart</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
              <Line type="monotone" dataKey="contextUsage" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Perplexity SPC */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold mb-4">Perplexity Control Chart</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="perplexity" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CognitiveScreen({ data, cognitiveMetrics }) {
  const latest = data[data.length - 1] || {};
  
  const radarData = [
    { metric: 'Context', value: cognitiveMetrics.contextUtil, fullMark: 100 },
    { metric: 'Entropy', value: (cognitiveMetrics.tokenEntropy / 8) * 100, fullMark: 100 },
    { metric: 'Coherence', value: cognitiveMetrics.semanticCoherence * 100, fullMark: 100 },
    { metric: 'Attention', value: cognitiveMetrics.attentionLoad, fullMark: 100 },
    { metric: 'Memory', value: cognitiveMetrics.memoryPressure, fullMark: 100 },
    { metric: 'Clarity', value: (1 - cognitiveMetrics.ambiguityScore) * 100, fullMark: 100 }
  ];

  return (
    <div className="space-y-6">
      {/* Cognitive Profile */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-xl font-bold mb-4">Cognitive Profile Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" />
              <PolarRadiusAxis stroke="#94a3b8" />
              <Radar name="Current" dataKey="value" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-xl font-bold mb-4">Token Entropy Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="entropyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 8]} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Area type="monotone" dataKey="tokenEntropy" stroke="#facc15" fillOpacity={1} fill="url(#entropyGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <CognitiveMetricDetail
          title="Token Entropy"
          value={latest.tokenEntropy?.toFixed(2) || '0'}
          unit="bits"
          formula="H(X) = -Σ p(x) * log₂(p(x))"
          description="Measures unpredictability in token selection. Higher = more creative output."
          status={latest.tokenEntropy > 5 ? 'good' : latest.tokenEntropy > 4 ? 'normal' : 'warning'}
        />
        <CognitiveMetricDetail
          title="Perplexity"
          value={latest.perplexity?.toFixed(1) || '0'}
          unit=""
          formula="PPL = 2^H(X)"
          description="Model's confidence level. Lower = more confident predictions."
          status={latest.perplexity < 40 ? 'good' : latest.perplexity < 60 ? 'normal' : 'warning'}
        />
        <CognitiveMetricDetail
          title="Vocabulary Diversity"
          value={latest.vocabularyDiv?.toFixed(3) || '0'}
          unit="TTR"
          formula="unique_tokens / total_tokens"
          description="Lexical richness measure. Higher = more varied word choice."
          status={latest.vocabularyDiv > 0.7 ? 'good' : latest.vocabularyDiv > 0.5 ? 'normal' : 'warning'}
        />
      </div>
    </div>
  );
}

function AnalysisScreen({ data }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-6">Correlation Analysis</h2>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" dataKey="perplexity" name="Perplexity" stroke="#64748b" />
            <YAxis type="number" dataKey="latency" name="Latency (ms)" stroke="#64748b" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
            <Scatter name="Samples" data={data} fill="#8b5cf6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold mb-4">Token Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="tokensIn" fill="#3b82f6" name="Tokens In" />
              <Bar dataKey="tokensOut" fill="#10b981" name="Tokens Out" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold mb-4">Cognitive Load Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Area type="monotone" dataKey="cognitiveLoad" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function QuickMetric({ label, value, trend, icon }) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xs text-gray-500">{trend}</span>
      </div>
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-100' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CognitiveMetricDetail({ title, value, unit, formula, description, status }) {
  const statusColors = {
    good: 'border-green-500/30 bg-green-500/5',
    normal: 'border-blue-500/30 bg-blue-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5'
  };

  return (
    <div className={`rounded-xl border ${statusColors[status]} backdrop-blur-sm p-5`}>
      <h4 className="text-lg font-bold text-gray-100 mb-2">{title}</h4>
      <div className="text-3xl font-bold text-purple-400 mb-3">{value} <span className="text-sm text-gray-400">{unit}</span></div>
      <div className="bg-slate-800/50 rounded p-2 mb-3">
        <code className="text-xs text-cyan-400 font-mono">{formula}</code>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}