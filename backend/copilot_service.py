"""
LLMscope AI Copilot Service - MVP Implementation

This service provides AI-powered explanations for SPC violations using local Ollama LLMs.
Designed to be lightweight, fast, and privacy-focused.
"""

import aiohttp
import json
import sqlite3
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class CopilotService:
    """AI-powered SPC violation explanation service."""
    
    def __init__(self, ollama_url: str = "http://localhost:11434", model: str = "llama3.2:3b"):
        self.ollama_url = ollama_url.rstrip('/')
        self.model = model
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def explain_violation(self, violation_data: Dict, explanation_type: str = "technical") -> Dict:
        """
        Generate AI explanation for SPC violation.
        
        Args:
            violation_data: Violation record from database
            explanation_type: 'technical', 'business', or 'remediation'
            
        Returns:
            Dict with explanation, confidence, timing, etc.
        """
        try:
            # Build context-aware prompt
            prompt = self._build_prompt(violation_data, explanation_type)
            
            # Try to use the configured model first, with smart fallback
            # For testing: Force use of available model
            available_models = ["llama3.2:1b", "llama2:latest", "mistral:latest", "llama3:latest"]
            model_to_use = "llama3.2:1b"  # Force use available model for testing
            logger.info(f"TESTING: forcing use of {model_to_use} instead of {self.model}")
            
            # Generate explanation via Ollama
            start_time = datetime.now()
            
            payload = {
                "model": model_to_use,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,  # Lower for consistent explanations
                    "num_predict": 400,  # Reasonable length limit
                    "top_p": 0.9,
                    "stop": ["Human:", "\n\n---"]  # Stop sequences
                }
            }
            
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # First attempt with selected model
            async with self.session.post(f"{self.ollama_url}/api/generate", json=payload) as response:
                if response.status == 404 and model_to_use != "llama3.2:1b":
                    # If model still not found, try llama3.2:1b as last resort
                    logger.warning(f"Model {model_to_use} failed, trying llama3.2:1b as final fallback")
                    payload["model"] = "llama3.2:1b"
                    model_to_use = "llama3.2:1b"
                    
                    async with self.session.post(f"{self.ollama_url}/api/generate", json=payload) as response2:
                        if response2.status == 200:
                            result = await response2.json()
                            generation_time = (datetime.now() - start_time).total_seconds() * 1000
                            explanation = result.get("response", "").strip()
                            
                            # Validate response for inappropriate content
                            validated_explanation = self._validate_response(explanation)
                            
                            return {
                                "success": True,
                                "explanation": validated_explanation,
                                "model_used": model_to_use,
                                "configured_model": self.model,
                                "model_fallback_used": model_to_use != self.model,
                                "generation_time_ms": int(generation_time),
                                "confidence_score": self._calculate_confidence(validated_explanation),
                                "explanation_type": explanation_type,
                                "prompt_used": prompt[:200] + "..." if len(prompt) > 200 else prompt
                            }
                        else:
                            error_text = await response2.text()
                            logger.error(f"Final fallback failed {response2.status}: {error_text}")
                            return {
                                "success": False, 
                                "error": f"All models failed: {response2.status}",
                                "details": error_text
                            }
                
                elif response.status == 200:
                    result = await response.json()
                    generation_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    explanation = result.get("response", "").strip()
                    
                    # Validate response for inappropriate content
                    validated_explanation = self._validate_response(explanation)
                    
                    return {
                        "success": True,
                        "explanation": validated_explanation,
                        "model_used": model_to_use,
                        "configured_model": self.model,
                        "model_fallback_used": model_to_use != self.model,
                        "generation_time_ms": int(generation_time),
                        "confidence_score": self._calculate_confidence(validated_explanation),
                        "explanation_type": explanation_type,
                        "prompt_used": prompt[:200] + "..." if len(prompt) > 200 else prompt
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"Ollama API error {response.status}: {error_text}")
                    return {
                        "success": False, 
                        "error": f"Ollama API error: {response.status}",
                        "details": error_text
                    }
                    
        except aiohttp.ClientError as e:
            logger.error(f"Ollama connection error: {e}")
            return {
                "success": False,
                "error": "Cannot connect to Ollama. Is it running?",
                "details": str(e)
            }
        except Exception as e:
            logger.error(f"Copilot explanation error: {e}")
            return {
                "success": False,
                "error": "Unexpected error generating explanation",
                "details": str(e)
            }
    
    async def _get_best_available_model(self) -> str:
        """
        Smart model selection: Use configured model if available, 
        otherwise fallback to best available compatible model.
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Get list of installed models
            async with self.session.get(f"{self.ollama_url}/api/tags") as response:
                if response.status == 200:
                    result = await response.json()
                    installed_models = [model["name"] for model in result.get("models", [])]
                    logger.info(f"Available models: {installed_models}")
                    
                    # First choice: Use configured model if available
                    if self.model in installed_models:
                        logger.info(f"Using configured model: {self.model}")
                        return self.model
                    
                    # Fallback hierarchy for llama3.2 models
                    preferred_fallbacks = [
                        "llama3.2:3b",     # Best quality
                        "llama3.2:1b",     # Good quality, smaller
                        "llama3.2",        # Generic latest
                        "llama3.2:latest"  # Latest version
                    ]
                    
                    # Try preferred fallbacks first
                    for fallback in preferred_fallbacks:
                        if fallback in installed_models:
                            logger.warning(f"Model {self.model} not found, using fallback: {fallback}")
                            return fallback
                    
                    # Last resort: Use any llama model
                    llama_models = [m for m in installed_models if "llama" in m.lower()]
                    if llama_models:
                        fallback = llama_models[0]
                        logger.warning(f"No llama3.2 found, using: {fallback}")
                        return fallback
                    
                    # Absolute last resort: Use any available model
                    if installed_models:
                        fallback = installed_models[0]
                        logger.warning(f"No llama models found, using: {fallback}")
                        return fallback
                    
                    # No models at all
                    logger.error("No models installed in Ollama")
                    return self.model  # Return configured model (will fail but with clear error)
                else:
                    logger.error(f"Failed to get model list: HTTP {response.status}")
                    
        except Exception as e:
            logger.error(f"Error checking available models: {e}")
            
        # Fallback to configured model if detection fails
        logger.info(f"Falling back to configured model: {self.model}")
        return self.model
    
    def _build_prompt(self, violation_data: Dict, explanation_type: str) -> str:
        """Build context-aware prompt for AI explanation."""
        
        # Extract key violation metrics
        rule = violation_data.get("rule", "Unknown")
        latency_ms = violation_data.get("latency_ms", 0)
        mean_ms = violation_data.get("mean_ms", 0)
        deviation = violation_data.get("deviation_sigma", 0)
        model_name = violation_data.get("model", "Unknown")
        timestamp = violation_data.get("timestamp", "Unknown")
        
        # Get rule description
        rule_desc = self._get_rule_description(rule)
        
        # Build explanation type specific prompt
        if explanation_type == "business":
            return self._build_business_prompt(rule, latency_ms, mean_ms, deviation, model_name, rule_desc)
        elif explanation_type == "remediation":
            return self._build_remediation_prompt(rule, latency_ms, mean_ms, deviation, model_name, rule_desc)
        else:  # technical
            return self._build_technical_prompt(rule, latency_ms, mean_ms, deviation, model_name, rule_desc)
    
    def _build_technical_prompt(self, rule, latency_ms, mean_ms, deviation, model_name, rule_desc) -> str:
        """Build technical explanation prompt."""
        return f"""You are an expert SPC (Statistical Process Control) analyst for LLM monitoring systems.

