import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

const ViolationZoomedChart = ({ violation, data, stats, onClose, onGenerateReport }) => {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    if (!violation || !data) return;
    
    // Get violation timestamp
    const violationTime = new Date(violation.timestamp);
    
    // Get 30 minutes of data around the violation (15 min before, 15 min after)
    const startTime = new Date(violationTime.getTime() - 15 * 60 * 1000);
    const endTime = new Date(violationTime.getTime() + 15 * 60 * 1000);
    
    // Filter data to the window around violation
    const filteredData = data.filter(point => {
      const pointTime = new Date(point.t);
      return pointTime >= startTime && pointTime <= endTime;
    }).map(point => ({
      ...point,
      time: new Date(point.t).toLocaleTimeString(),
      timestamp: point.t,
      isViolation: Math.abs(new Date(point.t) - violationTime) < 30000 // Within 30 seconds
    }));
    
    setChartData(filteredData);
  }, [violation, data]);
  
  const formatTooltip = (value, name, props) => {
    if (name === 'y') {
      return [`${value.toFixed(2)}s`, 'Response Time'];
    }
    return [value, name];
  };
  
  const formatLabel = (label) => {
    const point = chartData.find(p => p.time === label);
    return point ? `${point.time} (${point.model})` : label;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-6xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-cyan-300">📊 Violation Context Chart</h2>
            <p className="text-sm text-slate-400">
              {violation.rule} violation at {new Date(violation.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onGenerateReport}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-bold transition"
            >
              📋 Generate Report
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Violation Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
              <div className="text-red-300 text-sm font-bold">Violation Type</div>
              <div className="text-white text-lg">{violation.rule}</div>
            </div>
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-3">
              <div className="text-purple-300 text-sm font-bold">Response Time</div>
              <div className="text-white text-lg">{violation.latency_ms}ms</div>
            </div>
            <div className="bg-orange-950/30 border border-orange-500/30 rounded-lg p-3">
              <div className="text-orange-300 text-sm font-bold">Deviation</div>
              <div className="text-white text-lg">{violation.deviation_sigma?.toFixed(2)}σ</div>
            </div>
            <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-3">
              <div className="text-blue-300 text-sm font-bold">Model</div>
              <div className="text-white text-lg">{violation.model}</div>
            </div>
          </div>
          
          {/* Zoomed Chart */}
          <div className="h-96 bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-cyan-300 mb-4">
              30-Minute Context Window
              <span className="text-sm text-slate-400 ml-2">
                ({chartData.length} data points)
              </span>
            </h3>
            
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    label={{ value: 'Response Time (s)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={formatTooltip}
                    labelFormatter={formatLabel}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  
                  {/* SPC Control Lines */}
                  <ReferenceLine y={stats.mean} stroke="#10B981" strokeDasharray="5 5" label="Mean" />
                  <ReferenceLine y={stats.ucl} stroke="#EF4444" strokeDasharray="5 5" label="UCL" />
                  <ReferenceLine y={stats.lcl} stroke="#EF4444" strokeDasharray="5 5" label="LCL" />
                  
                  {/* Main data line */}
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isViolation) {
                        return <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />;
                      }
                      return <circle cx={cx} cy={cy} r={2} fill="#06B6D4" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No data available for this time window
              </div>
            )}
          </div>
          
          {/* Analysis Notes */}
          <div className="mt-6 bg-slate-800/30 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-cyan-300 mb-3">📝 Analysis Notes</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• <strong>Context Window:</strong> 15 minutes before and after the violation</li>
              <li>• <strong>Red dot:</strong> Exact violation point</li>
              <li>• <strong>Control lines:</strong> Mean, Upper Control Limit (UCL), Lower Control Limit (LCL)</li>
              <li>• <strong>Pattern analysis:</strong> Look for trends, shifts, or outliers leading to the violation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationZoomedChart;