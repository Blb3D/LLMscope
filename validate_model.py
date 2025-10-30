#!/usr/bin/env python3
"""
LLMscope Model Validation CLI
Quick validation tool for ensuring your LLM won't talk about hedgehogs.
"""

import asyncio
import json
import sys
import os

# Add backend directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def main():
    """Run the validation CLI."""
    print("🧠 LLMscope Model Validation Tool")
    print("Ensuring your AI stays focused on LLM monitoring (no hedgehogs allowed!)")
    print("=" * 70)
    
    try:
        from backend.model_validator import ModelValidator
        
        # Get Ollama URL from user or use default
        ollama_url = input("Ollama URL (default: http://localhost:11434): ").strip()
        if not ollama_url:
            ollama_url = "http://localhost:11434"
        
        validator = ModelValidator(ollama_url)
        
        print(f"\n🔍 Connecting to Ollama at {ollama_url}...")
        
        # Check what models are available
        from backend.copilot_service import CopilotService
        async with CopilotService(ollama_url) as copilot:
            connection = await copilot.test_connection()
            
            if not connection.get("success", False):
                print("❌ Cannot connect to Ollama!")
                print("Make sure Ollama is running and accessible.")
                return
            
            available_models = connection.get("available_models", [])
            if not available_models:
                print("❌ No models found!")
                print("Please install a model first: ollama pull llama3.2:1b")
                return
            
            print(f"✅ Found {len(available_models)} models: {', '.join(available_models)}")
            
            # Let user choose model to validate
            print(f"\nAvailable models:")
            for i, model in enumerate(available_models, 1):
                print(f"  {i}. {model}")
            
            choice = input(f"\nSelect model to validate (1-{len(available_models)}) or 'all': ").strip()
            
            if choice.lower() == 'all':
                print(f"\n🔬 Validating all available models...")
                for model in available_models:
                    await validate_single_model(validator, model)
            else:
                try:
                    model_index = int(choice) - 1
                    if 0 <= model_index < len(available_models):
                        model = available_models[model_index]
                        print(f"\n🔬 Validating {model}...")
                        await validate_single_model(validator, model)
                    else:
                        print("❌ Invalid selection!")
                        return
                except ValueError:
                    print("❌ Invalid input!")
                    return
    
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running from the LLMscope directory.")
    except Exception as e:
        print(f"❌ Validation failed: {e}")

async def validate_single_model(validator, model):
    """Validate a single model and display results."""
    result = await validator.validate_model(model)
    
    # Display results
    print(f"\n📊 Validation Results for {model}:")
    print(f"  Overall Score: {result['score']:.1f}%")
    print(f"  Status: {result['overall_status'].upper()}")
    print(f"  Safe for Production: {'✅ YES' if result['safe_for_production'] else '❌ NO'}")
    print(f"  Recommendation: {result['recommendation']}")
    
    # Show issues if any
    if result["issues_found"]:
        print(f"\n⚠️  Issues Found:")
        for issue in result["issues_found"]:
            print(f"    • {issue}")
    
    # Show test results
    print(f"\n🧪 Test Results:")
    for test in result["test_results"]:
        status = "✅ PASS" if test["passed"] else "❌ FAIL"
        print(f"    {test['name']}: {status} ({test['score']}/100)")
        
        if test["issues"]:
            for issue in test["issues"]:
                print(f"      ⚠️  {issue}")
    
    # Final recommendation
    if result["safe_for_production"]:
        print(f"\n🎉 {model} is ready for production use!")
    else:
        print(f"\n⚠️  {model} needs attention before production deployment.")
        if result["score"] < 50:
            print("    Consider using a different model or additional validation.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("LLMscope Model Validation Tool")
        print("Usage: python validate_model.py")
        print("\nThis tool validates that your LLM behaves appropriately for SPC monitoring.")
        print("It ensures the AI won't hallucinate about weather, animals, or other")
        print("irrelevant factors when explaining performance issues.")
        sys.exit(0)
    
    asyncio.run(main())