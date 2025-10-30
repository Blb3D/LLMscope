import React, { useState, useEffect } from 'react';

/**
 * LLMscope AI Copilot Widget
 * 
 * Provides AI-powered explanations for SPC violations using local Ollama LLMs.
 * Features:
 * - Expandable side panel
 * - Multiple explanation types (technical, business, remediation)
 * - Typing animation for AI responses
 * - Caching for performance
 */

const CopilotWidget = ({ violation, apiKey, baseUrl = "http://localhost:8000" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationType, setExplanationType] = useState("technical");
  const [error, setError] = useState("");
  const [typingAnimation, setTypingAnimation] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("unknown");

  // Test Ollama connection on mount
  useEffect(() => {
    testOllamaConnection();
  }, []);

  // Auto-open when violation selected
  useEffect(() => {
    if (violation && !isExpanded) {
      setIsExpanded(true);
    }
  }, [violation]);

  // Typing animation effect
  useEffect(() => {
    if (!typingAnimation || !explanation) return;
    
    let index = 0;
    setDisplayedText("");
    
    const timer = setInterval(() => {
      if (index <= explanation.length) {
        setDisplayedText(explanation.slice(0, index));
        index++;
      } else {
        setTypingAnimation(false);
        clearInterval(timer);
      }
    }, 20); // Adjust speed here
    
    return () => clearInterval(timer);
  }, [typingAnimation, explanation]);

  const testOllamaConnection = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/copilot/test`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setConnectionStatus(result.ollama_available ? "connected" : "disconnected");
      } else {
        setConnectionStatus("error");
      }
    } catch (e) {
      setConnectionStatus("error");
    }
  };

  const handleExplain = async (type = "technical") => {
    if (!violation) return;
    
    setLoading(true);
    setError("");
    setExplanationType(type);
    
    try {
      const response = await fetch(
        `${baseUrl}/api/violations/${violation.id}/explain?explanation_type=${type}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setExplanation(result.explanation);
        setTypingAnimation(true);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to generate explanation');
      }
    } catch (e) {
      setError('Connection error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected": return "🟢";
      case "disconnected": return "🟡";
      case "error": return "🔴";
      default: return "⚪";
    }
  };

  const getExplanationIcon = (type) => {
    switch (type) {
      case "technical": return "🔬";
      case "business": return "💼";
      case "remediation": return "🔧";
      default: return "🤖";
    }
  };

  if (!violation) return null;

  return (
    <div className={`fixed right-0 top-0 h-full bg-slate-900/95 backdrop-blur border-l border-slate-700 transition-all duration-300 z-50 ${
      isExpanded ? 'w-96' : 'w-12'
    }`}>
      
      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors shadow-lg"
        title={isExpanded ? "Collapse AI Copilot" : "Expand AI Copilot"}
      >
        {isExpanded ? '→' : '🤖'}
      </button>
      
      {isExpanded && (
        <div className="p-4 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm">
                🤖
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">AI Copilot</h3>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  {getConnectionIcon()} Ollama
                </div>
              </div>
            </div>
            <button
              onClick={() => testOllamaConnection()}
              className="text-xs text-slate-400 hover:text-white transition-colors"
              title="Test connection"
            >
              🔄
            </button>
          </div>
          
          {/* Violation Summary Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-3 mb-4 border border-slate-600">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Analyzing Violation</div>
            <div className="text-white font-bold text-sm">{violation.rule} • {violation.model}</div>
            <div className="text-red-400 font-mono text-sm">
              {violation.latency_ms?.toFixed(1)}ms 
              <span className="text-slate-400 ml-2">
                ({violation.deviation_sigma?.toFixed(1)}σ)
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {new Date(violation.timestamp).toLocaleString()}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2 mb-4">
            {[
              { type: "technical", label: "Explain This Violation", color: "blue" },
              { type: "business", label: "Business Impact", color: "green" },
              { type: "remediation", label: "Suggest Fixes", color: "orange" }
            ].map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => handleExplain(type)}
                disabled={loading || connectionStatus !== "connected"}
                className={`w-full bg-${color}-600 hover:bg-${color}-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                  explanationType === type ? 'ring-2 ring-white/20' : ''
                }`}
              >
                <span>{getExplanationIcon(type)}</span>
                {loading && explanationType === type ? 'Analyzing...' : label}
              </button>
            ))}
          </div>
          
          {/* Connection Status Warning */}
          {connectionStatus !== "connected" && (
            <div className="bg-yellow-900/50 border border-yellow-600/50 rounded-lg p-3 mb-4">
              <div className="text-yellow-400 text-sm font-medium">⚠️ Ollama Not Available</div>
              <div className="text-yellow-200 text-xs mt-1">
                Install Ollama and run: <code className="bg-black/30 px-1 rounded">ollama pull llama3.2:3b</code>
              </div>
            </div>
          )}
          
          {/* AI Response Area */}
          <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col min-h-0">
            
            {/* Response Header */}
            <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                    Thinking...
                  </div>
                ) : explanation ? (
                  <span>{getExplanationIcon(explanationType)} {explanationType.charAt(0).toUpperCase() + explanationType.slice(1)} Analysis</span>
                ) : (
                  "Ready for analysis"
                )}
              </div>
              {explanation && (
                <button
                  onClick={() => setTypingAnimation(!typingAnimation)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                  title="Toggle animation"
                >
                  {typingAnimation ? '⏸️' : '▶️'}
                </button>
              )}
            </div>
            
            {/* Response Content */}
            <div className="flex-1 p-3 overflow-y-auto">
              {error ? (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30">
                  <div className="font-medium">Error</div>
                  <div className="text-red-300 text-xs mt-1">{error}</div>
                </div>
              ) : loading ? (
                <div className="text-slate-400 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">🤔 Analyzing violation...</div>
                  </div>
                  <div className="w-full bg-slate-700 h-1 rounded overflow-hidden">
                    <div className="bg-blue-600 h-full rounded animate-pulse"></div>
                  </div>
                  <div className="text-xs">Using Ollama {connectionStatus === "connected" ? "🟢" : "🔴"}</div>
                </div>
              ) : explanation ? (
                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {typingAnimation ? displayedText : explanation}
                  {typingAnimation && <span className="animate-pulse">|</span>}
                </div>
              ) : (
                <div className="text-slate-400 text-sm text-center py-8">
                  <div className="text-2xl mb-2">🤖</div>
                  <div>Select a violation and click an analysis button</div>
                  <div className="text-xs mt-2">AI explanations powered by Ollama</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CopilotWidget;