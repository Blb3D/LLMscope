# LLMscope AI Copilot - Technical Design

## 🎯 Vision
Add an intelligent AI copilot to LLMscope that explains SPC violations in plain English, provides business impact analysis, and suggests actionable remediation steps. The copilot leverages lightweight local LLMs via Ollama for privacy and cost-effectiveness.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Ollama API    │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │   Copilot   │◄┼────┼►│  Explanation │◄┼────┼►│  llama3.2   │ │
│ │   Widget    │ │    │ │   Service    │ │    │ │   (3B/1B)   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Flow

1. **Violation Detection** → Standard Nelson Rules trigger as before
2. **Context Gathering** → Collect violation + historical + system data  
3. **AI Analysis** → Send structured prompt to local Ollama instance
4. **Response Processing** → Parse and store AI explanation
5. **UI Presentation** → Display explanation in copilot widget

## 🎛️ Frontend Integration

### New Copilot Widget
```jsx
// Add to Dashboard_ollama_revB.jsx
<CopilotWidget 
  violation={selectedViolation}
  onExplain={handleGetExplanation}
  loading={explanationLoading}
  explanation={currentExplanation}
/>
```

### Widget Features
- **Expandable Panel**: Slides in from right side when violation selected
- **Real-time Typing**: Simulated typing effect for AI responses
- **Context Aware**: Shows relevant charts, stats, and trend data
- **Action Buttons**: "Explain This", "Get Business Impact", "Suggest Fix"

## 🔧 Backend Implementation

### 1. New Database Schema
```sql
-- AI explanations table
CREATE TABLE IF NOT EXISTS ai_explanations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    violation_id INTEGER NOT NULL,
    explanation_type TEXT NOT NULL, -- 'technical', 'business', 'remediation'
    prompt_template TEXT,
    raw_response TEXT,
    processed_explanation TEXT,
    confidence_score REAL,
    model_used TEXT,
    generation_time_ms INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(violation_id) REFERENCES violations(id)
);

-- Copilot settings
INSERT INTO settings (key, value, type, description) VALUES 
('copilot_enabled', 'true', 'boolean', 'Enable AI copilot explanations'),
('copilot_ollama_url', 'http://localhost:11434', 'text', 'Ollama API endpoint'),
('copilot_model', 'llama3.2:3b', 'text', 'Model for explanations'),
('copilot_auto_explain', 'false', 'boolean', 'Auto-generate explanations for new violations');
```

### 2. Explanation Service
```python
# New file: backend/copilot_service.py
import aiohttp
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class CopilotService:
    def __init__(self, ollama_url: str, model: str):
        self.ollama_url = ollama_url
        self.model = model
    
    async def explain_violation(self, violation_data: Dict, context_data: Dict) -> Dict:
        """Generate AI explanation for SPC violation."""
        
        prompt = self._build_prompt(violation_data, context_data)
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower for more consistent explanations
                        "num_predict": 500,  # Limit response length
                    }
                }
                
                start_time = datetime.now()
                async with session.post(f"{self.ollama_url}/api/generate", 
                                      json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        generation_time = (datetime.now() - start_time).total_seconds() * 1000
                        
                        return {
                            "explanation": result["response"],
                            "model_used": self.model,
                            "generation_time_ms": int(generation_time),
                            "confidence_score": self._calculate_confidence(result["response"]),
                            "success": True
                        }
                    else:
                        return {"success": False, "error": f"Ollama API error: {response.status}"}
                        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _build_prompt(self, violation_data: Dict, context_data: Dict) -> str:
        """Build structured prompt for AI explanation."""
        
        # Extract key metrics
        rule = violation_data["rule"]
        latency = violation_data["latency_ms"]
        mean = violation_data["mean_ms"] 
        deviation = violation_data["deviation_sigma"]
        model_name = violation_data["model"]
        
        # Build context
        recent_violations = len(context_data.get("recent_violations", []))
        system_load = context_data.get("system_metrics", {})
        
        prompt = f"""You are an expert SPC (Statistical Process Control) analyst for LLM monitoring systems. 

VIOLATION DETECTED:
- Rule: {rule} ({self._get_rule_description(rule)})
- Model: {model_name}
- Latency: {latency:.2f}ms (deviation: {deviation:.2f}σ from mean {mean:.2f}ms)
- Timestamp: {violation_data["timestamp"]}

CONTEXT:
- Recent violations in last hour: {recent_violations}
- CPU Usage: {system_load.get('cpu_percent', 'unknown')}%
- Memory Usage: {system_load.get('memory_percent', 'unknown')}%
- GPU Usage: {system_load.get('gpu_percent', 'unknown')}%

Please provide a concise explanation covering:
1. WHAT HAPPENED: Explain the violation in simple terms
2. WHY IT MATTERS: Business impact (user experience, costs, reliability)
3. WHAT TO DO: 2-3 specific actionable steps

Keep response under 300 words. Use clear, non-technical language."""

        return prompt
    
    def _get_rule_description(self, rule: str) -> str:
        """Get human-readable description of Nelson Rule."""
        descriptions = {
            "R1": "Point beyond 3σ control limits - extreme outlier",
            "R2": "9 consecutive points on same side of mean - process shift", 
            "R3": "6 consecutive points in increasing/decreasing trend - gradual drift"
        }
        return descriptions.get(rule, "Unknown rule")
    
    def _calculate_confidence(self, response: str) -> float:
        """Calculate confidence score based on response quality."""
        # Simple heuristic - longer, structured responses = higher confidence
        if len(response) < 50:
            return 0.3
        elif "WHAT HAPPENED" in response and "WHY IT MATTERS" in response:
            return 0.9
        elif any(keyword in response.lower() for keyword in ["latency", "performance", "outlier"]):
            return 0.7
        else:
            return 0.5
```