CONTEXT: You ONLY analyze software performance metrics. DO NOT speculate about physical environmental factors like weather, wind, or atmospheric conditions.

VIOLATION DETECTED:
- Rule: {rule} ({rule_desc})
- Model: {model_name}
- Latency: {latency_ms:.2f}ms 
- Normal average: {mean_ms:.2f}ms
- Deviation: {deviation:.2f} standard deviations

Explain this violation focusing ONLY on software/system factors:

1. WHAT HAPPENED: Describe the specific statistical pattern detected
2. ROOT CAUSE: Technical reasons (server load, model performance, network latency, resource constraints)
3. SEVERITY: How concerning is this deviation for LLM service reliability

CONSTRAINTS:
- Focus only on software, hardware, or network factors
- Do not mention weather, atmospheric conditions, or physical environment
- Base analysis only on the statistical pattern and LLM performance context
- If cause is unknown, say "requires investigation" rather than speculating

Keep response under 250 words. Use precise technical language."""

    def _build_business_prompt(self, rule, latency_ms, mean_ms, deviation, model_name, rule_desc) -> str:
        """Build business impact explanation prompt."""
        return f"""You are a business analyst explaining LLM service performance issues to stakeholders.

CONTEXT: You analyze software service performance only. Focus on business metrics, not environmental factors.

