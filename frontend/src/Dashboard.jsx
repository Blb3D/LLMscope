import React, { useEffect, useState, useCallback } from "react";

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
  const [dateRange, setDateRange] = useState("all"); // "24h", "7d", "30d", "all"
  const [sortBy, setSortBy] = useState("cost"); // "cost", "requests", "tokens"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc", "desc"

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate = null;

    switch (dateRange) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return { start_date: null, end_date: null };
    }

    return {
      start_date: startDate ? startDate.toISOString() : null,
      end_date: now.toISOString(),
    };
  };

  // Fetch data from API
  // Wrapped in useCallback to prevent unnecessary re-renders and fix React Hook dependency warning
  const fetchData = useCallback(async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load or date range change
      if (isInitialLoad) {
        setLoading(true);
      }

      const { start_date, end_date } = getDateRange();
      const dateParams = start_date
        ? `&start_date=${start_date}&end_date=${end_date}`
        : "";

      // Fetch usage data
      const usageRes = await fetch(`${API_BASE_URL}/api/usage?limit=100${dateParams}`);
      const usageData = await usageRes.json();
      setUsage(usageData.usage || []);

      // Fetch cost summary
      const summaryRes = await fetch(`${API_BASE_URL}/api/costs/summary?${dateParams.slice(1)}`);
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
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [dateRange]); // Re-create fetchData when dateRange changes

  useEffect(() => {
    fetchData(true); // Initial load with loading spinner
    const interval = setInterval(() => fetchData(false), 5000); // Background refresh without loading spinner
    return () => clearInterval(interval);
  }, [fetchData]); // Re-fetch when fetchData changes (which happens when dateRange changes)

  // Calculate total cost
  const totalCost = summary.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Sort summary data
  const sortedSummary = [...summary].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case "cost":
        aVal = a.total_cost || 0;
        bVal = b.total_cost || 0;
        break;
      case "requests":
        aVal = a.request_count || 0;
        bVal = b.request_count || 0;
        break;
      case "tokens":
        aVal = a.total_tokens || 0;
        bVal = b.total_tokens || 0;
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return aVal - bVal;
    } else {
      return bVal - aVal;
    }
  });

  // Sort arrow component
  const SortArrow = ({ column }) => {
    if (sortBy !== column) {
      return <span className="text-slate-600 ml-1">⇅</span>;
    }
    return (
      <span className="text-emerald-400 ml-1">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Handle CSV export
  const handleExportCSV = () => {
    const { start_date, end_date } = getDateRange();
    const dateParams = start_date
      ? `?start_date=${start_date}&end_date=${end_date}`
      : "";

    // Trigger download
    window.location.href = `${API_BASE_URL}/api/export/csv${dateParams}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white">LLMscope Cost Dashboard</h1>
            <p className="text-slate-400 mt-2">Track LLM API costs in real-time and get model recommendations</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setDateRange("24h")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateRange === "24h"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setDateRange("7d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateRange === "7d"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setDateRange("30d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateRange === "30d"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setDateRange("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateRange === "all"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Time
          </button>
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
                  <div className="text-center py-12">
                    <div className="mb-6">
                      <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No data yet!</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                      Get started by generating demo data or integrating with your LLM API calls.
                    </p>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 max-w-2xl mx-auto text-left">
                      <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick Start Options:
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="text-emerald-400 font-bold">1.</span>
                          <div>
                            <p className="text-slate-300 font-medium">Generate demo data:</p>
                            <code className="block mt-1 bg-slate-950 text-emerald-300 px-3 py-2 rounded text-xs">
                              cd backend && python generate_demo_data.py
                            </code>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-emerald-400 font-bold">2.</span>
                          <div>
                            <p className="text-slate-300 font-medium">Or integrate with your API:</p>
                            <code className="block mt-1 bg-slate-950 text-emerald-300 px-3 py-2 rounded text-xs">
                              POST /api/usage with your token counts
                            </code>
                            <p className="text-slate-500 mt-1 text-xs">
                              See <a href="https://github.com/Blb3D/LLMscope" className="text-emerald-400 hover:underline">README</a> for integration examples
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 text-slate-300">Provider</th>
                          <th className="text-left py-2 text-slate-300">Model</th>
                          <th
                            className="text-right py-2 text-slate-300 cursor-pointer hover:text-emerald-400 transition-colors select-none"
                            onClick={() => handleSort("cost")}
                          >
                            Total Cost <SortArrow column="cost" />
                          </th>
                          <th
                            className="text-right py-2 text-slate-300 cursor-pointer hover:text-emerald-400 transition-colors select-none"
                            onClick={() => handleSort("requests")}
                          >
                            Requests <SortArrow column="requests" />
                          </th>
                          <th
                            className="text-right py-2 text-slate-300 cursor-pointer hover:text-emerald-400 transition-colors select-none"
                            onClick={() => handleSort("tokens")}
                          >
                            Tokens <SortArrow column="tokens" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSummary.map((item, idx) => (
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
