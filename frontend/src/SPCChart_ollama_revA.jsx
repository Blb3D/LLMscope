// ================================================
// SPCChart_ollama_revA.jsx - Live SPC Chart (Ollama Integration)
// ================================================
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Scatter,
} from "recharts";

export default function SPCChart_ollama_revA({ data, stats, violations }) {
  const { mean, ucl, lcl } = stats || { mean: 0, ucl: 0, lcl: 0 };

  const ruleColors = {
    R1: "#ef4444", // red
    R2: "#facc15", // yellow
    R3: "#fb923c", // orange
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-200">
          <div>t: {p.t}</div>
          <div>Latency: {p.y.toFixed(3)}s</div>
        </div>
      );
    }
    return null;
  };

  const dots = (violations || []).map(v => {
    const idx = v.index ?? 0;
    const point = data[idx];
    if (!point) return null;
    return { ...point, rule: v.rule };
  }).filter(Boolean);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3">
      <div className="text-gray-300 mb-2 text-sm">Latency SPC Chart</div>
      <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="t" tick={false} />
            <YAxis tick={{ fill: "#94a3b8" }} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={mean} stroke="#22d3ee" strokeDasharray="3 3" />
            <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="y" stroke="#60a5fa" strokeWidth={2} dot={false} />
            {dots.length > 0 && (
              <Scatter
                data={dots}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const color = ruleColors[payload.rule] || "#f59e0b";
                  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={1.5} />;
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 justify-center mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>R1: >3σ</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400"></div><span>R2: 9 same side</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span>R3: 6 trend</span></div>
      </div>
    </div>
  );
}
