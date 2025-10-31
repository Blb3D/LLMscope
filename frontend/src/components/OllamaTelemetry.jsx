import React from "react";

/**
 * OllamaTelemetry - Enhanced Ollama metrics display (P0-1: Enhanced Telemetry)
 * 
 * Displays detailed Ollama-specific performance metrics:
 * - Tokens/sec (throughput)
 * - Load Duration (model loading time)
 * - Prompt Eval Duration (prompt processing time)
 * - Eval Duration (generation time)
 * 
 * Feature Flag: FEATURE_ENHANCED_TELEMETRY
 */

export default function OllamaTelemetry({ data, latestPoint }) {
  if (!data || data.length === 0 || !latestPoint) {
    return null;
  }

  // Calculate tokens/sec from latest point
  const evalCount = latestPoint.eval_count || 0;
  const evalDuration = latestPoint.eval_duration || 0;
  const tokensPerSec = evalDuration > 0 ? (evalCount / (evalDuration / 1000)) : 0;

  // Get durations (in ms)
  const loadDuration = latestPoint.load_duration || 0;
  const promptEvalDuration = latestPoint.prompt_eval_duration || 0;
  const genDuration = evalDuration;

  // Calculate avg tokens/sec over dataset
  const avgTokensPerSec = React.useMemo(() => {
    const validPoints = data.filter(d => d.eval_duration > 0 && d.eval_count > 0);
    if (validPoints.length === 0) return 0;
    
    const sum = validPoints.reduce((acc, point) => {
      const tps = (point.eval_count || 0) / ((point.eval_duration || 1) / 1000);
      return acc + tps;
    }, 0);
    
    return sum / validPoints.length;
  }, [data]);

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/30 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold text-cyan-300">⚡ Ollama Performance</h3>
        <div className="text-xs text-slate-500">Enhanced Telemetry</div>
      </div>

      <div className="space-y-3">
        {/* Tokens/sec - Current */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-400">Throughput (Current)</div>
              <div className="font-bold text-lg text-emerald-400">
                {tokensPerSec.toFixed(1)} <span className="text-sm text-slate-400">tok/s</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Average</div>
              <div className="font-bold text-cyan-400">{avgTokensPerSec.toFixed(1)} tok/s</div>
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded h-1.5 mt-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded transition-all duration-300"
              style={{ width: `${Math.min(100, (tokensPerSec / (avgTokensPerSec || 1)) * 50)}%` }}
            />
          </div>
        </div>

        {/* Timing Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-slate-400 mb-1">Load</div>
            <div className="font-bold text-purple-400">{loadDuration.toFixed(0)}ms</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-slate-400 mb-1">Prompt</div>
            <div className="font-bold text-blue-400">{promptEvalDuration.toFixed(0)}ms</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-slate-400 mb-1">Generate</div>
            <div className="font-bold text-cyan-400">{genDuration.toFixed(0)}ms</div>
          </div>
        </div>

        {/* Token Counts */}
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Prompt Tokens:</span>
            <span className="font-bold text-slate-300">{latestPoint.prompt_count || 0}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-400">Generated Tokens:</span>
            <span className="font-bold text-slate-300">{evalCount}</span>
          </div>
        </div>

        {/* Helpful context */}
        <div className="text-xs text-slate-500 italic">
          💡 Throughput = tokens generated per second. Higher is better.
        </div>
      </div>
    </div>
  );
}
