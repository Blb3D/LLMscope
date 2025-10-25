// ================================================
// SPCChart.jsx  (modular SPC chart core)
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
} from "recharts";

export default function SPCChart({ data, mean, stdDev, ucl, lcl }) {
  const chartData = data.map((d, i) => ({
    index: i + 1,
    latency: d.latency_ms || d.latency || 0,
  }));

  return (
    <div className="bg-neutral-900 p-4 rounded">
      <h2 className="text-lg font-semibold mb-2">Latency SPC Chart</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="index" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip />
          <ReferenceLine y={mean} stroke="#f4c98a" strokeDasharray="3 3" />
          <ReferenceLine y={ucl} stroke="#d37e3e" />
          <ReferenceLine y={lcl} stroke="#d37e3e" />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
