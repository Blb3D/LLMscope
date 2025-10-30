import React, { useState, useEffect } from 'react';

/**
 * LLMscope AI Copilot Widget - Enhanced with Resolution Workflow
 * 
 * Provides AI-powered explanations for SPC violations using local Ollama LLMs.
 * Features:
 * - Expandable side panel
 * - Multiple explanation types (technical, business, remediation)
 * - Typing animation for AI responses
 * - Integrated violation resolution workflow
 * - Direct acknowledge/resolve actions from copilot
 */

const CopilotWidget = ({ 
  violation, 
  apiKey, 
  baseUrl = "http://localhost:8000",
  onViolationUpdate = null // Callback to refresh violations in parent
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationType, setExplanationType] = useState("technical");
  const [error, setError] = useState("");
  const [typingAnimation, setTypingAnimation] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("unknown");
  const [modelStatus, setModelStatus] = useState(null); // Smart model detection data
  const [showDetailedHelp, setShowDetailedHelp] = useState(false); // Info pill toggle
  const [fallbackInfo, setFallbackInfo] = useState(null); // Track when fallback model is used
  
  // Resolution workflow states
  const [showResolutionActions, setShowResolutionActions] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionSuccess, setResolutionSuccess] = useState(false);

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
      // Test basic connection
      const response = await fetch(`${baseUrl}/api/copilot/test`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.ollama_available || result.success) {
          setConnectionStatus("connected");
          
          // Fetch detailed model status
          try {
            const modelResponse = await fetch(`${baseUrl}/api/copilot/model-updates`, {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (modelResponse.ok) {
              const modelData = await modelResponse.json();
              setModelStatus(modelData);
            }
          } catch (e) {
            console.warn("Could not fetch model status:", e);
          }
        } else {
          setConnectionStatus("disconnected");
          setModelStatus(null);
        }
      } else {
        setConnectionStatus("error");
        setModelStatus(null);
      }
    } catch (e) {
      setConnectionStatus("error");
      setModelStatus(null);
    }
  };

  // Smart error analysis and recovery suggestions
  const analyzeError = (errorMessage) => {
    const lowerError = errorMessage.toLowerCase();
    
    // Detect model 404 errors
    if (lowerError.includes('404') && lowerError.includes('ollama')) {
      return {
        type: 'model_not_found',
        title: '🔧 Model Not Available',
        message: 'The configured model isn\'t installed in Ollama.',
        canAutoFix: true,
        suggestions: [
          {
            action: 'download_model',
            title: 'Download Missing Model',
            description: 'Install the required model automatically',
            command: 'ollama pull llama3.2:1b',
            url: 'https://ollama.com/library/llama3.2'
          },
          {
            action: 'use_available',
            title: 'Use Available Model',
            description: 'Switch to an installed model',
            note: 'We can detect and switch to models you already have'
          }
        ]
      };
    }
    
    // Detect connection errors
    if (lowerError.includes('connection') || lowerError.includes('network')) {
      return {
        type: 'connection_error',
        title: '🌐 Connection Issue',
        message: 'Unable to connect to Ollama service.',
        canAutoFix: false,
        suggestions: [
          {
            action: 'check_ollama',
            title: 'Check Ollama Service',
            description: 'Ensure Ollama is running',
            command: 'ollama serve'
          }
        ]
      };
    }
    
    // Default error handling
    return {
      type: 'generic_error',
      title: '❌ Error',
      message: errorMessage,
      canAutoFix: false,
      suggestions: []
    };
  };

  const handleAutoFix = async (suggestion) => {
    if (suggestion.action === 'download_model') {
      // Show user the download instructions
      setError(`To fix this, run: ${suggestion.command}\n\nThis will download the required model (about 1.3GB). After downloading, refresh this page.`);
    } else if (suggestion.action === 'use_available') {
      // Try to detect and switch to available models
      await testOllamaConnection();
    } else if (suggestion.action === 'check_ollama') {
      // Retest connection
      await testOllamaConnection();
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
        
        // Check if a fallback model was used
        if (result.model_fallback_used) {
          setFallbackInfo({
            configuredModel: result.configured_model,
            usedModel: result.model_used,
            fallbackUsed: true
          });
        } else {
          setFallbackInfo(null);
        }
        
        // Debug: Log the result to see what we're getting
        console.log('AI Copilot result:', result);
        
        // Show resolution actions after explanation is complete
        setTimeout(() => {
          setShowResolutionActions(true);
        }, 2000);
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

  // Smart setup message generator
  const getSmartSetupMessage = () => {
    if (connectionStatus === "connected" && modelStatus?.success) {
      const installedModels = modelStatus.installed_llama_models || [];
      const recommendations = modelStatus.recommendations || [];
      
      // Check what's installed
      const has3b = installedModels.some(m => m.includes("3b"));
      const has1b = installedModels.some(m => m.includes("1b"));
      
      if (has3b) {
        return {
          type: "success",
          title: "✅ Ready! Using llama3.2:3b",
          message: "AI Copilot is ready for high-quality explanations.",
          showButton: false
        };
      } else if (has1b) {
        return {
          type: "upgrade",
          title: "✅ Ollama + llama3.2:1b detected",
          message: "Working! Consider upgrading to 3b for better analysis quality:",
          steps: [
            "Open terminal/command prompt",
            "Run: ollama pull llama3.2:3b",
            "Wait for download (3.3GB)",
            "Refresh this page"
          ],
          link: "https://ollama.com/library/llama3.2",
          linkText: "Compare models",
          showButton: true
        };
      } else if (installedModels.length > 0) {
        return {
          type: "model-needed", 
          title: "✅ Ollama detected",
          message: "Install recommended model for LLMscope:",
          steps: [
            "Open terminal/command prompt",
            "Run: ollama pull llama3.2:3b",
            "Wait for download (3.3GB)",
            "Refresh this page"
          ],
          link: "https://ollama.com/library/llama3.2",
          linkText: "Browse models",
          showButton: true
        };
      }
    }
    
    // Default: Nothing detected
    return {
      type: "install",
      title: "⚠️ Install Ollama + Model needed",
      message: "Get started with local AI explanations:",
      steps: [
        "Visit ollama.com and download Ollama",
        "Install and restart terminal/command prompt",
        "Run: ollama pull llama3.2:3b",
        "Wait for download (3.3GB)",
        "Refresh this page"
      ],
      link: "https://ollama.com/library/llama3.2",
      linkText: "Visit Ollama website",
      showButton: true
    };
  };

  const handleCopilotAcknowledge = async () => {
    if (!violation) return;
    
    setResolutionLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/violations/${violation.id}/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            acknowledged_by: 'AI Copilot Analysis'
          })
        }
      );
      
      if (response.ok) {
        setResolutionSuccess(true);
        if (onViolationUpdate) onViolationUpdate();
      } else {
        setError('Failed to acknowledge violation');
      }
    } catch (e) {
      setError('Failed to acknowledge violation');
    } finally {
      setResolutionLoading(false);
    }
  };

  const handleCopilotResolve = async () => {
    if (!violation) return;
    
    setResolutionLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/violations/${violation.id}/resolve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        setResolutionSuccess(true);
        if (onViolationUpdate) onViolationUpdate();
      } else {
        setError('Failed to resolve violation');
      }
    } catch (e) {
      setError('Failed to resolve violation');
    } finally {
      setResolutionLoading(false);
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
          
          {/* Smart Setup Status */}
          {(() => {
            const setupMsg = getSmartSetupMessage();
            
            if (setupMsg.type === "success") {
              return (
                <div className="bg-green-900/50 border border-green-600/50 rounded-lg p-3 mb-4">
                  <div className="text-green-400 text-sm font-medium">{setupMsg.title}</div>
                  <div className="text-green-200 text-xs mt-1">{setupMsg.message}</div>
                </div>
              );
            }
            
            if (connectionStatus === "connected") {
              return null; // Don't show warning if connected and ready
            }
            
            // Show smart setup for disconnected/checking states
            return (
              <div className={
                setupMsg.type === "upgrade" 
                  ? "bg-blue-900/50 border border-blue-600/50 rounded-lg p-3 mb-4"
                  : "bg-yellow-900/50 border border-yellow-600/50 rounded-lg p-3 mb-4"
              }>
                <div className={
                  setupMsg.type === "upgrade" 
                    ? "text-blue-400 text-sm font-medium" 
                    : "text-yellow-400 text-sm font-medium"
                }>
                  {setupMsg.title}
                </div>
                <div className={
                  setupMsg.type === "upgrade"
                    ? "text-blue-200 text-xs mt-1 space-y-2"
                    : "text-yellow-200 text-xs mt-1 space-y-2"
                }>
                  <div>{setupMsg.message}</div>
                  
                  {setupMsg.steps && (
                    <div className="space-y-1">
                      <div className="font-medium text-white">Step-by-step:</div>
                      <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                        {setupMsg.steps.map((step, index) => (
                          <li key={index} className="leading-relaxed">
                            {step.includes("ollama pull") || step.includes("ollama run") ? (
                              <div className="flex items-start space-x-2">
                                <span className="font-mono bg-black/30 px-1 rounded">{step}</span>
                                <button
                                  onClick={() => setShowDetailedHelp(!showDetailedHelp)}
                                  className="text-blue-400 hover:text-blue-300 text-xs flex items-center ml-1"
                                  title="Show detailed instructions"
                                >
                                  ℹ️
                                </button>
                              </div>
                            ) : (
                              step
                            )}
                          </li>
                        ))}
                      </ol>
                      
                      {/* Info pill - detailed help */}
                      {showDetailedHelp && (
                        <div className="mt-3 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30 text-xs space-y-2">
                          <div className="font-semibold text-blue-300">💡 Need help with the terminal command?</div>
                          <div className="space-y-1 text-blue-200">
                            <div><strong>Windows:</strong> Open PowerShell or Command Prompt</div>
                            <div><strong>Mac/Linux:</strong> Open Terminal</div>
                            <div><strong>Tip:</strong> Copy-paste the command to avoid typos</div>
                            <div><strong>Download time:</strong> 1b model ≈ 2 min, 3b model ≈ 5 min</div>
                            <div><strong>Success looks like:</strong> "&gt;&gt;&gt; " prompt appears (type "exit" to return)</div>
                          </div>
                          <div className="text-blue-300 mt-2">
                            <strong>Stuck?</strong> Check{" "}
                            <a 
                              href="https://github.com/ollama/ollama#quickstart" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-200"
                            >
                              Ollama quickstart guide
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {setupMsg.link && (
                    <div className="pt-1">
                      <a 
                        href={setupMsg.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                        style={{ textDecoration: 'underline', color: '#60a5fa' }}
                      >
                        🔗 {setupMsg.linkText}
                      </a>
                    </div>
                  )}
                  
                  {setupMsg.showButton && (
                    <div className="mt-2">
                      <button
                        onClick={() => testOllamaConnection()}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors"
                      >
                        🔄 Refresh Status
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
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
                (() => {
                  const errorAnalysis = analyzeError(error);
                  return (
                    <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30 space-y-3">
                      <div className="font-medium">{errorAnalysis.title}</div>
                      <div className="text-red-300 text-xs">{errorAnalysis.message}</div>
                      
                      {errorAnalysis.suggestions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-red-500/20">
                          <div className="text-xs font-medium text-red-200">Quick Fixes:</div>
                          {errorAnalysis.suggestions.map((suggestion, index) => (
                            <div key={index} className="bg-red-900/30 p-2 rounded border border-red-500/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-red-200">{suggestion.title}</div>
                                  <div className="text-xs text-red-300 mt-1">{suggestion.description}</div>
                                  {suggestion.command && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <code className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-200">
                                        {suggestion.command}
                                      </code>
                                      <button
                                        onClick={() => setShowDetailedHelp(!showDetailedHelp)}
                                        className="text-blue-400 hover:text-blue-300 text-xs"
                                        title="Show detailed instructions"
                                      >
                                        ℹ️
                                      </button>
                                    </div>
                                  )}
                                  {suggestion.url && (
                                    <div className="mt-2">
                                      <a 
                                        href={suggestion.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 underline text-xs"
                                      >
                                        🔗 View Model Page
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {errorAnalysis.canAutoFix && (
                                  <button
                                    onClick={() => handleAutoFix(suggestion)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs ml-2"
                                  >
                                    Fix
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Detailed help section */}
                      {showDetailedHelp && (
                        <div className="mt-3 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30 text-xs space-y-2">
                          <div className="font-semibold text-blue-300">💡 Detailed Instructions</div>
                          <div className="space-y-1 text-blue-200">
                            <div><strong>Windows:</strong> Open PowerShell or Command Prompt</div>
                            <div><strong>Mac/Linux:</strong> Open Terminal</div>
                            <div><strong>Tip:</strong> Copy-paste the command to avoid typos</div>
                            <div><strong>Download time:</strong> 1b model ≈ 2 min, 3b model ≈ 5 min</div>
                            <div><strong>Success looks like:</strong> "&gt;&gt;&gt; " prompt appears (type "exit" to return)</div>
                          </div>
                          <div className="text-blue-300 mt-2">
                            <strong>Still stuck?</strong> Check{" "}
                            <a 
                              href="https://github.com/ollama/ollama#quickstart" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-200"
                            >
                              Ollama quickstart guide
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
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
                <div className="space-y-4">
                  <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {typingAnimation ? displayedText : explanation}
                    {typingAnimation && <span className="animate-pulse">|</span>}
                  </div>
                  
                  {/* Fallback Model Notification */}
                  {fallbackInfo && fallbackInfo.fallbackUsed && (
                    <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-300">
                        <span>🔄</span>
                        <span className="font-medium">Smart Fallback Used</span>
                      </div>
                      <div className="text-amber-200/80 mt-1">
                        Configured model <code className="bg-black/30 px-1 rounded">{fallbackInfo.configuredModel}</code> not available, 
                        using <code className="bg-black/30 px-1 rounded">{fallbackInfo.usedModel}</code> instead.
                      </div>
                      <div className="text-amber-200/60 mt-1">
                        💡 Run <code className="bg-black/30 px-1 rounded">ollama pull {fallbackInfo.configuredModel}</code> to use your preferred model.
                      </div>
                    </div>
                  )}
                  
                  {/* Resolution Actions - Show after explanation */}
                  {showResolutionActions && !violation.is_acknowledged && !violation.resolved_at && !resolutionSuccess && (
                    <div className="border-t border-slate-600 pt-4 space-y-3">
                      <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                        🎯 Next Steps
                      </div>
                      
                      <div className="space-y-2">
                        <button
                          onClick={handleCopilotAcknowledge}
                          disabled={resolutionLoading}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span>✓</span>
                          {resolutionLoading ? 'Acknowledging...' : 'Acknowledge (AI Analyzed)'}
                        </button>
                        
                        <button
                          onClick={handleCopilotResolve}
                          disabled={resolutionLoading}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span>🔧</span>
                          {resolutionLoading ? 'Resolving...' : 'Mark as Resolved'}
                        </button>
                      </div>
                      
                      <div className="text-xs text-slate-500 italic">
                        Skip email workflow - AI analysis provides sufficient context
                      </div>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {resolutionSuccess && (
                    <div className="border-t border-slate-600 pt-4">
                      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                        <div className="text-green-400 text-sm font-medium">✅ Action Complete</div>
                        <div className="text-green-200 text-xs mt-1">
                          Violation updated successfully
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Already Processed State */}
                  {(violation.is_acknowledged || violation.resolved_at) && (
                    <div className="border-t border-slate-600 pt-4">
                      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                        <div className="text-blue-400 text-sm font-medium">
                          📋 {violation.resolved_at ? 'Resolved' : 'Acknowledged'}
                        </div>
                        <div className="text-blue-200 text-xs mt-1">
                          {violation.resolved_at 
                            ? `Resolved ${new Date(violation.resolved_at).toLocaleString()}`
                            : `Acknowledged by ${violation.acknowledged_by} on ${new Date(violation.acknowledged_at).toLocaleString()}`
                          }
                        </div>
                      </div>
                    </div>
                  )}
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