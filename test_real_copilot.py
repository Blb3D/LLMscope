#!/usr/bin/env python3
"""
Test AI Copilot with Real LLMscope Violations

This script fetches actual violations from your running LLMscope instance
and generates AI explanations for them.
"""

import asyncio
import json
import sys
import os
import requests
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from copilot_service import CopilotService
except ImportError:
    print("❌ Error: Cannot import copilot_service")
    sys.exit(1)

async def test_real_violations():
    """Test copilot with real violations from LLMscope API."""
    
    print("🔍 LLMscope AI Copilot - Real Violations Test")
    print("=" * 55)
    
    # Fetch real violations from your API
    try:
        print("\n📡 Fetching real violations from LLMscope...")
        response = requests.get(
            "http://localhost:8000/api/violations?limit=3",
            headers={"Authorization": "Bearer dev-123"},
            timeout=10
        )
        
        if response.status_code == 200:
            violations = response.json()
            print(f"✅ Found {len(violations)} recent violations")
        else:
            print(f"❌ API Error: {response.status_code}")
            return
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to LLMscope API: {e}")
        print("💡 Make sure LLMscope is running on localhost:8000")
        return
    
    if not violations:
        print("ℹ️  No violations found. Try running: python inject_periodic_violations.py")
        return
    
    # Test AI explanations with real data
    async with CopilotService("http://localhost:11434", "gemma3:1b") as copilot:
        
        # Test connection first
        print("\n🤖 Testing Ollama connection...")
        connection_test = await copilot.test_connection()
        
        if not connection_test["success"]:
            print(f"❌ Ollama connection failed: {connection_test.get('error')}")
            return
        
        print("✅ Ollama ready")
        print("\n" + "=" * 55)
        
        # Process each real violation
        for i, violation in enumerate(violations[:2], 1):  # Test first 2 violations
            print(f"\n🚨 REAL VIOLATION #{i}")
            print(f"   ID: {violation['id']}")
            print(f"   Rule: {violation['rule']} - {violation['model']}")
            print(f"   Latency: {violation['latency_ms']:.1f}ms (mean: {violation['mean_ms']:.1f}ms)")
            print(f"   Deviation: {violation['deviation_sigma']:.2f}σ")
            print(f"   Time: {violation['timestamp']}")
            
            # Convert API response to format copilot expects
            violation_data = {
                "id": violation["id"],
                "rule": violation["rule"],
                "model": violation["model"],
                "latency_ms": violation["latency_ms"],
                "mean_ms": violation["mean_ms"],
                "deviation_sigma": violation["deviation_sigma"],
                "timestamp": violation["timestamp"],
                "provider": violation["provider"]
            }
            
            # Test all three explanation types
            for exp_type, icon in [("business", "💼"), ("remediation", "🔧")]:
                print(f"\n{icon} {exp_type.title()} Analysis:")
                print("-" * 40)
                
                result = await copilot.explain_violation(violation_data, exp_type)
                
                if result["success"]:
                    # Format explanation nicely
                    explanation = result["explanation"].strip()
                    print(explanation)
                    
                    print(f"\n📊 Model: {result['model_used']} | "
                          f"Confidence: {result['confidence_score']:.1f} | "
                          f"Time: {result['generation_time_ms']}ms")
                else:
                    print(f"❌ Failed: {result.get('error', 'Unknown error')}")
                
                print()  # Spacing
            
            if i < len(violations):
                print("=" * 55)
        
        print(f"\n✅ Tested {min(2, len(violations))} real violations successfully!")
        print("\n💡 Next steps:")
        print("   • Test with llama3:latest for higher quality")
        print("   • Integrate into frontend UI")
        print("   • Set up violation auto-analysis")

def show_violation_summary():
    """Show summary of current violations."""
    try:
        response = requests.get(
            "http://localhost:8000/api/violations?limit=10",
            headers={"Authorization": "Bearer dev-123"},
            timeout=5
        )
        
        if response.status_code == 200:
            violations = response.json()
            
            print(f"📊 Violation Summary ({len(violations)} recent):")
            print("-" * 40)
            
            # Group by rule
            rule_counts = {}
            for v in violations:
                rule = v['rule']
                rule_counts[rule] = rule_counts.get(rule, 0) + 1
            
            for rule, count in sorted(rule_counts.items()):
                print(f"   {rule}: {count} violations")
            
            # Show models affected
            models = set(v['model'] for v in violations)
            print(f"\n🎯 Models: {', '.join(sorted(models))}")
            
            # Show latest
            if violations:
                latest = violations[0]
                print(f"\n🕐 Latest: {latest['rule']} on {latest['model']} "
                      f"({latest['latency_ms']:.0f}ms)")
        
    except Exception as e:
        print(f"❌ Cannot fetch violations: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--summary":
        show_violation_summary()
    else:
        try:
            asyncio.run(test_real_violations())
        except KeyboardInterrupt:
            print("\n\n👋 Test interrupted by user")
        except Exception as e:
            print(f"\n❌ Test failed: {e}")