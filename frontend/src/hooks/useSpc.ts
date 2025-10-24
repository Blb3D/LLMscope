// ADD (new file): frontend/src/hooks/useSpc.ts
import { useEffect, useState } from "react";

export type SpcPoint = {
  t_ms: number;
  y_ms: number;
  mu: number;
  p1: number; p2: number; p3: number;
  n1: number; n2: number; n3: number;
  r1: boolean; r2: boolean; r3: boolean; r4: boolean;
};

export function useSpc(provider?: string, model?: string, hours = 24, limit = 2000) {
  const [data, setData] = useState<SpcPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (provider && provider !== "all") qs.set("provider", provider);
    if (model && model !== "all") qs.set("model", model);
    qs.set("hours", String(hours));
    qs.set("limit", String(limit));

    setLoading(true);
    setError(null);

    fetch(`/api/stats/spc?${qs.toString()}`, {
      headers: { Authorization: "Bearer dev-123" },
    })
      .then(r => (r.ok ? r.json() : r.text().then(t => Promise.reject(t))))
      .then((res) => setData(res?.series ?? []))
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load SPC data"))
      .finally(() => setLoading(false));
  }, [provider, model, hours, limit]);

  return { data, loading, error };
}
