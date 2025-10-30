import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// Shared color scheme for violations
export const ruleColors = {
  R1: "#ef4444", // Red
  R2: "#fb923c", // Orange  
  R3: "#facc15", // Yellow
  R4: "#06b6d4", // Cyan
  R5: "#a855f7", // Purple
  R6: "#ec4899", // Pink
  R7: "#6366f1", // Indigo
  R8: "#06b6d4", // Cyan
};

// Shared custom tooltip component
export const CustomTooltip = ({ active, payload, mean, std, ucl, lcl }) => {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    const isViolation = p.rule && (p.rule === 'R1' || p.rule === 'R2' || p.rule === 'R3');
    
    return (
      <div className={`rounded-lg p-3 shadow-lg text-xs z-50 ${isViolation ? 'bg-red-950 border-2 border-red-500' : 'bg-slate-950 border-2 border-cyan-500'}`}>
        <div className="text-slate-200"><span className="text-slate-400">Time: </span><span className="font-mono text-cyan-300">{new Date(p.t).toLocaleTimeString()}</span></div>
        <div className="text-slate-200 mt-1"><span className="text-slate-400">Latency: </span><span className={`font-mono font-bold ${isViolation ? 'text-red-300' : 'text-emerald-300'}`}>{Number(p.y).toFixed(3)}s</span></div>
        <div className="text-slate-200"><span className="text-slate-400">Model: </span><span className="font-mono text-blue-300">{p.model}</span></div>
        <div className="text-slate-200"><span className="text-slate-400">Deviation: </span><span className="font-mono">{((p.y - mean) / std).toFixed(2)}σ</span></div>
        <div className="border-t border-slate-700 mt-2 pt-2 text-slate-300">
          <div><span className="text-slate-400">UCL: </span><span className="text-red-400 font-mono">{Number(ucl).toFixed(3)}s</span></div>
          <div><span className="text-slate-400">LCL: </span><span className="text-red-400 font-mono">{Number(lcl).toFixed(3)}s</span></div>
          <div><span className="text-slate-400">Mean: </span><span className="text-cyan-400 font-mono">{Number(mean).toFixed(3)}s</span></div>
        </div>
        {isViolation && <div className="mt-2 text-red-300 font-bold bg-red-950/50 p-2 rounded">🚨 {p.rule} VIOLATION</div>}
      </div>
    );
  }
  return null;
};

// Shared stats bar component
export const StatsBar = ({ mean, std, ucl, lcl, violationCounts, dataCount, timeMode }) => {
  return (
    <div className="bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-slate-400">
          <span className="font-bold text-cyan-400">{timeMode.toUpperCase()}</span> Mode - <span className="text-white">{dataCount}</span> data points
        </div>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 text-xs">
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-wider">Mean</div>
          <div className="text-lg font-bold text-cyan-400">{Number(mean).toFixed(3)}s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-wider">Std Dev</div>
          <div className="text-lg font-bold text-purple-400">{Number(std).toFixed(3)}s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-red-500/30">
          <div className="text-slate-400 uppercase tracking-wider">UCL</div>
          <div className="text-lg font-bold text-red-400">{Number(ucl).toFixed(3)}s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-red-500/30">
          <div className="text-slate-400 uppercase tracking-wider">LCL</div>
          <div className="text-lg font-bold text-red-400">{Number(lcl).toFixed(3)}s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-red-500/30">
          <div className="text-slate-400 uppercase tracking-wider">R1</div>
          <div className="text-lg font-bold" style={{color: "#ef4444"}}>{violationCounts.R1 || 0}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-orange-500/30">
          <div className="text-slate-400 uppercase tracking-wider">R2</div>
          <div className="text-lg font-bold" style={{color: "#fb923c"}}>{violationCounts.R2 || 0}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-yellow-500/30">
          <div className="text-slate-400 uppercase tracking-wider">R3</div>
          <div className="text-lg font-bold" style={{color: "#facc15"}}>{violationCounts.R3 || 0}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold text-white">{Object.values(violationCounts).reduce((a, b) => a + b, 0)}</div>
        </div>
      </div>
    </div>
  );
};

// Base chart wrapper with shared structure
export const BaseChartWrapper = ({ children, stats, violations, dataCount = 0, timeMode = "live" }) => {
  const { mean = 0, std = 0.1, ucl = 0, lcl = 0 } = stats || {};

  // Count violations by rule
  const violationCounts = {};
  (violations || []).forEach(v => {
    violationCounts[v.rule] = (violationCounts[v.rule] || 0) + 1;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};