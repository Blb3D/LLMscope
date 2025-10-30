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

export default function LiveChart({ data = [], stats = {}, violations = [] }) {
  const { mean = 0, std = 0.1, ucl = 0, lcl = 0 } = stats || {};

  // Live chart shows only last 90 points (sliding window)
  const displayData = data.slice(-90);

  console.log(`[LiveChart] Rendering with ${data.length} total points, displaying ${displayData.length} points, ${violations.length} violations`);
  console.log(`[LiveChart] Using passed stats: mean=${mean.toFixed(3)}, std=${std.toFixed(3)}, ucl=${ucl.toFixed(3)}, lcl=${lcl.toFixed(3)}`);

  return (
    <BaseChartWrapper 
      stats={stats} 
      violations={violations}
      dataCount={displayData.length}
      timeMode="live"
    >
      <ComposedChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
        <XAxis dataKey="t" tick={false} stroke="#64748b" />
        <YAxis 
          tick={{ fill: "#94a3b8", fontSize: 10 }} 
          stroke="#64748b"
          domain={[
            (dataMin) => Math.min(dataMin - 0.5, lcl - 0.5), 
            (dataMax) => Math.max(dataMax + 0.5, ucl + 0.5)
          ]}
        />
        <Tooltip content={(props) => <CustomTooltip {...props} mean={mean} std={std} ucl={ucl} lcl={lcl} />} />
        
        {/* Control Lines - More prominent for live view */}
        <ReferenceLine 
          y={mean} 
          stroke="#10b981" 
          strokeDasharray="4 4" 
          strokeWidth={2.5} 
          label={{ value: "Mean", position: "right", fill: "#10b981", fontSize: 11 }} 
        />
        <ReferenceLine 
          y={ucl} 
          stroke="#ef4444" 
          strokeDasharray="6 3" 
          strokeWidth={2} 
          label={{ value: "UCL", position: "right", fill: "#ef4444", fontSize: 11 }} 
        />
        <ReferenceLine 
          y={lcl} 
          stroke="#ef4444" 
          strokeDasharray="3 6" 
          strokeWidth={2.5} 
          label={{ value: "LCL", position: "right", fill: "#ef4444", fontSize: 11 }} 
        />
        
        {/* Live data line - Green theme for "live" */}
        <Line
          type="monotone"
          dataKey="y"
          stroke="#10b981"
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
          strokeOpacity={0.9}
          connectNulls={false}
        />
      </ComposedChart>
    </BaseChartWrapper>
  );
}