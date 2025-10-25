# 🧭 LLMscope – Phase Release Checklist

This document defines the release workflow for BLB3D Labs’ **LLMscope Desktop** project.  
Use this checklist to ensure every phase release is clean, versioned, and ready for tagging.

---

## ✅ PRE-PUSH TESTS

| Step | Description | Status |
|------|--------------|--------|
| 🧪 **1. Verify FastAPI Runs** | `python -m uvicorn Web.app:app --reload` – ensure dashboard and `/reports` load without errors. | ☐ |
| 🧠 **2. Check Live Sampler** | Run `python chatgpt_speed_monitor_v1.py` and confirm new rows in `Logs/chatgpt_speed_log.csv`. | ☐ |
| 📊 **3. Test PDF Export** | Visit `/reports` → click **Generate New Report** → verify file appears in `Reports/exports/`. | ☐ |
| 🌈 **4. Confirm Styling** | Bronze (#D37E3E) and Black (#1A0F08) palette applied to all pages and reports. | ☐ |
| 💾 **5. Ensure Logs Writable** | Verify `Logs/` directory permissions are set to `Full Control` for all users. | ☐ |

---

## 🧾 VERSION TAG & GIT PUSH

1. Open PowerShell in your project folder:
   ```bash
   cd "C:\Users\brand\OneDrive\Documents\LLMscope-main\LLMscope_Clean_Baseline_v2.1"
