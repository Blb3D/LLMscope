# v1.0.0 Development Setup Guide

Quick setup for contributors working on the v2-refactor → v1.0.0 path.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

## Branch Setup

```bash
# Clone and switch to development branch
git clone https://github.com/Blb3D/LLMscope.git
cd LLMscope
git checkout v2-refactor
```

## Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install pytest pytest-cov pytest-asyncio

# Run tests
pytest tests/ -v

# Check feature flags
python -c "from feature_flags import FLAGS; print(FLAGS.get_all())"
```

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Start dev server
npm run dev
```

## Feature Flags

All new features are behind flags. Enable them via environment variables:

```bash
# Example: Enable Phase 0 features
export FEATURE_ENHANCED_TELEMETRY=true
export FEATURE_COPILOT_COGNITIVE_LOAD=true
export FEATURE_CASE_REPORTS=true
export FEATURE_ZOOMED_CHART=true
```

Or in `.env`:
```
FEATURE_ENHANCED_TELEMETRY=true
FEATURE_COPILOT_COGNITIVE_LOAD=true
```

## Testing Your Changes

```bash
# Backend
cd backend
pytest tests/ -v --cov=.

# Frontend
cd frontend
npm test

# Integration (Docker)
docker-compose up -d
```

## Working on P0 Items

P0 items are the highest priority. Pick one from:

1. Enhanced Telemetry UI (`FEATURE_ENHANCED_TELEMETRY`)
2. Copilot Cognitive Load (`FEATURE_COPILOT_COGNITIVE_LOAD`)
3. Case Reports (`FEATURE_CASE_REPORTS`)
4. Zoomed Chart (`FEATURE_ZOOMED_CHART`)

See issue templates in `.github/ISSUE_TEMPLATE/` for details.

## Commit Guidelines

```bash
# Feature
git commit -m "feat(p0): add enhanced telemetry to UI"

# Fix
git commit -m "fix(copilot): handle missing telemetry gracefully"

# Test
git commit -m "test(flags): add coverage for feature flag system"

# Docs
git commit -m "docs(roadmap): update Phase 0 progress"
```

## Pull Request Process

1. Branch from `v2-refactor`
2. Implement feature behind flag
3. Add tests (target: 80% coverage)
4. Update docs if needed
5. Ensure CI passes
6. Request review

## Resources

- **Roadmap:** `docs/v1.0.0_ROADMAP.md`
- **Step-by-step:** `docs/v1.0.0_STEP_BY_STEP_START.md`
- **Product roadmap:** `docs/ROADMAP_v5.md`
- **Architecture:** `llmscope_architecture_guide.md`

## Questions?

- GitHub Discussions for Q&A
- GitHub Issues for bugs
- Check existing issue templates for guidance

## Quick Reference

```bash
# Enable all Phase 0 flags for testing
export FEATURE_ENHANCED_TELEMETRY=true
export FEATURE_COPILOT_COGNITIVE_LOAD=true
export FEATURE_CASE_REPORTS=true
export FEATURE_ZOOMED_CHART=true

# Run full test suite
cd backend && pytest tests/ -v --cov=.
cd frontend && npm test

# Build and test Docker
docker-compose build
docker-compose up -d
docker-compose logs -f

# Check CI locally (if act installed)
act -j backend-tests
```

---

**Goal:** Ship v1.0.0 incrementally with confidence. Quality over speed! 🚀
