import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { BaseChartWrapper, CustomTooltip, ruleColors } from "./BaseChart";

export default function HistoricalChart({ data = [], stats = {}, violations = [], timeWindow = "6h" }) {
  const { mean = 0, std = 0.1, ucl = 0, lcl = 0 } = stats || {};

  console.log(`[HistoricalChart] Rendering ${timeWindow} with ${data.length} points, ${violations.length} violations`);

  // Different styling based on time window
  const is24h = timeWindow === "24h";
  const lineColor = is24h ? "#8b5cf6" : "#06b6d4"; // Purple for 24h, Cyan for 6h
  const gradientId = is24h ? "historical24hGradient" : "historical6hGradient";

  return (
    <BaseChartWrapper 
      stats={stats} 
      violations={violations}
      dataCount={data.length}
      timeMode={timeWindow}
    >
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.6} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
        <XAxis 
          dataKey="t" 
          tick={{ fill: "#94a3b8", fontSize: 9 }} 
          stroke="#64748b"
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fill: "#94a3b8", fontSize: 10 }} 
          stroke="#64748b"
          domain={[
            (dataMin) => Math.min(dataMin - 1, lcl - 0.5), 
            (dataMax) => Math.max(dataMax + 1, ucl + 0.5)
          ]}
        />
        <Tooltip content={(props) => <CustomTooltip {...props} mean={mean} std={std} ucl={ucl} lcl={lcl} />} />
        
        {/* Control Lines - Subtle for historical view */}
        <ReferenceLine 
          y={mean} 
          stroke="#22d3ee" 
          strokeDasharray="5 5" 
          strokeWidth={1.5} 
          label={{ value: "Mean", position: "right", fill: "#22d3ee", fontSize: 10 }} 
        />
        <ReferenceLine 
          y={ucl} 
          stroke="#ef4444" 
          strokeDasharray="8 4" 
          strokeWidth={1} 
          label={{ value: "UCL", position: "right", fill: "#ef4444", fontSize: 10 }} 
        />
        <ReferenceLine 
          y={lcl} 
          stroke="#ef4444" 
          strokeDasharray="4 8" 
          strokeWidth={1.5} 
          label={{ value: "LCL", position: "right", fill: "#ef4444", fontSize: 10 }} 
        />
        
        {/* Historical data line */}
        <Line
          type="monotone"
          dataKey="y"
          stroke={lineColor}
          strokeWidth={is24h ? 1.5 : 2}
          dot={false}
          isAnimationActive={false}
          strokeOpacity={0.8}
          connectNulls={false}
        />
      </ComposedChart>
    </BaseChartWrapper>
  );
}