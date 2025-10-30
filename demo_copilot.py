#!/usr/bin/env python3
"""
LLMscope AI Copilot - Demo Script

This script demonstrates the AI copilot functionality by:
1. Testing Ollama connection
2. Creating a sample violation
3. Generating AI explanations
4. Showing example prompts and responses

Usage:
    python demo_copilot.py

Requirements:
    - Ollama running on localhost:11434
    - llama3.2:3b model available
    - aiohttp installed: pip install aiohttp
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from copilot_service import CopilotService
except ImportError:
    print("❌ Error: Cannot import copilot_service. Make sure you're in the LLMscope directory.")
    print("💡 Try: cd LLMscope && python demo_copilot.py")
    sys.exit(1)

async def demo_copilot():
    """Demonstrate AI copilot functionality."""
    
    print("🤖 LLMscope AI Copilot Demo")
    print("=" * 50)
    
    # Sample violation data (R1 - extreme latency spike)
    sample_violations = [
        {
            "id": 1,
            "rule": "R1",
            "model": "llama3.2:3b",
            "latency_ms": 8234.7,
            "mean_ms": 1456.2,
            "deviation_sigma": 4.2,
            "timestamp": "2024-10-30T15:30:22Z",
            "provider": "ollama"
        },
        {
            "id": 2,
            "rule": "R2", 
            "model": "qwen2.5:0.5b",
            "latency_ms": 2834.1,
            "mean_ms": 1234.5,
            "deviation_sigma": 1.8,
            "timestamp": "2024-10-30T15:25:15Z",
            "provider": "ollama"
        },
        {
            "id": 3,
            "rule": "R3",
            "model": "gemma2:9b",
            "latency_ms": 3456.8,
            "mean_ms": 2100.3,
            "deviation_sigma": 2.1,
            "timestamp": "2024-10-30T15:20:10Z", 
            "provider": "ollama"
        }
    ]
    
    async with CopilotService("http://localhost:11434", "gemma3:1b") as copilot:
        
        # Test 1: Connection Test
        print("\n🔍 Testing Ollama Connection...")
        connection_test = await copilot.test_connection()
        
        if connection_test["success"]:
            print("✅ Ollama is running and accessible")
            print(f"📦 Available models: {', '.join(connection_test.get('available_models', [])[:3])}...")
            
            if connection_test["model_available"]:
                print(f"🎯 Target model '{copilot.model}' is available")
            else:
                print(f"⚠️  Target model '{copilot.model}' not found")
                if connection_test.get("recommended_models"):
                    print(f"💡 Recommended: {', '.join(connection_test['recommended_models'][:2])}")
        else:
            print("❌ Ollama connection failed:")
            print(f"   Error: {connection_test.get('error', 'Unknown error')}")
            print(f"   Suggestion: {connection_test.get('suggestion', 'Check Ollama installation')}")
            return
        
        print("\n" + "=" * 50)
        
        # Test 2: Generate Explanations
        for i, violation in enumerate(sample_violations, 1):
            print(f"\n🚨 Violation {i}: {violation['rule']} - {violation['model']}")
            print(f"   Latency: {violation['latency_ms']:.1f}ms (normal: {violation['mean_ms']:.1f}ms)")
            print(f"   Severity: {violation['deviation_sigma']:.1f}σ deviation")
            
            # Generate all three types of explanations
            explanation_types = [
                ("technical", "🔬"),
                ("business", "💼"), 
                ("remediation", "🔧")
            ]
            
            for exp_type, icon in explanation_types:
                print(f"\n{icon} {exp_type.title()} Explanation:")
                print("-" * 30)
                
                result = await copilot.explain_violation(violation, exp_type)
                
                if result["success"]:
                    print(result["explanation"])
                    print(f"\n📊 Confidence: {result['confidence_score']:.1f} | Time: {result['generation_time_ms']}ms")
                else:
                    print(f"❌ Failed: {result.get('error', 'Unknown error')}")
                
                # Add spacing between explanations
                if exp_type != "remediation":
                    print()
            
            # Add spacing between violations
            if i < len(sample_violations):
                print("\n" + "=" * 50)

def check_requirements():
    """Check if all requirements are met."""
    print("🔍 Checking requirements...")
    
    # Check Python packages
    try:
        import aiohttp
        print("✅ aiohttp is installed")
    except ImportError:
        print("❌ aiohttp not found. Install with: pip install aiohttp")
        return False
    
    # Check if in correct directory
    if not os.path.exists("backend/copilot_service.py"):
        print("❌ Not in LLMscope directory or copilot_service.py missing")
        print("💡 Run this script from the LLMscope root directory")
        return False
    
    print("✅ All requirements met")
    return True

def show_installation_guide():
    """Show installation and setup guide."""
    print("\n📖 LLMscope AI Copilot Setup Guide")
    print("=" * 40)
    print()
    print("1. Install Ollama:")
    print("   curl -fsSL https://ollama.ai/install.sh | sh")
    print()
    print("2. Pull recommended model:")
    print("   ollama pull llama3.2:3b")
    print() 
    print("3. Alternative lightweight model:")
    print("   ollama pull llama3.2:1b")
    print()
    print("4. Install Python dependencies:")
    print("   pip install aiohttp")
    print()
    print("5. Test the copilot:")
    print("   python demo_copilot.py")
    print()
    print("🎯 Model Recommendations:")
    print("   • llama3.2:3b - Best balance of speed/quality")
    print("   • llama3.2:1b - Fastest, good for basic explanations")
    print("   • qwen2.5:7b - Higher quality, slower")
    print()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--setup":
        show_installation_guide()
    elif not check_requirements():
        print("\n💡 Run with --setup flag for installation guide:")
        print("   python demo_copilot.py --setup")
    else:
        try:
            asyncio.run(demo_copilot())
        except KeyboardInterrupt:
            print("\n\n👋 Demo interrupted by user")
        except Exception as e:
            print(f"\n❌ Demo failed: {e}")
            print("\n💡 Try running the setup guide:")
            print("   python demo_copilot.py --setup")