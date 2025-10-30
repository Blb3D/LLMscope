import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// Nelson Rules detection
function detectNelsonViolations(data, mean, std) {
  const violations = [];
  const ucl = mean + 3 * std;
  const lcl = mean - 3 * std;
  const ucl2 = mean + 2 * std;
  const lcl2 = mean - 2 * std;
  const ucl1 = mean + 1 * std;
  const lcl1 = mean - 1 * std;

  data.forEach((point, idx) => {
    const y = point.y;
    if (y > ucl || y < lcl) {
      violations.push({ index: idx, rule: "R1" });
      return;
    }
    if (idx >= 8) {
      const last9 = data.slice(idx - 8, idx + 1).map(p => p.y);
      if (last9.every(v => v > mean) || last9.every(v => v < mean)) {
        violations.push({ index: idx, rule: "R2" });
        return;
      }
    }
    if (idx >= 5) {
      const last6 = data.slice(idx - 5, idx + 1).map(p => p.y);
      const inc = last6.every((v, i) => i === 0 || v >= last6[i - 1]);
      const dec = last6.every((v, i) => i === 0 || v <= last6[i - 1]);
      if ((inc || dec) && last6[0] !== last6[last6.length - 1]) {
        violations.push({ index: idx, rule: "R3" });
        return;
      }
    }
    if (idx >= 13) {
      const last14 = data.slice(idx - 13, idx + 1).map(p => p.y);
      let alternating = true;
      for (let i = 1; i < last14.length; i++) {
        if ((last14[i] > last14[i - 1]) === (last14[i + 1] > last14[i])) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({ index: idx, rule: "R4" });
        return;
      }
    }
    if (idx >= 2) {
      const last3 = data.slice(idx - 2, idx + 1).map(p => p.y);
      const above2 = last3.filter(v => v > ucl2).length;
      const below2 = last3.filter(v => v < lcl2).length;
      if (above2 >= 2 || below2 >= 2) {
        violations.push({ index: idx, rule: "R5" });
        return;
      }
    }
    if (idx >= 4) {
      const last5 = data.slice(idx - 4, idx + 1).map(p => p.y);
      const above1 = last5.filter(v => v > ucl1).length;
      const below1 = last5.filter(v => v < lcl1).length;
      if (above1 >= 4 || below1 >= 4) {
        violations.push({ index: idx, rule: "R6" });
        return;
      }
    }
    if (idx >= 14) {
      const last15 = data.slice(idx - 14, idx + 1).map(p => p.y);
      if (last15.every(v => v >= lcl1 && v <= ucl1)) {
        violations.push({ index: idx, rule: "R7" });
        return;
      }
    }
    if (idx >= 7) {
      const last8 = data.slice(idx - 7, idx + 1).map(p => p.y);
      if (last8.every(v => v > ucl1 || v < lcl1)) {
        violations.push({ index: idx, rule: "R8" });
        return;
      }
    }
  });
  return violations;
}

export default function SPCChart_ollama_revB({ data = [], stats = {}, violations: externalViolations = [] }) {
  const { mean = 0, std = 0.1, ucl = 0, lcl = 0 } = stats || {};

  const nelsonViolations = useMemo(() => {
    if (data.length > 0 && mean && std && mean !== 0) {
      return detectNelsonViolations(data, mean, std);
    }
    return [];
  }, [data, mean, std]);

  const ruleColors = {
    R1: "#ef4444", // Red
    R2: "#fb923c", // Orange  
    R3: "#facc15", // Yellow
    R4: "#06b6d4",
    R5: "#a855f7",
    R6: "#ec4899",
    R7: "#6366f1",
    R8: "#06b6d4",
  };

  const CustomTooltip = ({ active, payload }) => {
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

  // Build dots array - use backend violations (externalViolations) instead of frontend-calculated ones
  const dots = useMemo(() => {
    console.log(`[Chart] Processing ${externalViolations.length} backend violations for dots`);
    
    return (externalViolations || [])
      .map(violation => {
        // Find the data point that matches this violation timestamp
        const violationTime = new Date(violation.timestamp).getTime();
        const pointIndex = data.findIndex(d => {
          const pointTime = new Date(d.t).getTime();
          return Math.abs(pointTime - violationTime) < 5000; // Within 5 seconds
        });
        
        if (pointIndex === -1) {
          console.log(`[Chart] No matching data point found for violation at ${violation.timestamp}`);
          return null;
        }
        
        const point = data[pointIndex];
        
        return {
          t: point.t,
          y: point.y,
          model: point.model,
          provider: point.provider,
          rule: violation.rule,
          timestamp: violation.timestamp,
          index: pointIndex, // Add the index for x-positioning
        };
      })
      .filter(Boolean);
  }, [externalViolations, data]);

  console.log(`[Chart] Creating ${dots.length} violation dots from ${externalViolations.length} backend violations`);

  // Count violations by rule from backend data
  const violationCounts = {};
  externalViolations.forEach(v => {
    violationCounts[v.rule] = (violationCounts[v.rule] || 0) + 1;
  });

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
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

      {/* Chart */}
      <div className="flex-1 bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
            <XAxis dataKey="t" tick={false} stroke="#64748b" />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#64748b" />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Control Lines */}
            <ReferenceLine y={mean} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={2} label={{ value: "Mean", position: "right", fill: "#22d3ee", fontSize: 11 }} />
            <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: "UCL", position: "right", fill: "#ef4444", fontSize: 11 }} />
            <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: "LCL", position: "right", fill: "#ef4444", fontSize: 11 }} />
            
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

            {/* Violation Dots as Scatter Plot */}
            {dots.length > 0 && (
              <Scatter
                dataKey="y"
                data={dots}
                fill="#8884d8"
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                  const color = ruleColors[payload.rule] || "#f59e0b";
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                      opacity={0.95}
                      style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}
                    />
                  );
                }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}