### 3. API Endpoints
```python
# Add to backend/app.py

@app.post("/api/violations/{violation_id}/explain")
async def explain_violation(
    violation_id: int,
    explanation_type: str = Query("technical", regex="^(technical|business|remediation)$"),
    _: bool = Depends(verify_api_key)
):
    """Generate AI explanation for violation."""
    try:
        # Get violation data
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute("SELECT * FROM violations WHERE id = ?", (violation_id,))
        violation = c.fetchone()
        
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")
        
        # Check if explanation already exists
        c.execute(
            "SELECT * FROM ai_explanations WHERE violation_id = ? AND explanation_type = ?",
            (violation_id, explanation_type)
        )
        existing = c.fetchone()
        
        if existing:
            return {"explanation": existing[4], "cached": True}
        
        # Gather context data
        context_data = await _gather_violation_context(conn, violation)
        
        # Get copilot settings
        settings = get_current_settings(conn)
        if not settings.get("copilot_enabled", True):
            raise HTTPException(status_code=503, detail="AI copilot disabled")
        
        # Initialize copilot service
        copilot = CopilotService(
            ollama_url=settings.get("copilot_ollama_url", "http://localhost:11434"),
            model=settings.get("copilot_model", "llama3.2:3b")
        )
        
        # Generate explanation
        result = await copilot.explain_violation(dict(violation), context_data)
        
        if result["success"]:
            # Store explanation
            c.execute("""
                INSERT INTO ai_explanations 
                (violation_id, explanation_type, raw_response, processed_explanation, 
                 confidence_score, model_used, generation_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                violation_id, explanation_type, result["explanation"],
                result["explanation"], result["confidence_score"],
                result["model_used"], result["generation_time_ms"]
            ))
            conn.commit()
            
            return {
                "explanation": result["explanation"],
                "confidence": result["confidence_score"],
                "model": result["model_used"],
                "generation_time_ms": result["generation_time_ms"],
                "cached": False
            }
        else:
            raise HTTPException(status_code=503, detail=f"AI explanation failed: {result['error']}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

async def _gather_violation_context(conn, violation_data) -> Dict:
    """Gather additional context for AI explanation."""
    c = conn.cursor()
    
    # Recent violations for same model
    cutoff = (datetime.now() - timedelta(hours=1)).isoformat()
    c.execute(
        "SELECT * FROM violations WHERE model = ? AND timestamp >= ? ORDER BY timestamp DESC",
        (violation_data[3], cutoff)  # model field
    )
    recent_violations = c.fetchall()
    
    # System metrics around violation time
    violation_time = violation_data[5]  # timestamp field
    c.execute(
        "SELECT cpu_percent, memory_percent, gpu_percent FROM telemetry WHERE timestamp BETWEEN ? AND ? LIMIT 5",
        (violation_time, violation_time)
    )
    system_metrics = c.fetchone()
    
    return {
        "recent_violations": recent_violations,
        "system_metrics": dict(zip(["cpu_percent", "memory_percent", "gpu_percent"], system_metrics or [0, 0, 0]))
    }
```

## 🎨 UI Components

