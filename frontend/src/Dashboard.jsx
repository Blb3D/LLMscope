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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">LLMscope Cost Dashboard</h1>
          <p className="text-gray-600 mt-2">Track LLM API costs in real-time and get model recommendations</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading data...</div>
          </div>
        )}

        {!loading && (
          <>
            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Total Cost</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">${totalCost.toFixed(4)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Total Requests</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {summary.reduce((sum, item) => sum + (item.request_count || 0), 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Total Tokens</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {summary.reduce((sum, item) => sum + (item.total_tokens || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Cost Breakdown by Model */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Cost Breakdown by Model</h2>
              </div>
              <div className="p-6">
                {summary.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No usage data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Provider</th>
                          <th className="text-left py-2">Model</th>
                          <th className="text-right py-2">Total Cost</th>
                          <th className="text-right py-2">Requests</th>
                          <th className="text-right py-2">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2">{item.provider}</td>
                            <td className="py-2">{item.model}</td>
                            <td className="text-right py-2">${(item.total_cost || 0).toFixed(4)}</td>
                            <td className="text-right py-2">{item.request_count}</td>
                            <td className="text-right py-2">{(item.total_tokens || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Model Recommendations */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Cheaper Model Recommendations</h2>
              </div>
              <div className="p-6">
                {recommendations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recommendations yet. Add model pricing data to get started.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="font-semibold text-gray-900">{rec.provider} / {rec.model}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Input: ${rec.input_cost_per_1k}/1K tokens
                        </div>
                        <div className="text-sm text-gray-600">
                          Output: ${rec.output_cost_per_1k}/1K tokens
                        </div>
                        <div className="text-xs text-green-600 mt-2">{rec.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Usage */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Recent Usage</h2>
              </div>
              <div className="p-6">
                {usage.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No usage data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Timestamp</th>
                          <th className="text-left py-2">Provider</th>
                          <th className="text-left py-2">Model</th>
                          <th className="text-right py-2">Tokens</th>
                          <th className="text-right py-2">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2 text-sm">{new Date(item.timestamp).toLocaleString()}</td>
                            <td className="py-2">{item.provider}</td>
                            <td className="py-2">{item.model}</td>
                            <td className="text-right py-2">{item.total_tokens}</td>
                            <td className="text-right py-2">${(item.cost_usd || 0).toFixed(4)}</td>
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
