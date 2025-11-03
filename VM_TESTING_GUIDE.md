# LLMscope VM Testing Guide

Complete step-by-step instructions for testing LLMscope on Windows and Linux VMs before launch.

---

## Table of Contents
1. [Windows VM Setup & Testing](#windows-vm-setup--testing)
2. [Linux VM Setup & Testing](#linux-vm-setup--testing)
3. [Test Verification Checklist](#test-verification-checklist)
4. [Troubleshooting](#troubleshooting)

---

## Windows VM Setup & Testing

### Prerequisites
- VirtualBox, VMware Workstation, or Hyper-V
- Windows 10/11 ISO image
- At least 4GB RAM allocated to VM
- 30GB disk space

### Step 1: Create Windows VM

#### Using VirtualBox (Free)
1. Download and install [VirtualBox](https://www.virtualbox.org/wiki/Downloads)
2. Download [Windows 10/11 ISO](https://www.microsoft.com/en-us/software-download/windows10) (evaluation version is free for 90 days)
3. Create new VM:
   - Click "New"
   - Name: `LLMscope-Windows-Test`
   - Type: Microsoft Windows
   - Version: Windows 10/11 (64-bit)
   - RAM: 4096 MB (4GB minimum)
   - Hard disk: Create virtual hard disk (30GB VDI, dynamically allocated)
4. Start VM and select Windows ISO when prompted
5. Follow Windows installation wizard

#### Using Hyper-V (Built into Windows Pro/Enterprise)
1. Enable Hyper-V:
   ```powershell
   # Run as Administrator
   Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
   ```
2. Open Hyper-V Manager → "Quick Create" → Windows 10/11 dev environment

### Step 2: Install Docker Desktop on Windows VM

1. **Inside the Windows VM**, download Docker Desktop:
   - Visit: https://www.docker.com/products/docker-desktop
   - Download "Docker Desktop for Windows"

2. Run the installer:
   - Double-click `Docker Desktop Installer.exe`
   - Check "Use WSL 2 instead of Hyper-V" (recommended)
   - Click "OK" to install

3. Restart the VM when prompted

4. Start Docker Desktop:
   - Open Start Menu → Docker Desktop
   - Wait for "Docker Desktop is running" status

5. Verify Docker is working:
   ```powershell
   docker --version
   docker-compose --version
   ```

### Step 3: Install Git on Windows VM

1. Download Git for Windows:
   - Visit: https://git-scm.com/download/win
   - Download and run the installer

2. During installation:
   - Select "Git from the command line and also from 3rd-party software"
   - Use default settings for everything else

3. Verify Git installation:
   ```powershell
   git --version
   ```

### Step 4: Clone and Deploy LLMscope

1. Open PowerShell as Administrator

2. Clone the repository:
   ```powershell
   cd C:\Users\Public
   git clone https://github.com/Blb3D/LLMscope.git
   cd LLMscope
   ```

3. Start LLMscope with Docker Compose:
   ```powershell
   docker-compose up -d
   ```

4. Wait for containers to build and start (first time takes 3-5 minutes):
   ```powershell
   # Watch the logs
   docker-compose logs -f
   ```

5. Verify containers are running:
   ```powershell
   docker-compose ps
   ```

   Expected output:
   ```
   NAME                  STATUS              PORTS
   llmscope_backend      Up X minutes        0.0.0.0:8000->8000/tcp
   llmscope_frontend     Up X minutes        0.0.0.0:8081->80/tcp
   ```

### Step 5: Test LLMscope on Windows

1. **Test Dashboard Access:**
   - Open browser (Edge or Chrome)
   - Navigate to: http://localhost:8081
   - **Expected:** Empty state UI with quick start instructions

2. **Test Backend API:**
   - Navigate to: http://localhost:8000/docs
   - **Expected:** FastAPI Swagger documentation

3. **Generate Demo Data:**
   ```powershell
   docker exec llmscope_backend python generate_demo_data.py
   ```

   **Expected output:**
   ```
   🎲 Generating Demo Data for LLMscope...
   ============================================================

   Generating 500 requests over 30 days...
   Time range: 2024-10-03 to 2024-11-02

   ============================================================
   ✅ Demo Data Generated Successfully!

      📊 Total requests: 500
      💰 Total cost: $X.XXXX
      📅 Date range: Last 30 days
      💾 Database: ./data/llmscope.db

      📈 Request Pattern Distribution:
         • Simple (50-300 tokens):     150 (30.0%)
         • Medium (200-1.5K tokens):   200 (40.0%)
         • Complex (1K-8K tokens):     125 (25.0%)
         • Extreme (4K-15K tokens):     25 (5.0%)

   ============================================================
   ✨ Done! Your dashboard now has realistic data.
   ```

4. **Verify Dashboard Displays Data:**
   - Refresh http://localhost:8081
   - **Expected:** See cost breakdown table with data

5. **Test Time Filters:**
   - Click "Last 24h" button
   - **Expected:** Data filters to last 24 hours
   - Click "Last 7 days"
   - **Expected:** Data updates to 7 day range
   - Click "Last 30 days"
   - **Expected:** Data updates to 30 day range
   - Click "All Time"
   - **Expected:** Shows all data

6. **Test Sortable Columns:**
   - Click "Total Cost" header
   - **Expected:** Sorts by cost descending (highest first)
   - Click "Total Cost" again
   - **Expected:** Sorts ascending (lowest first)
   - Test "Requests" and "Tokens" columns similarly

7. **Test CSV Export:**
   - Click "Export CSV" button
   - **Expected:** Downloads `llmscope_export_YYYYMMDD.csv`
   - Open CSV in Excel/Notepad
   - **Expected:** See headers and 500 rows of data

8. **Test Auto-Refresh (No Scroll Reset):**
   - Scroll down to cost breakdown section
   - Wait 5 seconds (auto-refresh interval)
   - **Expected:** Page stays scrolled, no jump to top

### Step 6: Test with Real API Keys (Optional but Recommended)

This section tests LLMscope with actual LLM API calls to verify real-world integration.

#### Option A: Test with Ollama (Local, Free)

1. **Install Ollama on Windows VM:**
   - Download from: https://ollama.com/download/windows
   - Run installer
   - Open PowerShell and verify:
     ```powershell
     ollama --version
     ```

2. **Pull a model:**
   ```powershell
   ollama pull llama3.2
   ```

3. **Create Ollama test script:**
   ```powershell
   notepad test_ollama.py
   ```

   Paste this code:
   ```python
   import requests
   import json

   # Make a request to Ollama
   ollama_response = requests.post('http://localhost:11434/api/generate', json={
       'model': 'llama3.2',
       'prompt': 'Say hello in 5 words',
       'stream': False
   })

   ollama_data = ollama_response.json()
   print("Ollama Response:", ollama_data['response'])
   print("Tokens used:", ollama_data.get('eval_count', 0))

   # Log to LLMscope (Ollama is free, so cost is $0)
   llmscope_response = requests.post('http://localhost:8000/api/usage', json={
       'provider': 'ollama',
       'model': 'llama3.2',
       'prompt_tokens': ollama_data.get('prompt_eval_count', 0),
       'completion_tokens': ollama_data.get('eval_count', 0)
   })

   print("\nLLMscope logged:", llmscope_response.json())
   print("\nCheck dashboard at http://localhost:8081")
   ```

4. **Run the test:**
   ```powershell
   pip install requests
   python test_ollama.py
   ```

5. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See new "ollama" / "llama3.2" entry with $0.00 cost

#### Option B: Test with OpenAI (Paid API)

1. **Get OpenAI API Key:**
   - Visit: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Create OpenAI test script:**
   ```powershell
   notepad test_openai.py
   ```

   Paste this code:
   ```python
   import requests
   import os

   # Set your API key
   OPENAI_API_KEY = "sk-your-key-here"  # Replace with your actual key

   # Make a request to OpenAI
   openai_response = requests.post('https://api.openai.com/v1/chat/completions',
       headers={'Authorization': f'Bearer {OPENAI_API_KEY}'},
       json={
           'model': 'gpt-4o-mini',  # Cheapest model
           'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}],
           'max_tokens': 10
       }
   )

   openai_data = openai_response.json()

   if 'error' in openai_data:
       print("Error:", openai_data['error'])
   else:
       print("OpenAI Response:", openai_data['choices'][0]['message']['content'])

       usage = openai_data['usage']
       print(f"Tokens: {usage['prompt_tokens']} prompt + {usage['completion_tokens']} completion")

       # Log to LLMscope
       llmscope_response = requests.post('http://localhost:8000/api/usage', json={
           'provider': 'openai',
           'model': 'gpt-4o-mini',
           'prompt_tokens': usage['prompt_tokens'],
           'completion_tokens': usage['completion_tokens']
       })

       result = llmscope_response.json()
       print(f"\nLLMscope logged - Cost: ${result['cost_usd']:.6f}")
       print("Check dashboard at http://localhost:8081")
   ```

3. **Run the test:**
   ```powershell
   pip install requests
   python test_openai.py
   ```

4. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See "openai" / "gpt-4o-mini" entry with actual cost (typically $0.0001-0.0003)

#### Option C: Test with Anthropic Claude (Paid API)

1. **Get Anthropic API Key:**
   - Visit: https://console.anthropic.com/settings/keys
   - Click "Create Key"
   - Copy the key (starts with `sk-ant-`)

2. **Create Anthropic test script:**
   ```powershell
   notepad test_anthropic.py
   ```

   Paste this code:
   ```python
   import requests

   # Set your API key
   ANTHROPIC_API_KEY = "sk-ant-your-key-here"  # Replace with your actual key

   # Make a request to Anthropic
   anthropic_response = requests.post('https://api.anthropic.com/v1/messages',
       headers={
           'x-api-key': ANTHROPIC_API_KEY,
           'anthropic-version': '2023-06-01',
           'content-type': 'application/json'
       },
       json={
           'model': 'claude-3-haiku-20240307',  # Cheapest Claude model
           'max_tokens': 10,
           'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}]
       }
   )

   anthropic_data = anthropic_response.json()

   if 'error' in anthropic_data:
       print("Error:", anthropic_data['error'])
   else:
       print("Claude Response:", anthropic_data['content'][0]['text'])

       usage = anthropic_data['usage']
       print(f"Tokens: {usage['input_tokens']} input + {usage['output_tokens']} output")

       # Log to LLMscope
       llmscope_response = requests.post('http://localhost:8000/api/usage', json={
           'provider': 'anthropic',
           'model': 'claude-3-haiku',
           'prompt_tokens': usage['input_tokens'],
           'completion_tokens': usage['output_tokens']
       })

       result = llmscope_response.json()
       print(f"\nLLMscope logged - Cost: ${result['cost_usd']:.6f}")
       print("Check dashboard at http://localhost:8081")
   ```

3. **Run the test:**
   ```powershell
   pip install requests
   python test_anthropic.py
   ```

4. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See "anthropic" / "claude-3-haiku" entry with actual cost

#### Verification: Real API Integration Works

After running any of the above tests, verify:

- [ ] API call succeeded (got a response)
- [ ] LLMscope logged the usage (status 200)
- [ ] Dashboard shows the new entry
- [ ] Cost calculation is correct (matches provider's pricing)
- [ ] Time filter includes the new entry (should appear in "Last 24h")
- [ ] CSV export includes the new entry

### Step 7: Clean Up and Document Issues

1. Note any errors or warnings encountered
2. Take screenshots of successful dashboard
3. Stop containers:
   ```powershell
   docker-compose down
   ```

---

## Linux VM Setup & Testing

### Prerequisites
- VirtualBox, VMware Workstation, or KVM
- Ubuntu 22.04/24.04 LTS ISO (or Debian 11/12)
- At least 4GB RAM allocated to VM
- 30GB disk space

### Step 1: Create Linux VM

#### Using VirtualBox (Free)
1. Download [VirtualBox](https://www.virtualbox.org/wiki/Downloads)
2. Download [Ubuntu 22.04 LTS ISO](https://ubuntu.com/download/desktop)
3. Create new VM:
   - Click "New"
   - Name: `LLMscope-Linux-Test`
   - Type: Linux
   - Version: Ubuntu (64-bit)
   - RAM: 4096 MB (4GB minimum)
   - Hard disk: Create virtual hard disk (30GB VDI, dynamically allocated)
4. Start VM and select Ubuntu ISO when prompted
5. Follow Ubuntu installation wizard (minimal installation is fine)

### Step 2: Install Docker on Linux VM

1. **Inside the Linux VM**, open Terminal (Ctrl+Alt+T)

2. Update package index:
   ```bash
   sudo apt update
   ```

3. Install Docker using the official script (easiest method):
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

4. Add your user to the docker group (avoid needing sudo):
   ```bash
   sudo usermod -aG docker $USER
   ```

5. Log out and log back in (or run):
   ```bash
   newgrp docker
   ```

6. Verify Docker installation:
   ```bash
   docker --version
   docker compose version
   ```

### Step 3: Install Git (Usually Pre-installed)

1. Verify Git is installed:
   ```bash
   git --version
   ```

2. If not installed:
   ```bash
   sudo apt install git -y
   ```

### Step 4: Clone and Deploy LLMscope

1. Clone the repository:
   ```bash
   cd ~
   git clone https://github.com/Blb3D/LLMscope.git
   cd LLMscope
   ```

2. Start LLMscope with Docker Compose:
   ```bash
   docker compose up -d
   ```

   **Note:** On newer Docker versions, use `docker compose` (not `docker-compose`)

3. Wait for containers to build and start (first time takes 3-5 minutes):
   ```bash
   # Watch the logs
   docker compose logs -f
   ```

   Press Ctrl+C to exit logs

4. Verify containers are running:
   ```bash
   docker compose ps
   ```

   Expected output:
   ```
   NAME                  STATUS              PORTS
   llmscope_backend      Up X minutes        0.0.0.0:8000->8000/tcp
   llmscope_frontend     Up X minutes        0.0.0.0:8081->80/tcp
   ```

### Step 5: Test LLMscope on Linux

1. **Test Dashboard Access:**
   - Open Firefox or Chrome
   - Navigate to: http://localhost:8081
   - **Expected:** Empty state UI with quick start instructions

2. **Test Backend API:**
   - Navigate to: http://localhost:8000/docs
   - **Expected:** FastAPI Swagger documentation

3. **Generate Demo Data:**
   ```bash
   docker exec llmscope_backend python generate_demo_data.py
   ```

   **Expected output:**
   ```
   🎲 Generating Demo Data for LLMscope...
   ============================================================

   Generating 500 requests over 30 days...
   Time range: 2024-10-03 to 2024-11-02

   ============================================================
   ✅ Demo Data Generated Successfully!

      📊 Total requests: 500
      💰 Total cost: $X.XXXX
      📅 Date range: Last 30 days
      💾 Database: ./data/llmscope.db

      📈 Request Pattern Distribution:
         • Simple (50-300 tokens):     150 (30.0%)
         • Medium (200-1.5K tokens):   200 (40.0%)
         • Complex (1K-8K tokens):     125 (25.0%)
         • Extreme (4K-15K tokens):     25 (5.0%)

   ============================================================
   ✨ Done! Your dashboard now has realistic data.
   ```

4. **Verify Dashboard Displays Data:**
   - Refresh http://localhost:8081
   - **Expected:** See cost breakdown table with data

5. **Test All Features (Same as Windows):**
   - Time filters (24h, 7d, 30d, All Time)
   - Sortable columns (Cost, Requests, Tokens)
   - CSV export
   - Auto-refresh without scroll reset

6. **Test File Permissions (Linux-Specific):**
   ```bash
   ls -la data/
   ```

   **Expected:** Database file should be readable/writable
   ```
   -rw-r--r-- 1 root root XXXXX llmscope.db
   ```

### Step 6: Test with Real API Keys (Optional but Recommended)

This section tests LLMscope with actual LLM API calls to verify real-world integration.

#### Option A: Test with Ollama (Local, Free)

1. **Install Ollama on Linux VM:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Verify installation:**
   ```bash
   ollama --version
   ```

3. **Pull a model:**
   ```bash
   ollama pull llama3.2
   ```

4. **Create Ollama test script:**
   ```bash
   nano test_ollama.py
   ```

   Paste this code:
   ```python
   import requests
   import json

   # Make a request to Ollama
   ollama_response = requests.post('http://localhost:11434/api/generate', json={
       'model': 'llama3.2',
       'prompt': 'Say hello in 5 words',
       'stream': False
   })

   ollama_data = ollama_response.json()
   print("Ollama Response:", ollama_data['response'])
   print("Tokens used:", ollama_data.get('eval_count', 0))

   # Log to LLMscope (Ollama is free, so cost is $0)
   llmscope_response = requests.post('http://localhost:8000/api/usage', json={
       'provider': 'ollama',
       'model': 'llama3.2',
       'prompt_tokens': ollama_data.get('prompt_eval_count', 0),
       'completion_tokens': ollama_data.get('eval_count', 0)
   })

   print("\nLLMscope logged:", llmscope_response.json())
   print("\nCheck dashboard at http://localhost:8081")
   ```

   Press Ctrl+X, then Y, then Enter to save.

5. **Run the test:**
   ```bash
   pip3 install requests
   python3 test_ollama.py
   ```

6. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See new "ollama" / "llama3.2" entry with $0.00 cost

#### Option B: Test with OpenAI (Paid API)

1. **Get OpenAI API Key:**
   - Visit: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Create OpenAI test script:**
   ```bash
   nano test_openai.py
   ```

   Paste this code:
   ```python
   import requests

   # Set your API key
   OPENAI_API_KEY = "sk-your-key-here"  # Replace with your actual key

   # Make a request to OpenAI
   openai_response = requests.post('https://api.openai.com/v1/chat/completions',
       headers={'Authorization': f'Bearer {OPENAI_API_KEY}'},
       json={
           'model': 'gpt-4o-mini',  # Cheapest model
           'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}],
           'max_tokens': 10
       }
   )

   openai_data = openai_response.json()

   if 'error' in openai_data:
       print("Error:", openai_data['error'])
   else:
       print("OpenAI Response:", openai_data['choices'][0]['message']['content'])

       usage = openai_data['usage']
       print(f"Tokens: {usage['prompt_tokens']} prompt + {usage['completion_tokens']} completion")

       # Log to LLMscope
       llmscope_response = requests.post('http://localhost:8000/api/usage', json={
           'provider': 'openai',
           'model': 'gpt-4o-mini',
           'prompt_tokens': usage['prompt_tokens'],
           'completion_tokens': usage['completion_tokens']
       })

       result = llmscope_response.json()
       print(f"\nLLMscope logged - Cost: ${result['cost_usd']:.6f}")
       print("Check dashboard at http://localhost:8081")
   ```

   Press Ctrl+X, then Y, then Enter to save.

3. **Run the test:**
   ```bash
   pip3 install requests
   python3 test_openai.py
   ```

4. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See "openai" / "gpt-4o-mini" entry with actual cost (typically $0.0001-0.0003)

#### Option C: Test with Anthropic Claude (Paid API)

1. **Get Anthropic API Key:**
   - Visit: https://console.anthropic.com/settings/keys
   - Click "Create Key"
   - Copy the key (starts with `sk-ant-`)

2. **Create Anthropic test script:**
   ```bash
   nano test_anthropic.py
   ```

   Paste this code:
   ```python
   import requests

   # Set your API key
   ANTHROPIC_API_KEY = "sk-ant-your-key-here"  # Replace with your actual key

   # Make a request to Anthropic
   anthropic_response = requests.post('https://api.anthropic.com/v1/messages',
       headers={
           'x-api-key': ANTHROPIC_API_KEY,
           'anthropic-version': '2023-06-01',
           'content-type': 'application/json'
       },
       json={
           'model': 'claude-3-haiku-20240307',  # Cheapest Claude model
           'max_tokens': 10,
           'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}]
       }
   )

   anthropic_data = anthropic_response.json()

   if 'error' in anthropic_data:
       print("Error:", anthropic_data['error'])
   else:
       print("Claude Response:", anthropic_data['content'][0]['text'])

       usage = anthropic_data['usage']
       print(f"Tokens: {usage['input_tokens']} input + {usage['output_tokens']} output")

       # Log to LLMscope
       llmscope_response = requests.post('http://localhost:8000/api/usage', json={
           'provider': 'anthropic',
           'model': 'claude-3-haiku',
           'prompt_tokens': usage['input_tokens'],
           'completion_tokens': usage['output_tokens']
       })

       result = llmscope_response.json()
       print(f"\nLLMscope logged - Cost: ${result['cost_usd']:.6f}")
       print("Check dashboard at http://localhost:8081")
   ```

   Press Ctrl+X, then Y, then Enter to save.

3. **Run the test:**
   ```bash
   pip3 install requests
   python3 test_anthropic.py
   ```

4. **Verify in dashboard:**
   - Refresh http://localhost:8081
   - **Expected:** See "anthropic" / "claude-3-haiku" entry with actual cost

#### Verification: Real API Integration Works

After running any of the above tests, verify:

- [ ] API call succeeded (got a response)
- [ ] LLMscope logged the usage (status 200)
- [ ] Dashboard shows the new entry
- [ ] Cost calculation is correct (matches provider's pricing)
- [ ] Time filter includes the new entry (should appear in "Last 24h")
- [ ] CSV export includes the new entry

### Step 7: Clean Up and Document Issues

1. Note any errors or warnings encountered
2. Take screenshots of successful dashboard
3. Stop containers:
   ```bash
   docker compose down
   ```

---

## Test Verification Checklist

Use this checklist to verify all features work on both Windows and Linux VMs:

### Windows VM Testing

#### Basic Deployment
- [ ] Docker Desktop installed and running
- [ ] Containers start successfully (`docker-compose up -d`)
- [ ] Dashboard accessible at http://localhost:8081
- [ ] API docs accessible at http://localhost:8000/docs

#### Demo Data Testing
- [ ] Demo data generator runs successfully
- [ ] Dashboard displays 500 data records
- [ ] Time filters work (24h, 7d, 30d, All Time)
- [ ] Sortable columns work (Cost, Requests, Tokens)
- [ ] CSV export downloads successfully
- [ ] CSV file contains 500 rows + header
- [ ] Auto-refresh doesn't reset scroll position
- [ ] Empty state UI displays before data generation
- [ ] No console errors in browser DevTools (F12)

#### Real API Integration (Optional but Recommended)
- [ ] Ollama integration works (if tested)
- [ ] OpenAI integration works (if tested)
- [ ] Anthropic integration works (if tested)
- [ ] Cost calculations are accurate
- [ ] Real API calls appear in dashboard within 5 seconds
- [ ] CSV export includes real API data

### Linux VM Testing

#### Basic Deployment
- [ ] Docker installed and running
- [ ] Containers start successfully (`docker compose up -d`)
- [ ] Dashboard accessible at http://localhost:8081
- [ ] API docs accessible at http://localhost:8000/docs

#### Demo Data Testing
- [ ] Demo data generator runs successfully
- [ ] Dashboard displays 500 data records
- [ ] Time filters work (24h, 7d, 30d, All Time)
- [ ] Sortable columns work (Cost, Requests, Tokens)
- [ ] CSV export downloads successfully
- [ ] CSV file contains 500 rows + header
- [ ] Auto-refresh doesn't reset scroll position
- [ ] Empty state UI displays before data generation
- [ ] No console errors in browser DevTools (F12)
- [ ] File permissions correct (database is writable)

#### Real API Integration (Optional but Recommended)
- [ ] Ollama integration works (if tested)
- [ ] OpenAI integration works (if tested)
- [ ] Anthropic integration works (if tested)
- [ ] Cost calculations are accurate
- [ ] Real API calls appear in dashboard within 5 seconds
- [ ] CSV export includes real API data

### Cross-Platform Verification
- [ ] README.md instructions match actual setup process
- [ ] No platform-specific errors or warnings
- [ ] Performance is acceptable (dashboard loads < 2 seconds)
- [ ] Memory usage is reasonable (< 1GB total for both containers)

---

## Troubleshooting

### Windows Issues

#### Docker Desktop won't start
**Problem:** "Docker Desktop failed to start"

**Solutions:**
1. Enable virtualization in BIOS
2. Enable WSL 2:
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```
3. Restart computer

#### Port 8081 already in use
**Problem:** "Bind for 0.0.0.0:8081 failed: port is already allocated"

**Solution:**
```powershell
# Find what's using port 8081
netstat -ano | findstr :8081

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change the port in docker-compose.yml
```

#### Containers won't start
**Problem:** Containers exit immediately

**Solution:**
```powershell
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Linux Issues

#### Permission denied (Docker)
**Problem:** "permission denied while trying to connect to Docker daemon"

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker
```

#### Port 8081 already in use
**Problem:** "Bind for 0.0.0.0:8081 failed: port is already allocated"

**Solution:**
```bash
# Find what's using port 8081
sudo lsof -i :8081

# Kill the process
sudo kill -9 <PID>

# Or change the port in docker-compose.yml
```

#### Database permission errors
**Problem:** "unable to open database file"

**Solution:**
```bash
# Fix permissions on data directory
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

### Common Issues (Both Platforms)

#### "Network error" when accessing dashboard
**Problem:** Dashboard shows connection error

**Solution:**
1. Verify backend is running:
   ```bash
   docker ps
   curl http://localhost:8000/
   ```

2. Check backend logs:
   ```bash
   docker logs llmscope_backend
   ```

3. Restart containers:
   ```bash
   docker-compose restart
   ```

#### Demo data doesn't appear
**Problem:** Dashboard still shows empty state after generating data

**Solution:**
1. Verify data was generated:
   ```bash
   docker exec llmscope_backend ls -lh data/
   ```

2. Check database size (should be > 100KB):
   ```bash
   docker exec llmscope_backend stat data/llmscope.db
   ```

3. Manually query the API:
   ```bash
   curl http://localhost:8000/api/costs/summary
   ```

4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

#### CSV export returns empty file
**Problem:** Downloaded CSV has only headers, no data

**Solution:**
1. Check if data exists:
   ```bash
   curl http://localhost:8000/api/usage?limit=10
   ```

2. Try exporting without date filters (click "All Time" first)

3. Check backend logs for errors during export

---

## Reporting Issues

If you encounter issues during VM testing, document:

1. **Platform:** Windows or Linux version
2. **VM Software:** VirtualBox/VMware/Hyper-V version
3. **Docker Version:** Output of `docker --version`
4. **Error Message:** Exact error text
5. **Logs:** Output of `docker-compose logs`
6. **Steps to Reproduce:** What you did before the error
7. **Screenshots:** If visual issue

Add issues to: https://github.com/Blb3D/LLMscope/issues

---

## Success Criteria

Both Windows and Linux VM tests pass when:

✅ All checklist items marked complete
✅ Zero errors in container logs
✅ All 9 v1.0 features working
✅ Setup time < 10 minutes on fresh VM
✅ README instructions accurate

**Once both platforms pass, LLMscope v1.0 is ready for launch! 🚀**
