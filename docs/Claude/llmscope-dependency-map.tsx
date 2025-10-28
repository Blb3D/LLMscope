import React, { useState } from 'react';
import { File, Folder, Database, Globe, Server, Monitor, ChevronRight, Code, Container } from 'lucide-react';

export default function FlowChart() {
  const [hoveredNode, setHoveredNode] = useState(null);

  const files = {
    config: [
      { name: ".env", type: "config", connects: ["app.py", "monitor_apis_revA.py", "docker-compose.yml"] },
      { name: "requirements.txt", type: "config", connects: ["app.py", "Dockerfile.backend"] },
      { name: "package.json", type: "config", connects: ["main.tsx", "Dashboard.jsx", "SPCChart.jsx", "Dockerfile.frontend"] },
      { name: "vite.config.ts", type: "config", connects: ["main.tsx", "Dockerfile.frontend"] },
      { name: "docker-compose.yml", type: "docker", connects: ["Dockerfile.backend", "Dockerfile.frontend", "Dockerfile.monitor"] }
    ],
    backend: [
      { name: "app.py", type: "python", connects: ["llmscope.db", "nginx.conf (via /api)"], provides: ["8 API endpoints", "SPC calculations", "System telemetry"] }
    ],
    monitor: [
      { name: "monitor_apis_revA.py", type: "python", connects: ["app.py (/api/log)", "Ollama API"], provides: ["Latency monitoring", "Token counting"] }
    ],
    frontend: [
      { name: "index.html", type: "html", connects: ["main.tsx"] },
      { name: "main.tsx", type: "typescript", connects: ["Dashboard.jsx", "SPCAnalysisPlotly.jsx"], provides: ["React Router setup"] },
      { name: "Dashboard.jsx", type: "react", connects: ["SPCChart.jsx", "app.py (/api/, /api/system)"], provides: ["Main dashboard UI"] },
      { name: "SPCChart.jsx", type: "react", connects: ["recharts library"], provides: ["SPC visualization"] },
      { name: "SPCAnalysisPlotly.jsx", type: "react", connects: ["plotly.js", "app.py (/api/stats)"], provides: ["Advanced analysis"] }
    ],
    docker: [
      { name: "Dockerfile.backend", type: "docker", connects: ["app.py", "requirements.txt"], builds: "llmscope_api container" },
      { name: "Dockerfile.frontend", type: "docker", connects: ["frontend files", "nginx.conf"], builds: "llmscope_web container" },
      { name: "Dockerfile.monitor", type: "docker", connects: ["monitor_apis_revA.py"], builds: "llmscope_monitor container" },
      { name: "nginx.conf", type: "config", connects: ["frontend dist/", "app.py"], provides: ["Reverse proxy", "SPA routing"] }
    ],
    data: [
      { name: "llmscope.db", type: "database", connects: ["app.py"], provides: ["SQLite data storage", "requests table"] }
    ]
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'python': return <Code className="w-4 h-4 text-blue-400" />;
      case 'react': 
      case 'typescript': return <Code className="w-4 h-4 text-cyan-400" />;
      case 'docker': return <Container className="w-4 h-4 text-purple-400" />;
      case 'database': return <Database className="w-4 h-4 text-green-400" />;
      case 'html': return <Globe className="w-4 h-4 text-orange-400" />;
      default: return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const getFileColor = (type) => {
    switch(type) {
      case 'python': return 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20';
      case 'react':
      case 'typescript': return 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20';
      case 'docker': return 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20';
      case 'database': return 'border-green-500/40 bg-green-500/10 hover:bg-green-500/20';
      case 'html': return 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20';
      default: return 'border-gray-500/40 bg-gray-500/10 hover:bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Folder className="w-8 h-8 text-amber-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              LLMscope File Flow Chart
            </h1>
          </div>
          <p className="text-gray-400 ml-11">Complete file structure and connections</p>
        </div>

        {/* Main Flow Diagram */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">System Flow</h2>
          
          {/* Visual Flow */}
          <div className="space-y-8">
            {/* Configuration Layer */}
            <FlowLayer title="Configuration Files" icon={<File className="w-5 h-5 text-yellow-400" />}>
              <div className="grid grid-cols-5 gap-3">
                {files.config.map((file, idx) => (
                  <FileNode 
                    key={idx} 
                    file={file} 
                    getFileIcon={getFileIcon} 
                    getFileColor={getFileColor}
                    onHover={setHoveredNode}
                    isHovered={hoveredNode === file.name}
                  />
                ))}
              </div>
            </FlowLayer>

            <FlowArrow />

            {/* Docker Layer */}
            <FlowLayer title="Docker Containers" icon={<Container className="w-5 h-5 text-purple-400" />}>
              <div className="grid grid-cols-4 gap-4">
                {files.docker.map((file, idx) => (
                  <FileNode 
                    key={idx} 
                    file={file} 
                    getFileIcon={getFileIcon} 
                    getFileColor={getFileColor}
                    onHover={setHoveredNode}
                    isHovered={hoveredNode === file.name}
                  />
                ))}
              </div>
            </FlowLayer>

            <FlowArrow />

            {/* Application Layer */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Backend */}
              <FlowLayer title="Backend" icon={<Server className="w-5 h-5 text-blue-400" />}>
                {files.backend.map((file, idx) => (
                  <FileNode 
                    key={idx} 
                    file={file} 
                    getFileIcon={getFileIcon} 
                    getFileColor={getFileColor}
                    onHover={setHoveredNode}
                    isHovered={hoveredNode === file.name}
                    expanded
                  />
                ))}
              </FlowLayer>

              {/* Monitor */}
              <FlowLayer title="Monitor" icon={<Monitor className="w-5 h-5 text-green-400" />}>
                {files.monitor.map((file, idx) => (
                  <FileNode 
                    key={idx} 
                    file={file} 
                    getFileIcon={getFileIcon} 
                    getFileColor={getFileColor}
                    onHover={setHoveredNode}
                    isHovered={hoveredNode === file.name}
                    expanded
                  />
                ))}
              </FlowLayer>

              {/* Frontend */}
              <FlowLayer title="Frontend" icon={<Globe className="w-5 h-5 text-cyan-400" />}>
                <div className="space-y-2">
                  {files.frontend.map((file, idx) => (
                    <FileNode 
                      key={idx} 
                      file={file} 
                      getFileIcon={getFileIcon} 
                      getFileColor={getFileColor}
                      onHover={setHoveredNode}
                      isHovered={hoveredNode === file.name}
                      expanded
                    />
                  ))}
                </div>
              </FlowLayer>
            </div>

            <FlowArrow />

            {/* Data Layer */}
            <FlowLayer title="Data Storage" icon={<Database className="w-5 h-5 text-green-400" />}>
              <div className="flex justify-center">
                {files.data.map((file, idx) => (
                  <FileNode 
                    key={idx} 
                    file={file} 
                    getFileIcon={getFileIcon} 
                    getFileColor={getFileColor}
                    onHover={setHoveredNode}
                    isHovered={hoveredNode === file.name}
                    expanded
                  />
                ))}
              </div>
            </FlowLayer>
          </div>
        </div>

        {/* Connection Details */}
        {hoveredNode && (
          <div className="bg-slate-900/70 rounded-xl border border-amber-500/50 p-6 mb-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-amber-400 mb-3">
              {hoveredNode} Connections
            </h3>
            <ConnectionDetails fileName={hoveredNode} files={files} />
          </div>
        )}

        {/* File Statistics */}
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard title="Config Files" count={files.config.length} color="text-yellow-400" />
          <StatCard title="Docker Files" count={files.docker.length} color="text-purple-400" />
          <StatCard title="Application Files" count={files.backend.length + files.monitor.length + files.frontend.length} color="text-blue-400" />
          <StatCard title="Data Files" count={files.data.length} color="text-green-400" />
        </div>

        {/* Legend */}
        <div className="mt-6 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-gray-100 mb-4">File Types Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <LegendItem icon={<Code className="w-4 h-4 text-blue-400" />} label="Python" />
            <LegendItem icon={<Code className="w-4 h-4 text-cyan-400" />} label="React/TS" />
            <LegendItem icon={<Container className="w-4 h-4 text-purple-400" />} label="Docker" />
            <LegendItem icon={<Database className="w-4 h-4 text-green-400" />} label="Database" />
            <LegendItem icon={<Globe className="w-4 h-4 text-orange-400" />} label="HTML" />
            <LegendItem icon={<File className="w-4 h-4 text-gray-400" />} label="Config" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowLayer({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-8 bg-gradient-to-b from-slate-600 to-slate-700"></div>
        <ChevronRight className="w-6 h-6 text-slate-600 rotate-90" />
      </div>
    </div>
  );
}

function FileNode({ file, getFileIcon, getFileColor, onHover, isHovered, expanded = false }) {
  return (
    <div 
      className={`border rounded-lg p-3 transition-all cursor-pointer ${getFileColor(file.type)} ${isHovered ? 'ring-2 ring-amber-400 scale-105' : ''}`}
      onMouseEnter={() => onHover(file.name)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-2 mb-1">
        {getFileIcon(file.type)}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-gray-100 truncate">{file.name}</div>
          {file.builds && (
            <div className="text-xs text-gray-400 mt-1">{file.builds}</div>
          )}
        </div>
      </div>
      
      {expanded && file.provides && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            {file.provides.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1">
                <span className="text-emerald-400">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionDetails({ fileName, files }) {
  let fileData = null;
  
  // Find the file in all categories
  Object.values(files).forEach(category => {
    const found = category.find(f => f.name === fileName);
    if (found) fileData = found;
  });

  if (!fileData || !fileData.connects) {
    return <p className="text-gray-400">No connection data available</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-gray-300 mb-3">This file connects to:</p>
      <div className="grid md:grid-cols-2 gap-2">
        {fileData.connects.map((connection, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-800/50 rounded px-3 py-2 border border-slate-700">
            <ChevronRight className="w-4 h-4 text-amber-400" />
            <code className="text-sm text-gray-200">{connection}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, count, color }) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
      <div className={`text-3xl font-bold ${color}`}>{count}</div>
      <div className="text-sm text-gray-400 mt-1">{title}</div>
    </div>
  );
}

function LegendItem({ icon, label }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}