### CopilotWidget.jsx
```jsx
import React, { useState } from 'react';

export default function CopilotWidget({ violation, onExplain, loading, explanation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!violation) return null;
  
  return (
    <div className={`fixed right-0 top-0 h-full bg-slate-900 border-l border-slate-700 transition-all duration-300 ${
      isExpanded ? 'w-96' : 'w-12'
    }`}>
      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-blue-700"
      >
        {isExpanded ? '→' : '🤖'}
      </button>
      
      {isExpanded && (
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">
              🤖
            </div>
            <h3 className="text-white font-bold">AI Copilot</h3>
          </div>
          
          {/* Violation Summary */}
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <div className="text-sm text-slate-400">Analyzing Violation</div>
            <div className="text-white font-bold">{violation.rule} - {violation.model}</div>
            <div className="text-red-400">{violation.latency_ms}ms ({violation.deviation_sigma.toFixed(2)}σ)</div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2 mb-4">
            <button
              onClick={() => onExplain('technical')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              {loading ? 'Analyzing...' : 'Explain This Violation'}
            </button>
            <button
              onClick={() => onExplain('business')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Business Impact
            </button>
            <button
              onClick={() => onExplain('remediation')}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Suggest Fixes
            </button>
          </div>
          
          {/* AI Response */}
          <div className="flex-1 bg-slate-800 rounded-lg p-3 overflow-y-auto">
            {loading ? (
              <div className="text-slate-400 text-sm">
                <div className="animate-pulse">🤔 Analyzing violation...</div>
                <div className="w-full bg-slate-700 h-2 rounded mt-2">
                  <div className="bg-blue-600 h-2 rounded animate-pulse"></div>
                </div>
              </div>
            ) : explanation ? (
              <div className="text-slate-200 text-sm whitespace-pre-wrap">
                {explanation}
              </div>
            ) : (
              <div className="text-slate-400 text-sm text-center">
                Select a violation and click "Explain This Violation" to get AI insights.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Add AI explanation database schema
- [ ] Create `CopilotService` class
- [ ] Add basic `/explain` API endpoint
- [ ] Test with simple prompts

### Phase 2: Frontend Integration (Week 2)  
- [ ] Build `CopilotWidget` component
- [ ] Integrate into main dashboard
- [ ] Add loading states and error handling
- [ ] Implement typing animation

### Phase 3: Enhanced Prompts (Week 3)
- [ ] Create specialized prompts for each violation type
- [ ] Add business impact calculations
- [ ] Include remediation suggestions
- [ ] Add confidence scoring

### Phase 4: Polish & Performance (Week 4)
- [ ] Add response caching
- [ ] Implement model fallbacks
- [ ] Add copilot settings UI
- [ ] Performance optimizations

## 💰 Business Impact Examples

### R1 Violation (Latency Spike)
> **WHAT HAPPENED:** Your LLM just took 5.2 seconds to respond - that's 300% slower than normal (3σ above average).
> 
> **WHY IT MATTERS:** 
> - Users expect LLM responses in under 2 seconds
> - Each extra second = 11% increase in abandonment rate  
> - If this affects 100 users/day = ~11 lost conversions
> - Estimated cost: $50-200/day in lost revenue
>
> **WHAT TO DO:**
> 1. Check if model is overloaded (reduce concurrent requests)
> 2. Monitor GPU memory - may need to restart service
> 3. Consider switching to faster model variant during peak hours

### R2 Violation (Process Shift)
> **WHAT HAPPENED:** Your LLM has been consistently slower for the last 9 requests - the process has fundamentally shifted.
>
> **WHY IT MATTERS:**
> - This isn't a temporary spike - something changed in your system
> - User experience is degraded across ALL interactions
> - Compound effect: slower responses = higher costs per query
> - May indicate model degradation or infrastructure issues
>
> **WHAT TO DO:**
> 1. Check recent deployments or config changes
> 2. Verify hardware performance (CPU/GPU throttling?)
> 3. Consider rolling back to previous model version

## 🔧 Configuration Options

### Backend Settings
```python
# Copilot configuration
COPILOT_SETTINGS = {
    "enabled": True,
    "ollama_url": "http://localhost:11434", 
    "model": "llama3.2:3b",  # Lightweight but capable
    "fallback_model": "llama3.2:1b",  # Ultra-fast backup
    "auto_explain": False,  # Generate explanations automatically
    "cache_explanations": True,
    "max_context_points": 20,  # Historical data to include
}
```

### Frontend Settings
```javascript
// Copilot UI configuration
const COPILOT_CONFIG = {
  autoOpen: false,  // Open automatically on violations
  animateTyping: true,  // Simulate typing effect
  maxResponseLength: 500,
  refreshInterval: 30000,  // Check for new explanations
};
```

## 📈 Success Metrics

1. **Adoption Rate**: % of violations that get AI explanations requested
2. **User Satisfaction**: Feedback on explanation helpfulness (1-5 scale)
3. **Resolution Time**: Average time from violation → resolution
4. **Model Performance**: Ollama response times and accuracy
5. **Business Value**: Documented cost savings from faster issue resolution

## 🎯 Future Enhancements

### Phase 5+: Advanced Features
- **Predictive Analysis**: "Based on trends, expect R1 violation in next 15 minutes"
- **Auto-Remediation**: AI suggests and implements fixes automatically
- **Learning Loop**: User feedback improves explanation quality
- **Multi-Model Support**: Switch between different explanation models
- **Voice Interface**: "Tell me about this violation" audio explanations

---

**This AI copilot transforms LLMscope from a monitoring tool into an intelligent assistant that not only detects problems but helps users understand and fix them quickly.**