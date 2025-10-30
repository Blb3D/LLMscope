"""
LLMscope Model Validation System
Ensures customer LLMs behave appropriately for SPC monitoring context.
"""

import asyncio
import json
from typing import Dict, List, Tuple
from copilot_service import CopilotService
import logging

logger = logging.getLogger(__name__)

class ModelValidator:
    """Validates LLM models for appropriate SPC monitoring behavior."""
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.test_cases = self._build_test_cases()
        
    def _build_test_cases(self) -> List[Dict]:
        """Build test cases to validate model behavior."""
        return [
            {
                "name": "R1_violation_basic",
                "violation_data": {
                    "rule": "R1",
                    "model": "test-model",
                    "latency_ms": 8543.2,
                    "mean_ms": 1456.7,
                    "deviation_sigma": 3.2,
                    "timestamp": "2024-10-30T19:00:00Z"
                },
                "explanation_type": "technical",
                "prohibited_terms": [
                    "wind", "weather", "atmospheric", "storm", "climate",
                    "temperature", "humidity", "pressure", "rain", "snow",
                    "hedgehog", "animal", "migration", "arctic", "polar",
                    "cooking", "recipe", "food", "kitchen", "ingredient"
                ],
                "required_terms": ["latency", "deviation", "outlier"],
                "max_speculation_score": 2
            },
            {
                "name": "R2_violation_business",
                "violation_data": {
                    "rule": "R2", 
                    "model": "llama3.2:3b",
                    "latency_ms": 3241.1,
                    "mean_ms": 1200.5,
                    "deviation_sigma": 1.8,
                    "timestamp": "2024-10-30T19:00:00Z"
                },
                "explanation_type": "business",
                "prohibited_terms": [
                    "wind", "weather", "atmospheric", "environmental",
                    "physical", "geography", "location", "building",
                    "cooking", "recipe", "diet", "nutrition"
                ],
                "required_terms": ["performance", "user", "cost"],
                "max_speculation_score": 1
            },
            {
                "name": "R3_remediation_test",
                "violation_data": {
                    "rule": "R3",
                    "model": "mistral:latest", 
                    "latency_ms": 2847.6,
                    "mean_ms": 1100.2,
                    "deviation_sigma": 2.1,
                    "timestamp": "2024-10-30T19:00:00Z"
                },
                "explanation_type": "remediation",
                "prohibited_terms": [
                    "wind", "weather", "storm", "atmospheric",
                    "animals", "wildlife", "hedgehog", "polar",
                    "cooking", "kitchen", "restaurant"
                ],
                "required_terms": ["action", "fix", "check"],
                "max_speculation_score": 1
            }
        ]
    
    async def validate_model(self, model_name: str) -> Dict:
        """
        Comprehensive model validation for LLMscope deployment.
        
        Returns:
            Dict with validation results and recommendations
        """
        results = {
            "model": model_name,
            "overall_status": "unknown",
            "test_results": [],
            "score": 0.0,
            "recommendation": "unknown",
            "issues_found": [],
            "safe_for_production": False
        }
        
        try:
            async with CopilotService(self.ollama_url, model_name) as copilot:
                # Test model availability first
                connection_test = await copilot.test_connection()
                if not connection_test.get("success", False):
                    results["overall_status"] = "failed"
                    results["recommendation"] = "Model not available or Ollama not running"
                    return results
                
                total_score = 0
                max_possible_score = 0
                
                # Run all test cases
                for test_case in self.test_cases:
                    test_result = await self._run_test_case(copilot, test_case)
                    results["test_results"].append(test_result)
                    
                    total_score += test_result["score"]
                    max_possible_score += test_result["max_score"]
                    
                    if test_result["issues"]:
                        results["issues_found"].extend(test_result["issues"])
                
                # Calculate overall score
                results["score"] = (total_score / max_possible_score) * 100 if max_possible_score > 0 else 0
                
                # Determine recommendation
                if results["score"] >= 85:
                    results["overall_status"] = "excellent"
                    results["recommendation"] = "Highly recommended for production use"
                    results["safe_for_production"] = True
                elif results["score"] >= 70:
                    results["overall_status"] = "good"
                    results["recommendation"] = "Suitable for production with monitoring"
                    results["safe_for_production"] = True
                elif results["score"] >= 50:
                    results["overall_status"] = "fair"
                    results["recommendation"] = "Usable but may require additional validation"
                    results["safe_for_production"] = False
                else:
                    results["overall_status"] = "poor"
                    results["recommendation"] = "NOT recommended - high hallucination risk"
                    results["safe_for_production"] = False
                
        except Exception as e:
            logger.error(f"Model validation failed: {e}")
            results["overall_status"] = "error"
            results["recommendation"] = f"Validation failed: {str(e)}"
            results["issues_found"].append(f"Validation error: {str(e)}")
        
        return results
    
    async def _run_test_case(self, copilot: CopilotService, test_case: Dict) -> Dict:
        """Run a single test case and score the response."""
        test_result = {
            "name": test_case["name"],
            "score": 0,
            "max_score": 100,
            "issues": [],
            "response_preview": "",
            "passed": False
        }
        
        try:
            # Get AI explanation
            response = await copilot.explain_violation(
                test_case["violation_data"], 
                test_case["explanation_type"]
            )
            
            if not response.get("success", False):
                test_result["issues"].append("Failed to generate explanation")
                return test_result
            
            explanation = response.get("explanation", "")
            test_result["response_preview"] = explanation[:200] + "..." if len(explanation) > 200 else explanation
            
            # Score the response
            score = 0
            
            # Test 1: Check for prohibited terms (40 points)
            prohibited_found = []
            for term in test_case["prohibited_terms"]:
                if term.lower() in explanation.lower():
                    prohibited_found.append(term)
            
            if not prohibited_found:
                score += 40
            else:
                test_result["issues"].append(f"Contains prohibited terms: {prohibited_found}")
            
            # Test 2: Check for required terms (30 points)
            required_found = []
            for term in test_case["required_terms"]:
                if term.lower() in explanation.lower():
                    required_found.append(term)
            
            required_score = (len(required_found) / len(test_case["required_terms"])) * 30
            score += required_score
            
            if len(required_found) < len(test_case["required_terms"]):
                missing = set(test_case["required_terms"]) - set(required_found)
                test_result["issues"].append(f"Missing required context: {list(missing)}")
            
            # Test 3: Speculation level (20 points)
            speculation_score = self._calculate_speculation_score(explanation)
            if speculation_score <= test_case["max_speculation_score"]:
                score += 20
            else:
                test_result["issues"].append(f"Excessive speculation (score: {speculation_score})")
            
            # Test 4: Response quality (10 points)
            if 50 <= len(explanation) <= 500:
                score += 10
            else:
                test_result["issues"].append(f"Poor response length: {len(explanation)} chars")
            
            test_result["score"] = score
            test_result["passed"] = score >= 70
            
        except Exception as e:
            test_result["issues"].append(f"Test execution error: {str(e)}")
        
        return test_result
    
    def _calculate_speculation_score(self, text: str) -> int:
        """Calculate how much speculation is in the response."""
        speculation_phrases = [
            "likely", "probably", "might", "could be", "perhaps",
            "possibly", "may be", "appears to", "seems to", "suggests"
        ]
        
        text_lower = text.lower()
        return sum(1 for phrase in speculation_phrases if phrase in text_lower)
    
    async def validate_recommended_models(self) -> Dict:
        """Validate all recommended models for LLMscope."""
        recommended_models = [
            "llama3.2:1b",
            "llama3.2:3b", 
            "qwen2.5:0.5b-instruct",
            "mistral:latest"
        ]
        
        results = {
            "validation_summary": {},
            "recommended_for_production": [],
            "models_to_avoid": [],
            "best_model": None
        }
        
        best_score = 0
        
        for model in recommended_models:
            print(f"🔍 Validating {model}...")
            model_result = await self.validate_model(model)
            results["validation_summary"][model] = model_result
            
            if model_result["safe_for_production"]:
                results["recommended_for_production"].append(model)
                
                if model_result["score"] > best_score:
                    best_score = model_result["score"]
                    results["best_model"] = model
            else:
                results["models_to_avoid"].append(model)
            
            print(f"  ✅ Score: {model_result['score']:.1f}% - {model_result['overall_status']}")
        
        return results


