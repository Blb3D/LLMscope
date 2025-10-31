import React, { useState, useEffect } from 'react';

const ViolationReport = ({ violation, analysis, telemetry, stats, onClose }) => {
  const [reportHtml, setReportHtml] = useState('');
  
  useEffect(() => {
    if (!violation || !analysis) return;
    
    const generateReport = () => {
      const timestamp = new Date().toLocaleString();
      const violationTime = new Date(violation.timestamp).toLocaleString();
      
      return `
<!DOCTYPE html>
<html>
<head>
    <title>LLMscope Violation Report - ${violation.rule}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; }
        .header .subtitle { opacity: 0.8; margin-top: 8px; }
        .section { background: white; padding: 25px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
        .metric .value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .metric .label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .violation-alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .analysis-section { background: #f0f9ff; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .system-info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .chart-placeholder { background: #e2e8f0; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; margin-top: 40px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .recommendation { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 LLMscope Violation Report</h1>
        <div class="subtitle">Generated on ${timestamp}</div>
    </div>
    
    <div class="section">
        <h2>📋 Executive Summary</h2>
        <div class="violation-alert">
            <strong>Violation Type:</strong> ${violation.rule} - ${getViolationDescription(violation.rule)}<br>
            <strong>Occurred:</strong> ${violationTime}<br>
            <strong>Model:</strong> ${violation.model}<br>
            <strong>Severity:</strong> ${getSeverityLevel(violation.deviation_sigma)} (${violation.deviation_sigma?.toFixed(2)}σ deviation)
        </div>
    </div>
    
    <div class="section">
        <h2>📊 Performance Metrics</h2>
        <div class="metrics">
            <div class="metric">
                <div class="value">${violation.latency_ms}ms</div>
                <div class="label">Response Time</div>
            </div>
            <div class="metric">
                <div class="value">${violation.deviation_sigma?.toFixed(2)}σ</div>
                <div class="label">Statistical Deviation</div>
            </div>
            <div class="metric">
                <div class="value">${stats.mean?.toFixed(2)}ms</div>
                <div class="label">Process Mean</div>
            </div>
            <div class="metric">
                <div class="value">${stats.ucl?.toFixed(2)}ms</div>
                <div class="label">Upper Control Limit</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>🖥️ System Telemetry</h2>
        <div class="system-info">
            <table>
                <tr><th>Metric</th><th>Value at Violation</th><th>Current Value</th></tr>
                <tr><td>CPU Usage</td><td>${violation.cpu_percent?.toFixed(1)}%</td><td>${telemetry.cpu?.toFixed(1)}%</td></tr>
                <tr><td>Memory Usage</td><td>${violation.memory_percent?.toFixed(1)}%</td><td>${telemetry.memory?.toFixed(1)}%</td></tr>
                <tr><td>GPU Usage</td><td>${violation.gpu_percent?.toFixed(1)}%</td><td>${telemetry.gpu?.toFixed(1) || 'N/A'}%</td></tr>
                ${telemetry.ollama ? `<tr><td>Ollama Models</td><td>-</td><td>${telemetry.ollama.running_models} (${telemetry.ollama.total_memory_usage_gb}GB VRAM)</td></tr>` : ''}
            </table>
        </div>
    </div>
    
    <div class="section">
        <h2>🧠 AI Copilot Analysis</h2>
        
        <div class="analysis-section">
            <h3>Technical Analysis</h3>
            <p>${analysis.technical || 'Technical analysis not available'}</p>
        </div>
        
        <div class="analysis-section">
            <h3>Business Impact</h3>
            <p>${analysis.business || 'Business impact analysis not available'}</p>
        </div>
        
        <div class="recommendation">
            <h3>Remediation Recommendations</h3>
            <p>${analysis.remediation || 'Remediation recommendations not available'}</p>
        </div>
    </div>
    
    <div class="section">
        <h2>📈 Context Chart</h2>
        <div class="chart-placeholder">
            📊 Violation Context Chart
            <br><small>(Chart shows 30-minute window around violation time)</small>
        </div>
        <p><strong>Chart Analysis:</strong> The above chart shows response time patterns 15 minutes before and after the violation occurred. Key patterns to analyze include trends, shifts, and outliers that may have contributed to the violation.</p>
    </div>
    
    <div class="section">
        <h2>✅ Action Items</h2>
        <table>
            <tr><th>Priority</th><th>Action</th><th>Owner</th><th>Status</th></tr>
            <tr><td>High</td><td>Investigate root cause of ${violation.rule} violation</td><td>DevOps Team</td><td>Pending</td></tr>
            <tr><td>Medium</td><td>Review system telemetry for resource constraints</td><td>Infrastructure Team</td><td>Pending</td></tr>
            <tr><td>Low</td><td>Update monitoring thresholds if needed</td><td>Monitoring Team</td><td>Pending</td></tr>
        </table>
    </div>
    
    <div class="footer">
        <p>This report was generated by LLMscope AI Copilot - Advanced LLM Performance Monitoring</p>
        <p>For technical support, contact: bbaker@blb3dprinting.com</p>
    </div>
</body>
</html>
      `;
    };
    
    setReportHtml(generateReport());
  }, [violation, analysis, telemetry, stats]);
  
  const getViolationDescription = (rule) => {
    const descriptions = {
      'R1': 'Single point exceeds 3σ control limits',
      'R2': 'Nine consecutive points on same side of mean',
      'R3': 'Six consecutive points trending in same direction',
      'R4': 'Fourteen consecutive points alternating up and down'
    };
    return descriptions[rule] || 'Statistical process control violation';
  };
  
  const getSeverityLevel = (sigma) => {
    if (sigma > 4) return 'Critical';
    if (sigma > 3) return 'High';
    if (sigma > 2) return 'Medium';
    return 'Low';
  };
  
  const downloadReport = () => {
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llmscope-violation-report-${violation.rule}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-6xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-cyan-300">📋 Violation Report Generator</h2>
            <p className="text-sm text-slate-400">
              Professional analysis report for {violation.rule} violation
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadReport}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-bold transition"
            >
              📥 Download HTML
            </button>
            <button
              onClick={printReport}
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-bold transition"
            >
              🖨️ Print
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
          <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
            <iframe
              srcDoc={reportHtml}
              className="w-full h-96 border-none"
              title="Violation Report Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationReport;