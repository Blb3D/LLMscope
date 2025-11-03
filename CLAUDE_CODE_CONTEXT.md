# LLMscope - Quick Context for Claude Code

## What This Is
LLM cost tracking tool. Track API costs across OpenAI, Anthropic, Google, etc. with real-time dashboard and intelligent recommendations.

## Recent Pivot
- OLD: SPC monitoring (Nelson Rules, latency tracking)
- NEW: Cost tracking and optimization (faster to market)
- SPC features will come later as upsell

## Current State - Week 1 Sprint COMPLETE! ✅
- **Status**: Ready for launch!
- **Launch target**: November 22-24, 2025
- **All MVP features implemented**
- **Pricing data**: Real and verified (Jan 2025)

## Tech Stack
- Backend: FastAPI + SQLite + CSV export
- Frontend: React + Vite + Tailwind
- Deploy: Docker Compose
- Database: SQLite with performance indexes

## ✅ Completed Features (v1.0)

### Core Features
1. ✅ **Demo Data Generator** - 500 realistic records, weighted patterns (30% simple, 40% medium, 25% complex, 5% extreme)
2. ✅ **Time-Based Filtering** - 24h, 7d, 30d, All Time with backend API support
3. ✅ **CSV Export** - Download usage data with date range filtering
4. ✅ **Database Indexes** - Performance optimization for timestamp, provider, model queries
5. ✅ **Cost Tracking** - Real-time dashboard with 63+ models from 12 providers
6. ✅ **Model Recommendations** - Top 5 cheapest models by cost per token
7. ✅ **Sortable Tables** - Click to sort by Cost, Requests, or Tokens (asc/desc)
8. ✅ **Empty State UX** - Beautiful onboarding with quick start instructions
9. ✅ **Background Refresh** - 5-second updates without scroll reset

### Pricing Data
- **Real pricing** from official provider sources
- **63+ models** across OpenAI, Anthropic, Google, Cohere, Together AI, Mistral, Groq, Perplexity, Fireworks, Azure, Bedrock
- **Last verified**: January 2025
- **Update strategy**: Quarterly manual updates, user-reported corrections

## Roadmap (Post-Launch)

### v1.1 (Week 4-5)
- [ ] Personalized recommendations based on actual usage patterns
- [ ] Cost anomaly detection and alerts
- [ ] Model comparison tool
- [ ] Budget thresholds and notifications

### v1.2 (Month 2)
- [ ] Advanced analytics and visualizations
- [ ] Team usage tracking
- [ ] API key management
- [ ] Cost prediction engine

### v2.0 (Month 3+)
- [ ] SPC monitoring features (upsell tier)
- [ ] Auto-fetch pricing from provider APIs
- [ ] Multi-user support
- [ ] Advanced reporting (PDF exports)

## Architecture Decisions
- Self-hosted (privacy-first, 100% local)
- SQLite (simple, no PostgreSQL yet - keeps deployment easy)
- BSL 1.1 license (not MIT - for future monetization, converts to MIT in 3 years)
- Dark mode UI with emerald accents
- Auto-refresh without scroll reset (UX optimization)

## Files to Know
- `backend/app.py` - FastAPI backend with all endpoints
- `backend/seed_pricing.py` - Real pricing data (update quarterly)
- `backend/generate_demo_data.py` - Demo data generator with weighted patterns
- `frontend/src/Dashboard.jsx` - Main dashboard component
- `.env.example` - Environment variable template
- `README.md` - Main documentation with integration examples
- `VM_TESTING_GUIDE.md` - Complete VM setup and testing instructions for Windows/Linux

## Before Launch Checklist

### Development & Testing
- [x] All MVP features complete
- [x] Pricing data verified
- [x] Empty state UX polished
- [ ] **Docker deployment tested on Windows VM** (fresh install)
- [ ] **Docker deployment tested on Linux VM** (fresh install)
- [ ] End-to-end testing: demo data generation → dashboard display → CSV export
- [ ] Test all time filters (24h, 7d, 30d, All Time)
- [ ] Test sortable columns on large datasets
- [ ] Verify API integration examples from README work

### Marketing & Launch Prep
- [ ] Screenshots for README (dashboard, cost breakdown, recommendations)
- [ ] Video demo recorded (2-3 min walkthrough)
- [ ] Product Hunt submission ready
- [ ] Testimonials from beta testers (2-3)
- [ ] Launch announcement drafted for GitHub/Twitter/LinkedIn

## When Working on Code
- Focus on MVP features only (resist feature creep!)
- Test on fresh Docker install
- Keep it simple - ship fast, iterate based on feedback
- Verify pricing data accuracy before major releases
- Update this file when priorities change
