// ADD (new file): frontend/src/components/LatencyChart.tsx
import React, { useMemo } from "react";
import { LineChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Scatter } from "recharts";
import type { SpcPoint } from "@/hooks/useSpc";

type Props = { points: SpcPoint[]; height?: number };

function ts(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString();
}

export default function LatencyChart({ points, height = 320 }: Props) {
  const data = useMemo(() => points.map(p => ({
    t: p.t_ms, y: p.y_ms, mu: p.mu,
    u1: p.p1, u2: p.p2, u3: p.p3,
    l1: p.n1, l2: p.n2, l3: p.n3,
    r1: p.r1, r2: p.r2, r3: p.r3, r4: p.r4,
  })), [points]);

  const alerts = data.filter(d => d.r1 || d.r2 || d.r3 || d.r4);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="spcBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopOpacity={0.18} />
              <stop offset="100%" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={ts} minTickGap={48} />
          <YAxis />
          <Tooltip
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(value, name) => [value as number, name]}
          />
          {/* ±3σ shaded */}
          <Area dataKey="u3" strokeOpacity={0} fill="url(#spcBand)" />
          <Area dataKey="l3" strokeOpacity={0} fill="url(#spcBand)" />
          {/* μ line */}
          <Line type="monotone" dataKey="mu" dot={false} strokeWidth={1.5} />
          {/* raw latency */}
          <Line type="monotone" dataKey="y" dot={false} strokeWidth={1.5} />
          {/* rule hits */}
          <Scatter data={alerts} dataKey="y" />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs opacity-70 mt-1">
        μ centerline; shaded band ≈ ±3σ. Dots mark Nelson rule hits.
      </div>
    </div>
  );
}