PERFORMANCE ISSUE:
- Problem: {rule_desc}
- Model: {model_name}
- Response time: {latency_ms:.2f}ms (normally {mean_ms:.2f}ms)
- Severity: {deviation:.1f}x worse than normal

Explain the business impact:

1. USER IMPACT: How slower LLM responses affect customer experience
2. COST IMPACT: Financial implications (increased compute costs, user churn)
3. URGENCY: Business priority for addressing this service degradation

CONSTRAINTS:
- Focus only on software service performance and business metrics
- Do not speculate about physical environmental causes
- Base analysis on LLM service reliability and user experience

Use non-technical language. Under 200 words."""

    def _build_remediation_prompt(self, rule, latency_ms, mean_ms, deviation, model_name, rule_desc) -> str:
        """Build remediation suggestion prompt."""
        return f"""You are a DevOps engineer providing actionable solutions for LLM service performance issues.

CONTEXT: Focus on software/infrastructure solutions only. Do not consider environmental factors.

ISSUE TO FIX:
- Problem: {rule_desc}
- Model: {model_name}
- Current performance: {latency_ms:.2f}ms (target: {mean_ms:.2f}ms)

Provide specific remediation steps:

1. IMMEDIATE ACTIONS: Service-level checks (restart services, check resources, verify model load)
2. SHORT-TERM FIXES: Infrastructure adjustments (scaling, optimization, configuration)
3. PREVENTION: Monitoring and alerting improvements to catch similar issues

CONSTRAINTS:
- Focus only on software, infrastructure, and configuration solutions
- Provide actionable technical steps for LLM service management
- Do not suggest environmental monitoring or physical factors

Be specific and actionable. Include relevant commands or configurations. Under 250 words."""

    def _get_rule_description(self, rule: str) -> str:
        """Get human-readable description of Nelson Rule."""
        descriptions = {
            "R1": "Single point beyond 3σ control limits - extreme outlier",
            "R2": "9 consecutive points on same side of mean - sustained process shift", 
            "R3": "6 consecutive points in increasing/decreasing trend - gradual drift",
            "R4": "14 consecutive points alternating up/down - systematic variation",
            "R5": "2 out of 3 consecutive points beyond 2σ - moderate outliers",
            "R6": "4 out of 5 consecutive points beyond 1σ - small systematic shift",
            "R7": "15 consecutive points within 1σ - reduced variation (concerning)",
            "R8": "8 consecutive points beyond 1σ - large systematic shift"
        }
        return descriptions.get(rule, f"Unknown rule {rule}")
    
    def _calculate_confidence(self, response: str) -> float:
        """Calculate confidence score based on response quality."""
        if not response or len(response) < 30:
            return 0.2
        
        # Look for structured response
        structure_indicators = ["1.", "2.", "3.", "WHAT", "WHY", "HOW", "IMPACT", "ACTION"]
        structure_score = sum(1 for indicator in structure_indicators if indicator in response) / len(structure_indicators)
        
        # Look for technical terms
        technical_terms = ["latency", "performance", "deviation", "outlier", "process", "standard", "violation"]
        technical_score = sum(1 for term in technical_terms if term.lower() in response.lower()) / len(technical_terms)
        
        # Length factor (too short or too long reduces confidence)
        length_score = 1.0
        if len(response) < 100:
            length_score = 0.5
        elif len(response) > 800:
            length_score = 0.7
        
        # Combined confidence
        confidence = (structure_score * 0.4 + technical_score * 0.4 + length_score * 0.2)
        return min(0.95, max(0.1, confidence))  # Clamp between 0.1 and 0.95

    def _validate_response(self, response: str) -> str:
        """Validate and filter AI response to prevent inappropriate content."""
        if not response:
            return "No explanation generated."
        
        # Prohibited terms that indicate environmental/physical speculation
        prohibited_terms = [
            "wind", "weather", "atmospheric", "temperature", "humidity", 
            "storm", "pressure", "climate", "rain", "snow", "sun",
            "mistral wind", "atmospheric conditions", "environmental factors",
            "physical environment", "outdoor conditions"
        ]
        
        response_lower = response.lower()
        
        # Check for prohibited content
        for term in prohibited_terms:
            if term in response_lower:
                logger.warning(f"AI response contained inappropriate speculation about '{term}'. Response filtered.")
                return self._get_fallback_explanation()
        
        # Check for excessive speculation keywords
        speculation_keywords = ["likely due to", "probably", "might be caused by", "could be from"]
        speculation_count = sum(1 for keyword in speculation_keywords if keyword in response_lower)
        
        if speculation_count > 2:
            logger.warning("AI response contained excessive speculation. Response filtered.")
            return self._get_fallback_explanation()
        
        return response
    
    def _get_fallback_explanation(self) -> str:
        """Provide a safe, factual fallback explanation."""
        return """**Violation Detected**: A statistical process control rule has been triggered indicating a deviation from normal performance patterns.

