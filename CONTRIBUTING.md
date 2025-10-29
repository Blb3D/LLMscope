# Contributing to LLMscope

Thank you for considering contributing to LLMscope! We welcome contributions from developers, data scientists, DevOps engineers, and anyone interested in improving LLM monitoring.

---

## 🎯 Ways to Contribute

### 1. Report Bugs
Found a bug? Open an issue with:
- **Description** - What went wrong?
- **Steps to reproduce** - How can we see it?
- **Expected behavior** - What should happen?
- **Actual behavior** - What actually happens?
- **Environment** - OS, Docker version, LLM provider, etc.
- **Screenshots** - If applicable

[Open a bug report →](https://github.com/Blb3D/llmscope/issues/new?labels=bug)

### 2. Suggest Features
Have an idea? Open an issue with:
- **Use case** - Why do you need this?
- **Proposed solution** - How would it work?
- **Alternatives** - What else did you consider?
- **Impact** - Who benefits from this?

[Request a feature →](https://github.com/Blb3D/llmscope/issues/new?labels=enhancement)

### 3. Improve Documentation
Documentation can always be better:
- Fix typos or unclear explanations
- Add examples or tutorials
- Translate to other languages
- Create video walkthroughs

### 4. Write Code
Submit pull requests for:
- Bug fixes
- New features
- Performance improvements
- Test coverage
- Refactoring

---

## 🚀 Quick Start for Contributors

### Prerequisites
- Git
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (for frontend)

### Development Setup

#### 1. Fork & Clone
```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/llmscope.git
cd llmscope
git remote add upstream https://github.com/Blb3D/llmscope.git
```

#### 2. Backend Development
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend locally
cd backend
uvicorn app:app --reload --port 8000

# Backend runs at http://localhost:8000
```

#### 3. Frontend Development
```bash
# Install dependencies
cd frontend
npm install

# Run dev server
npm run dev

# Frontend runs at http://localhost:8081
```

#### 4. Monitor Development
```bash
# Run monitor (requires Ollama or LLM API)
cd monitor
python monitor_apis.py
```

### Testing Locally
```bash
# Full stack with Docker Compose
docker-compose up --build

# Access dashboard at http://localhost:8081
```

---

## 📝 Pull Request Process

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

### 2. Make Your Changes
- Write clean, readable code
- Follow existing code style
- Add comments where needed
- Update documentation if needed

### 3. Test Your Changes
```bash
# Run tests (if available)
pytest tests/

# Test Docker build
docker-compose up --build

# Verify dashboard works
# Visit http://localhost:8081
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: Add Nelson Rule R4 detection

- Implement R4 (14+ alternating points)
- Add tests for edge cases
- Update documentation"
```

**Commit message format:**
```
<type>: <subject>

<body (optional)>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance tasks

### 5. Push & Create PR
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Fill out the PR template
```

### 6. PR Review
- Wait for maintainer review
- Address feedback
- Update as needed
- Be patient and respectful

---

## 🎨 Code Style Guide

### Python (Backend)
- Follow [PEP 8](https://pep8.org/)
- Use type hints where possible
- Maximum line length: 100 characters
- Use docstrings for functions/classes

**Example:**
```python
def calculate_control_limits(data: List[float], sigma: int = 3) -> Dict[str, float]:
    """
    Calculate Upper and Lower Control Limits using n-sigma method.
    
    Args:
        data: List of latency values in seconds
        sigma: Number of standard deviations (default: 3)
    
    Returns:
        Dictionary with 'ucl', 'lcl', 'mean', 'std' keys
    """
    mean = sum(data) / len(data)
    std = statistics.stdev(data)
    return {
        "mean": mean,
        "std": std,
        "ucl": mean + sigma * std,
        "lcl": max(0, mean - sigma * std)
    }
```

### JavaScript/React (Frontend)
- Use ES6+ syntax
- Functional components with hooks
- Use meaningful variable names
- Add JSDoc comments for complex functions

**Example:**
```javascript
/**
 * Detect Nelson Rule R1 violations (points beyond 3σ)
 * @param {Array} data - Array of data points with {t, y} structure
 * @param {number} mean - Process mean
 * @param {number} std - Standard deviation
 * @returns {Array} Array of violation objects
 */
function detectNelsonR1(data, mean, std) {
  const ucl = mean + 3 * std;
  const lcl = mean - 3 * std;
  
  return data
    .map((point, index) => {
      if (point.y > ucl || point.y < lcl) {
        return {
          index,
          rule: 'R1',
          deviation: (point.y - mean) / std
        };
      }
      return null;
    })
    .filter(Boolean);
}
```

### Documentation (Markdown)
- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Link to related docs

---

## 🧪 Testing Guidelines

### Backend Tests
```python
# tests/test_nelson_rules.py
def test_nelson_rule_r1_detection():
    """Test R1 detects outliers beyond 3σ"""
    data = [2.0, 2.1, 2.0, 9.0]  # Last point is outlier
    mean = 2.0
    std = 0.1
    
    violations = detect_nelson_r1(data, mean, std)
    
    assert len(violations) == 1
    assert violations[0]['index'] == 3
    assert violations[0]['rule'] == 'R1'
```

### Frontend Tests
```javascript
// tests/SPCChart.test.jsx
describe('SPCChart', () => {
  it('renders control limits correctly', () => {
    const stats = { mean: 2.0, ucl: 2.5, lcl: 1.5 };
    const { getByText } = render(<SPCChart stats={stats} />);
    
    expect(getByText('Mean')).toBeInTheDocument();
    expect(getByText('2.000s')).toBeInTheDocument();
  });
});
```

### Integration Tests
- Test full Docker stack
- Verify API endpoints work
- Check dashboard renders
- Validate violations are detected

---

## 📚 Key Areas for Contribution

### High Priority
1. **Nelson Rules R4-R8** - Implement remaining rules (Phase 3)
2. **Prometheus Exporter** - `/metrics` endpoint
3. **Email Alert Stabilization** - Move from beta to stable
4. **PostgreSQL Support** - Alternative to SQLite

### Medium Priority
1. **Multi-model comparison** - Side-by-side charts
2. **Custom alert thresholds** - Per-rule configuration
3. **Grafana dashboards** - Pre-built templates
4. **Historical analysis** - 30/90-day trends

### Low Priority (Good First Issues)
1. **Documentation improvements**
2. **UI polish** - Better colors, animations
3. **Error handling** - Better error messages
4. **Test coverage** - Add more tests

---

## 🐛 Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, email: security@yourproject.com (replace with actual email)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours.

---

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience
- Nationality, personal appearance, race
- Religion, sexual identity and orientation

### Our Standards
**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior:**
- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement
Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to: conduct@yourproject.com (replace with actual email)

---

## 🎓 Learning Resources

New to the project? Start here:

### Understanding SPC
- [Nelson Rules Explained](docs/SCOPE_v5.md#51-control-limits-calculation)
- [Why 3σ?](docs/SCOPE_v5.md#52-nelson-rules-phase-1--2)
- [SPC for Software](https://example.com/spc-software) *(add real link)*

### Codebase Tour
- [Architecture Guide](docs/llmscope_architecture_guide.md)
- [API Documentation](docs/SCOPE_v5.md#42-core-endpoints)
- [Database Schema](docs/SCOPE_v5.md#31-telemetry-schema-sqlite)

### Development
- [Docker Setup](README.md#quick-start)
- [Running Tests](README.md#testing)
- [Debugging Tips](docs/DEBUGGING.md) *(create if needed)*

---

## 🏆 Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Mentioned in release notes
- Thanked in project updates

**Top contributors may receive:**
- Invitation to core team
- Commit access
- Recognition on website/docs

---

## 📬 Questions?

- **General questions:** Open a [GitHub Discussion](https://github.com/Blb3D/llmscope/discussions)
- **Bug reports:** Open an [Issue](https://github.com/Blb3D/llmscope/issues)
- **Security:** Email security@yourproject.com
- **Other:** Email bbaker@blb3dprinting.com

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for making LLMscope better!** 🚀

Your contributions help developers worldwide monitor their LLM services more effectively.
