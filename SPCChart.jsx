// ================================================
// SPCChart.jsx - Professional SPC Chart
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
  Area,
  ComposedChart,
} from "recharts";

export default function SPCChart({ data, mean, stdDev, ucl, lcl }) {
  const chartData = data.map((d, i) => ({
    index: i + 1,
    latency: d.latency_ms || 0,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOutOfControl = data.latency > ucl || data.latency < lcl;
      
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-gray-400 mb-1">Sample #{data.index}</p>
          <p className={`text-lg font-bold ${isOutOfControl ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.latency.toFixed(2)} ms
          </p>
          {isOutOfControl && (
            <p className="text-xs text-red-400 mt-1">⚠️ Out of control</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/30 rounded-xl p-4">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          
          <XAxis 
            dataKey="index" 
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Sample Number', position: 'insideBottom', offset: -5, fill: '#64748b' }}
          />
          
          <YAxis 
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Control Limit Zones */}
          <Area
            type="monotone"
            dataKey="latency"
            fill="url(#latencyGradient)"
            stroke="none"
          />
          
          {/* UCL Line */}
          <ReferenceLine 
            y={ucl} 
            stroke="#f97316" 
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ 
              value: `UCL: ${ucl.toFixed(1)}`, 
              fill: '#f97316', 
              fontSize: 12,
              position: 'right'
            }}
          />
          
          {/* Mean Line */}
          <ReferenceLine 
            y={mean} 
            stroke="#10b981" 
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{ 
              value: `μ: ${mean.toFixed(1)}`, 
              fill: '#10b981', 
              fontSize: 12,
              position: 'right'
            }}
          />
          
          {/* LCL Line */}
          <ReferenceLine 
            y={lcl} 
            stroke="#f97316" 
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ 
              value: `LCL: ${lcl.toFixed(1)}`, 
              fill: '#f97316', 
              fontSize: 12,
              position: 'right'
            }}
          />
          
          {/* Data Line */}
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const isOutOfControl = payload.latency > ucl || payload.latency < lcl;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isOutOfControl ? 6 : 4}
                  fill={isOutOfControl ? "#ef4444" : "#3b82f6"}
                  stroke={isOutOfControl ? "#fca5a5" : "#60a5fa"}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 8, fill: "#3b82f6", stroke: "#60a5fa", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-emerald-500"></div>
          <span>Mean (μ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed' }}></div>
          <span>Control Limits (±3σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>In Control</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Out of Control</span>
        </div>
      </div>
    </div>
  );
}