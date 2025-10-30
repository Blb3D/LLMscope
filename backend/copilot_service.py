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
            
            # Generate explanation via Ollama
            start_time = datetime.now()
            
            payload = {
                "model": self.model,
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
            
            async with self.session.post(f"{self.ollama_url}/api/generate", json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    generation_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    explanation = result.get("response", "").strip()
                    
                    return {
                        "success": True,
                        "explanation": explanation,
                        "model_used": self.model,
                        "generation_time_ms": int(generation_time),
                        "confidence_score": self._calculate_confidence(explanation),
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
        return f"""You are an expert SPC (Statistical Process Control) analyst for LLM monitoring.

VIOLATION DETECTED:
- Rule: {rule} ({rule_desc})
- Model: {model_name}
- Latency: {latency_ms:.2f}ms 
- Normal average: {mean_ms:.2f}ms
- Deviation: {deviation:.2f} standard deviations

Explain this violation in clear, technical terms:

1. WHAT HAPPENED: Describe the specific statistical pattern detected
2. ROOT CAUSE: Most likely technical reasons for this pattern
3. SEVERITY: How concerning is this deviation

Keep response under 250 words. Use precise technical language but avoid jargon."""

    def _build_business_prompt(self, rule, latency_ms, mean_ms, deviation, model_name, rule_desc) -> str:
        """Build business impact explanation prompt."""
        return f"""You are a business analyst explaining LLM performance issues to stakeholders.

PERFORMANCE ISSUE:
- Problem: {rule_desc}
- Model: {model_name}
- Response time: {latency_ms:.2f}ms (normally {mean_ms:.2f}ms)
- Severity: {deviation:.1f}x worse than normal

Explain the business impact:

1. USER IMPACT: How this affects customer experience
2. COST IMPACT: Financial implications (slower = more expensive)
3. URGENCY: How quickly this needs attention

Use non-technical language. Focus on business metrics, user satisfaction, and costs. Under 200 words."""

    def _build_remediation_prompt(self, rule, latency_ms, mean_ms, deviation, model_name, rule_desc) -> str:
        """Build remediation suggestion prompt."""
        return f"""You are a DevOps engineer providing actionable solutions for LLM performance issues.

ISSUE TO FIX:
- Problem: {rule_desc}
- Model: {model_name}
- Current performance: {latency_ms:.2f}ms (target: {mean_ms:.2f}ms)

Provide specific remediation steps:

1. IMMEDIATE ACTIONS: What to do right now (next 5 minutes)
2. SHORT-TERM FIXES: Actions for next hour
3. PREVENTION: How to avoid this in future

Be specific and actionable. Include commands, settings, or configurations where helpful. Under 250 words."""

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