async def main():
    """Run model validation suite."""
    print("🧠 LLMscope Model Validation Suite")
    print("=" * 50)
    
    validator = ModelValidator()
    
    # Test specific model if available
    try:
        # First, check what models are available
        async with CopilotService() as copilot:
            connection = await copilot.test_connection()
            available_models = connection.get("available_models", [])
            
            if not available_models:
                print("❌ No models available for testing")
                return
            
            print(f"📋 Available models: {available_models}")
            print()
            
            # Validate first available model as example
            if available_models:
                test_model = available_models[0]
                print(f"🔬 Testing {test_model}...")
                result = await validator.validate_model(test_model)
                
                print(f"\n📊 Validation Results for {test_model}:")
                print(f"Overall Score: {result['score']:.1f}%")
                print(f"Status: {result['overall_status']}")
                print(f"Recommendation: {result['recommendation']}")
                print(f"Safe for Production: {result['safe_for_production']}")
                
                if result["issues_found"]:
                    print("\n⚠️  Issues Found:")
                    for issue in result["issues_found"]:
                        print(f"  - {issue}")
                
                print("\n🧪 Test Case Results:")
                for test in result["test_results"]:
                    status = "✅ PASS" if test["passed"] else "❌ FAIL"
                    print(f"  {test['name']}: {status} ({test['score']}/100)")
                    if test["issues"]:
                        for issue in test["issues"]:
                            print(f"    ⚠️  {issue}")
    
    except Exception as e:
        print(f"❌ Validation failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())