# monitor.py - LLMscope Real API Monitor
import time
import os
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, Optional, List
import json

# Configuration
LLMSCOPE_API_URL = os.getenv("LLMSCOPE_API_URL", "http://localhost:8000")
LLMSCOPE_API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-key-change-in-production")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MONITORING_INTERVAL = int(os.getenv("MONITORING_INTERVAL", "10"))  # seconds

# Pricing (as of 2024, update as needed)
PRICING = {
    "openai": {
        "gpt-4": {"input": 0.00003, "output": 0.00006},
        "gpt-3.5-turbo": {"input": 0.0000005, "output": 0.0000015},
    },
    "anthropic": {
        "claude-3-5-sonnet-20241022": {"input": 0.000003, "output": 0.000015},
        "claude-3-opus-20240229": {"input": 0.000015, "output": 0.000075},
    }
}

class APIMonitor:
    def __init__(self):
        self.session = None
        self.test_prompt = "Hello, this is a test message. Please respond briefly."
    
    async def init_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def close_session(self):
        if self.session:
            await self.session.close()
    
    def calculate_cost(self, provider: str, model: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost based on token usage"""
        if provider not in PRICING or model not in PRICING[provider]:
            return 0.0
        
        pricing = PRICING[provider][model]
        cost = (tokens_in * pricing["input"]) + (tokens_out * pricing["output"])
        return round(cost, 8)
    
    async def test_openai(self, model: str = "gpt-3.5-turbo") -> Optional[Dict]:
        """Test OpenAI API"""
        if not OPENAI_API_KEY:
            print("⚠️  OpenAI API key not set")
            return None
        
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": self.test_prompt}],
            "max_tokens": 50
        }
        
        start = time.perf_counter()
        try:
            async with self.session.post(url, headers=headers, json=payload) as resp:
                latency = time.perf_counter() - start
                
                if resp.status == 200:
                    data = await resp.json()
                    tokens_in = data["usage"]["prompt_tokens"]
                    tokens_out = data["usage"]["completion_tokens"]
                    cost = self.calculate_cost("openai", model, tokens_in, tokens_out)
                    
                    return {
                        "provider": "openai",
                        "model": model,
                        "latency": round(latency, 3),
                        "tokens_in": tokens_in,
                        "tokens_out": tokens_out,
                        "cost": cost,
                        "success": True
                    }
                else:
                    error = await resp.text()
                    return {
                        "provider": "openai",
                        "model": model,
                        "latency": round(latency, 3),
                        "success": False,
                        "error_message": f"HTTP {resp.status}: {error[:100]}"
                    }
        except Exception as e:
            latency = time.perf_counter() - start
            return {
                "provider": "openai",
                "model": model,
                "latency": round(latency, 3),
                "success": False,
                "error_message": str(e)
            }
    
    async def test_anthropic(self, model: str = "claude-3-5-sonnet-20241022") -> Optional[Dict]:
        """Test Anthropic API"""
        if not ANTHROPIC_API_KEY:
            print("⚠️  Anthropic API key not set")
            return None
        
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "max_tokens": 50,
            "messages": [{"role": "user", "content": self.test_prompt}]
        }
        
        start = time.perf_counter()
        try:
            async with self.session.post(url, headers=headers, json=payload) as resp:
                latency = time.perf_counter() - start
                
                if resp.status == 200:
                    data = await resp.json()
                    tokens_in = data["usage"]["input_tokens"]
                    tokens_out = data["usage"]["output_tokens"]
                    cost = self.calculate_cost("anthropic", model, tokens_in, tokens_out)
                    
                    return {
                        "provider": "anthropic",
                        "model": model,
                        "latency": round(latency, 3),
                        "tokens_in": tokens_in,
                        "tokens_out": tokens_out,
                        "cost": cost,
                        "success": True
                    }
                else:
                    error = await resp.text()
                    return {
                        "provider": "anthropic",
                        "model": model,
                        "latency": round(latency, 3),
                        "success": False,
                        "error_message": f"HTTP {resp.status}: {error[:100]}"
                    }
        except Exception as e:
            latency = time.perf_counter() - start
            return {
                "provider": "anthropic",
                "model": model,
                "latency": round(latency, 3),
                "success": False,
                "error_message": str(e)
            }
    
    async def log_to_llmscope(self, data: Dict):
        """Send monitoring data to LLMscope API"""
        url = f"{LLMSCOPE_API_URL}/api/log"
        headers = {
            "Authorization": f"Bearer {LLMSCOPE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.post(url, headers=headers, json=data) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    print(f"❌ Failed to log: {error}")
        except Exception as e:
            print(f"❌ Error logging to LLMscope: {e}")
    
    async def run_monitoring_cycle(self):
        """Run one monitoring cycle"""
        print(f"\n🔍 [{datetime.now().strftime('%H:%M:%S')}] Running monitoring cycle...")
        
        # Test OpenAI
        if OPENAI_API_KEY:
            result = await self.test_openai()
            if result:
                await self.log_to_llmscope(result)
                status = "✅" if result["success"] else "❌"
                print(f"{status} OpenAI: {result['latency']}s", end="")
                if result["success"]:
                    print(f" | Cost: ${result['cost']:.6f} | Tokens: {result['tokens_in']}→{result['tokens_out']}")
                else:
                    print(f" | Error: {result.get('error_message', 'Unknown')}")
        
        # Test Anthropic
        if ANTHROPIC_API_KEY:
            result = await self.test_anthropic()
            if result:
                await self.log_to_llmscope(result)
                status = "✅" if result["success"] else "❌"
                print(f"{status} Anthropic: {result['latency']}s", end="")
                if result["success"]:
                    print(f" | Cost: ${result['cost']:.6f} | Tokens: {result['tokens_in']}→{result['tokens_out']}")
                else:
                    print(f" | Error: {result.get('error_message', 'Unknown')}")
        
        if not OPENAI_API_KEY and not ANTHROPIC_API_KEY:
            print("⚠️  No API keys configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.")
    
    async def start(self):
        """Start continuous monitoring"""
        await self.init_session()
        print("🚀 LLMscope Monitor Started")
        print(f"📊 Logging to: {LLMSCOPE_API_URL}")
        print(f"⏱️  Interval: {MONITORING_INTERVAL}s")
        print(f"🔑 OpenAI: {'✅ Configured' if OPENAI_API_KEY else '❌ Not set'}")
        print(f"🔑 Anthropic: {'✅ Configured' if ANTHROPIC_API_KEY else '❌ Not set'}")
        
        try:
            while True:
                await self.run_monitoring_cycle()
                await asyncio.sleep(MONITORING_INTERVAL)
        except KeyboardInterrupt:
            print("\n\n⏹️  Monitoring stopped")
        finally:
            await self.close_session()

async def main():
    monitor = APIMonitor()
    await monitor.start()

if __name__ == "__main__":
    asyncio.run(main())