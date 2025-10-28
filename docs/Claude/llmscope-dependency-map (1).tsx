import React, { useState } from 'react';
import { Network, Package, FileCode, Server, Database, Globe, ChevronRight, ChevronDown } from 'lucide-react';

export default function DependencyMap() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    backend: true,
    frontend: true,
    monitor: true,
    docker: true
  });

  const dependencies = {
    backend: {
      name: "Backend (app.py)",
      type: "Python/FastAPI",
      color: "bg-blue-500",
      packages: [
        { name: "fastapi", purpose: "Web framework, API endpoints" },
        { name: "uvicorn", purpose: "ASGI server" },
        { name: "pydantic", purpose: "Data validation (LogEntry model)" },
        { name: "sqlite3", purpose: "Database operations" },
        { name: "psutil", purpose: "System metrics (CPU, memory)" },
        { name: "pynvml", purpose: "NVIDIA GPU temperature monitoring" },
        { name: "numpy", purpose: "Statistical calculations" },
        { name: "aiohttp", purpose: "Async HTTP client" }
      ],
      modules: [
        { name: "Database Context Manager", uses: ["sqlite3"] },
        { name: "SPC Analysis", uses: ["numpy", "statistics"] },
        { name: "Nelson Rules Detection", uses: ["math"] },
        { name: "System Telemetry", uses: ["psutil", "pynvml"] }
      ],
      endpoints: [
        "/health",
        "/api/ (GET)",
        "/api/log (POST)",
        "/api/stats (GET)",
        "/api/analysis (GET)",
        "/api/stats/spc (GET)",
        "/api/providers (GET)",
        "/api/system (GET)"
      ]
    },
    frontend: {
      name: "Frontend (React/Vite)",
      type: "JavaScript",
      color: "bg-cyan-500",
      packages: [
        { name: "react", version: "^18.2.0", purpose: "UI framework" },
        { name: "react-dom", version: "^18.2.0", purpose: "DOM rendering" },
        { name: "react-router-dom", version: "^6.20.0", purpose: "Routing (/, /analysis)" },
        { name: "recharts", version: "^2.10.3", purpose: "SPC charts in Dashboard" },
        { name: "react-plotly.js", version: "^2.6.0", purpose: "Advanced charts in Analysis" },
        { name: "plotly.js", version: "^2.27.1", purpose: "Plotting library" },
        { name: "axios", version: "^1.6.2", purpose: "HTTP requests" },
        { name: "vite", version: "^5.0.8", purpose: "Build tool" }
      ],
      components: [
        { name: "Dashboard.jsx", depends: ["SPCChart.jsx", "react-router-dom"] },
        { name: "SPCChart.jsx", depends: ["recharts"] },
        { name: "SPCAnalysisPlotly.jsx", depends: ["react-plotly.js", "plotly.js"] },
        { name: "main.tsx", depends: ["react-router-dom", "Dashboard", "SPCAnalysisPlotly"] }
      ],
      apiCalls: [
        "GET /api/ - Fetch logs",
        "GET /api/system - System metrics",
        "GET /api/stats - SPC data"
      ]
    },
    monitor: {
      name: "Monitor (monitor_apis_revA.py)",
      type: "Python/Async",
      color: "bg-green-500",
      packages: [
        { name: "aiohttp", purpose: "Async HTTP client for Ollama API" },
        { name: "asyncio", purpose: "Async event loop" }
      ],
      functions: [
        { name: "test_ollama()", calls: ["OLLAMA_BASE_URL/api/generate"] },
        { name: "post_result()", calls: ["LLMSCOPE_API_BASE/api/log"] },
        { name: "monitor_loop()", orchestrates: ["test_ollama", "post_result"] }
      ],
      environment: [
        "LLMSCOPE_API_BASE",
        "OLLAMA_BASE_URL",
        "OLLAMA_MODEL",
        "USE_OLLAMA",
        "MONITOR_INTERVAL"
      ]
    },
    docker: {
      name: "Docker Infrastructure",
      type: "Container",
      color: "bg-purple-500",
      services: [
        { 
          name: "llmscope_api", 
          image: "Dockerfile.backend",
          exposes: "8000",
          depends: []
        },
        { 
          name: "llmscope_web", 
          image: "Dockerfile.frontend",
          exposes: "80 (nginx)",
          depends: ["llmscope_api"]
        },
        { 
          name: "llmscope_monitor", 
          image: "Dockerfile.monitor",
          exposes: "none",
          depends: ["llmscope_api"]
        }
      ],
      networking: [
        "llmscope_web:80 → nginx proxy → llmscope_api:8000",
        "llmscope_monitor → llmscope_api:8000/api/log",
        "llmscope_monitor → host.docker.internal:11434 (Ollama)"
      ]
    }
  };

  const dataFlow = [
    { from: "Ollama", to: "Monitor", label: "Model inference" },
    { from: "Monitor", to: "Backend API", label: "POST /api/log" },
    { from: "Backend API", to: "SQLite DB", label: "Store metrics" },
    { from: "Frontend", to: "Backend API", label: "GET /api/, /api/stats" },
    { from: "Backend API", to: "Frontend", label: "JSON response" },
    { from: "Backend API", to: "System", label: "psutil, pynvml" }
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              LLMscope Dependency Map
            </h1>
          </div>
          <p className="text-gray-400 ml-11">Interactive visualization of packages, modules, and data flow</p>
        </div>

        {/* Architecture Overview */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            System Architecture
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {dataFlow.map((flow, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400 font-semibold">{flow.from}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                  <span className="text-blue-400 font-semibold">{flow.to}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{flow.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Backend Dependencies */}
        <DependencySection
          title="Backend Dependencies"
          icon={<Server className="w-5 h-5" />}
          data={dependencies.backend}
          expanded={expandedSections.backend}
          onToggle={() => toggleSection('backend')}
          color="blue"
        />

        {/* Frontend Dependencies */}
        <DependencySection
          title="Frontend Dependencies"
          icon={<Globe className="w-5 h-5" />}
          data={dependencies.frontend}
          expanded={expandedSections.frontend}
          onToggle={() => toggleSection('frontend')}
          color="cyan"
        />

        {/* Monitor Dependencies */}
        <DependencySection
          title="Monitor Dependencies"
          icon={<FileCode className="w-5 h-5" />}
          data={dependencies.monitor}
          expanded={expandedSections.monitor}
          onToggle={() => toggleSection('monitor')}
          color="green"
        />

        {/* Docker Infrastructure */}
        <DependencySection
          title="Docker Infrastructure"
          icon={<Package className="w-5 h-5" />}
          data={dependencies.docker}
          expanded={expandedSections.docker}
          onToggle={() => toggleSection('docker')}
          color="purple"
        />

        {/* Key Insights */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            Key Dependencies & Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <InsightCard 
              title="Core Backend Stack"
              items={["FastAPI + Uvicorn", "SQLite (requests table)", "Pydantic validation", "CORS middleware"]}
            />
            <InsightCard 
              title="Statistical Processing"
              items={["NumPy for calculations", "Nelson Rules (4 rules)", "Rolling mean/sigma", "Cpk/Cp indices"]}
            />
            <InsightCard 
              title="Frontend Stack"
              items={["React 18 + Vite", "Recharts for SPC", "Plotly for advanced viz", "React Router (2 routes)"]}
            />
            <InsightCard 
              title="Monitoring System"
              items={["Async aiohttp", "30s interval polling", "Ollama integration", "Auto-posting to /api/log"]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DependencySection({ title, icon, data, expanded, onToggle, color }) {
  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5",
    cyan: "border-cyan-500/30 bg-cyan-500/5",
    green: "border-green-500/30 bg-green-500/5",
    purple: "border-purple-500/30 bg-purple-500/5"
  };

  return (
    <div className={`rounded-xl border ${colorClasses[color]} backdrop-blur-sm mb-4 overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/30 transition"
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-100">{title}</h2>
            <p className="text-sm text-gray-400">{data.name} • {data.type}</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className="p-5 pt-0 space-y-4">
          {/* Packages */}
          {data.packages && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Packages</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {data.packages.map((pkg, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-emerald-400 font-mono text-sm">{pkg.name}</code>
                      {pkg.version && <span className="text-xs text-gray-500">{pkg.version}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pkg.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Components */}
          {data.components && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Components</h3>
              <div className="space-y-2">
                {data.components.map((comp, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <code className="text-cyan-400 font-mono text-sm">{comp.name}</code>
                    <p className="text-xs text-gray-500 mt-1">
                      Depends on: {comp.depends.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modules */}
          {data.modules && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Modules</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {data.modules.map((mod, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="text-blue-400 font-semibold text-sm">{mod.name}</div>
                    <p className="text-xs text-gray-500 mt-1">Uses: {mod.uses.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Functions */}
          {data.functions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Functions</h3>
              <div className="space-y-2">
                {data.functions.map((fn, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <code className="text-green-400 font-mono text-sm">{fn.name}</code>
                    <p className="text-xs text-gray-500 mt-1">
                      {fn.calls && `Calls: ${fn.calls.join(', ')}`}
                      {fn.orchestrates && `Orchestrates: ${fn.orchestrates.join(', ')}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {data.services && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Docker Services</h3>
              <div className="space-y-2">
                {data.services.map((svc, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <code className="text-purple-400 font-mono text-sm font-semibold">{svc.name}</code>
                      <span className="text-xs text-gray-500">{svc.exposes}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Image: {svc.image}</p>
                    {svc.depends.length > 0 && (
                      <p className="text-xs text-amber-400 mt-1">Depends on: {svc.depends.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Networking */}
          {data.networking && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Network Flow</h3>
              <div className="space-y-1">
                {data.networking.map((net, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded p-2 border border-slate-700">
                    <code className="text-xs text-gray-300 font-mono">{net}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Endpoints */}
          {data.endpoints && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">API Endpoints</h3>
              <div className="grid md:grid-cols-2 gap-1">
                {data.endpoints.map((ep, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded px-3 py-2 border border-slate-700">
                    <code className="text-xs text-amber-400 font-mono">{ep}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Calls */}
          {data.apiCalls && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">API Calls</h3>
              <div className="space-y-1">
                {data.apiCalls.map((call, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded px-3 py-2 border border-slate-700">
                    <code className="text-xs text-cyan-400 font-mono">{call}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment */}
          {data.environment && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Environment Variables</h3>
              <div className="grid md:grid-cols-3 gap-2">
                {data.environment.map((env, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded px-3 py-2 border border-slate-700">
                    <code className="text-xs text-yellow-400 font-mono">{env}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, items }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="font-semibold text-gray-200 mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="text-gray-400 text-sm flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}