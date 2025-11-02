import React, { useEffect, useState } from "react";

/**
 * LLMscope Cost Dashboard
 * A self-hosted dashboard that shows LLM API costs in real-time and recommends cheaper models.
 *
 * Features:
 * - Real-time cost tracking
 * - Cost breakdown by provider and model
 * - Model pricing comparison
 * - Cheaper model recommendations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [usage, setUsage] = useState([]);
  const [summary, setSummary] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch usage data
      const usageRes = await fetch(`${API_BASE_URL}/api/usage?limit=100`);
      const usageData = await usageRes.json();
      setUsage(usageData.usage || []);

      // Fetch cost summary
      const summaryRes = await fetch(`${API_BASE_URL}/api/costs/summary`);
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary || []);

      // Fetch pricing
      const pricingRes = await fetch(`${API_BASE_URL}/api/models/pricing`);
      const pricingData = await pricingRes.json();
      setPricing(pricingData.pricing || []);

      // Fetch recommendations
      const recRes = await fetch(`${API_BASE_URL}/api/recommendations`);
      const recData = await recRes.json();
      setRecommendations(recData.recommendations || []);

      setError("");
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate total cost
  const totalCost = summary.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">LLMscope Cost Dashboard</h1>
          <p className="text-slate-400 mt-2">Track LLM API costs in real-time and get model recommendations</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-slate-400">Loading data...</div>
          </div>
        )}

        {!loading && (
          <>
            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase">Total Cost</h3>
                <p className="text-3xl font-bold text-emerald-400 mt-2">${totalCost.toFixed(4)}</p>
              </div>
              <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase">Total Requests</h3>
                <p className="text-3xl font-bold text-white mt-2">
                  {summary.reduce((sum, item) => sum + (item.request_count || 0), 0)}
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase">Total Tokens</h3>
                <p className="text-3xl font-bold text-white mt-2">
                  {summary.reduce((sum, item) => sum + (item.total_tokens || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Cost Breakdown by Model */}
            <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 mb-8">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Cost Breakdown by Model</h2>
              </div>
              <div className="p-6">
                {summary.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No usage data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 text-slate-300">Provider</th>
                          <th className="text-left py-2 text-slate-300">Model</th>
                          <th className="text-right py-2 text-slate-300">Total Cost</th>
                          <th className="text-right py-2 text-slate-300">Requests</th>
                          <th className="text-right py-2 text-slate-300">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50">
                            <td className="py-2 text-slate-200">{item.provider}</td>
                            <td className="py-2 text-slate-200">{item.model}</td>
                            <td className="text-right py-2 text-emerald-400 font-semibold">${(item.total_cost || 0).toFixed(4)}</td>
                            <td className="text-right py-2 text-slate-300">{item.request_count}</td>
                            <td className="text-right py-2 text-slate-300">{(item.total_tokens || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Model Recommendations */}
            <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 mb-8">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Cheaper Model Recommendations</h2>
              </div>
              <div className="p-6">
                {recommendations.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No recommendations yet. Add model pricing data to get started.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="border border-slate-700 bg-slate-900/50 rounded-lg p-4 hover:border-emerald-500 transition-colors">
                        <div className="font-semibold text-white">{rec.provider} / {rec.model}</div>
                        <div className="text-sm text-slate-400 mt-1">
                          Input: ${rec.input_cost_per_1k}/1K tokens
                        </div>
                        <div className="text-sm text-slate-400">
                          Output: ${rec.output_cost_per_1k}/1K tokens
                        </div>
                        <div className="text-xs text-emerald-400 mt-2">{rec.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Usage */}
            <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Recent Usage</h2>
              </div>
              <div className="p-6">
                {usage.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No usage data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 text-slate-300">Timestamp</th>
                          <th className="text-left py-2 text-slate-300">Provider</th>
                          <th className="text-left py-2 text-slate-300">Model</th>
                          <th className="text-right py-2 text-slate-300">Tokens</th>
                          <th className="text-right py-2 text-slate-300">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-2 text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                            <td className="py-2 text-slate-200">{item.provider}</td>
                            <td className="py-2 text-slate-200">{item.model}</td>
                            <td className="text-right py-2 text-slate-300">{item.total_tokens}</td>
                            <td className="text-right py-2 text-emerald-400 font-semibold">${(item.cost_usd || 0).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