**What This Means**: The monitoring system has detected a pattern in the data that warrants investigation.

**Recommended Action**: 
1. Review system logs and performance metrics
2. Check for recent changes to infrastructure or configuration
3. Monitor for additional violations to determine if this is an isolated incident

**Note**: This explanation is generated automatically. For detailed analysis, review the raw metrics and consult your monitoring documentation."""

    async def test_connection(self) -> Dict:
        """Test connection to Ollama and verify model availability."""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Test basic connectivity
            async with self.session.get(f"{self.ollama_url}/api/tags") as response:
                if response.status == 200:
                    result = await response.json()
                    models = [model["name"] for model in result.get("models", [])]
                    
                    return {
                        "success": True,
                        "ollama_available": True,
                        "model_available": self.model in models,
                        "available_models": models,
                        "recommended_models": [m for m in models if "llama3.2" in m or "qwen" in m]
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Ollama API returned {response.status}"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "ollama_available": False,
                "error": str(e),
                "suggestion": "Install Ollama and run: ollama pull llama3.2:3b"
            }

    async def check_model_updates(self) -> Dict:
        """Check if newer model versions are available."""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Get currently installed models
            async with self.session.get(f"{self.ollama_url}/api/tags") as response:
                if response.status == 200:
                    result = await response.json()
                    installed_models = [model["name"] for model in result.get("models", [])]
                    
                    # Check for llama3.2 versions
                    llama_models = [m for m in installed_models if "llama3.2" in m]
                    
                    # Define latest versions (this could be made dynamic by checking Ollama registry)
                    latest_versions = {
                        "llama3.2:1b": "llama3.2:1b",  # Current latest
                        "llama3.2:3b": "llama3.2:3b",  # Current latest  
                        "llama3.2": "llama3.2:latest"  # General latest
                    }
                    
                    recommendations = []
                    
                    # Check if user has any llama3.2 models
                    if not llama_models:
                        recommendations.append({
                            "type": "new_install",
                            "message": "No Llama 3.2 models found. Install recommended model: llama3.2:3b",
                            "command": "ollama pull llama3.2:3b",
                            "url": "https://ollama.com/library/llama3.2"
                        })
                    else:
                        # Check for potential upgrades
                        if "llama3.2:1b" in llama_models and "llama3.2:3b" not in llama_models:
                            recommendations.append({
                                "type": "upgrade_suggestion",
                                "message": "Consider upgrading to llama3.2:3b for better analysis quality",
                                "command": "ollama pull llama3.2:3b",
                                "url": "https://ollama.com/library/llama3.2"
                            })
                    
                    return {
                        "success": True,
                        "installed_llama_models": llama_models,
                        "recommendations": recommendations,
                        "current_model": self.model,
                        "model_browser_url": "https://ollama.com/library/llama3.2"
                    }
                else:
                    return {"success": False, "error": "Cannot check Ollama models"}
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Model update check failed: {str(e)}"
            }


# Example usage and testing
async def test_copilot():
    """Test function to verify copilot functionality."""
    
    # Sample violation data
    sample_violation = {
        "rule": "R1",
        "model": "llama3.2:3b",
        "latency_ms": 5234.7,
        "mean_ms": 1456.2,
        "deviation_sigma": 3.2,
        "timestamp": "2024-10-30T15:30:22Z"
    }
    
    async with CopilotService() as copilot:
        # Test connection
        connection_test = await copilot.test_connection()
        print("Connection Test:", json.dumps(connection_test, indent=2))
        
        if connection_test["success"]:
            # Test technical explanation
            technical = await copilot.explain_violation(sample_violation, "technical")
            print("\nTechnical Explanation:", json.dumps(technical, indent=2))
            
            # Test business explanation
            business = await copilot.explain_violation(sample_violation, "business")
            print("\nBusiness Explanation:", json.dumps(business, indent=2))


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_copilot())