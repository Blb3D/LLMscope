# 🗂️ LLMscope Beta Development Board
**Project:** LLMscope Desktop (BLB3D Labs)  
**Goal:** Launch a marketable, locally running AI performance dashboard  
**Cycle:** 2 Weeks (Phase 6 → Beta 1.0)

---

## 🧩 TO DO (Upcoming)

| Priority | Task | Notes |
|-----------|------|-------|
| 🔥 | **Implement real-time dashboard overlay** | Add mean / UCL / LCL lines + markers via Plotly. |
| 🔥 | **Inline report preview (Phase 6B)** | Replace “download-only” PDF view with inline `<object>` embed. |
| 🔥 | **Add auto-refresh loop** | Dashboard updates every 2–3 seconds from Logs CSV. |
| ⚙️ | **Add GPU / CPU / RAM indicators** | Match Claude-style visual layout beneath chart. |
| 🎨 | **Finalize bronze/black/cream palette** | Maintain consistency with BLB3D Labs brand. |
| 📈 | **Add summary stats to report exports** | Mean / max / min latency + resource averages. |
| 📦 | **PyInstaller packaging** | Create one-file `.exe` version for Windows test. |
| 🧾 | **README + Quick-Start** | Explain installation, dashboard use, and reporting. |
| 🧠 | **Marketing assets** | Create hero image + one-pager for GitHub and website. |
| 🧰 | **Internal QA pass** | Test CSV permissions and PDF write access. |

---

## 🚧 IN PROGRESS

- [ ] Phase 6A: Real-time overlay rendering  
- [ ] Phase 6B: Inline PDF viewer  
- [ ] Phase 6C: Auto-refresh update loop  
- [ ] Design tweaks: bronze-black theming  
- [ ] Resource bars and live metrics sync  

---

## ✅ DONE (Completed)

- [x] Phase 5C: Reports route + PDF export  
- [x] Permission fixes for Logs and Reports  
- [x] Repo cleanup & `.gitignore` configuration  
- [x] Push-to-GitHub automation w/ changelog  
- [x] Phase Release Checklist created  
- [x] Beta 2-Week Timeline documented  

---

## 🧭 RELEASE TARGETS

| Version | Goal | Target Date |
|----------|------|--------------|
| **v2.2-alpha** | Dashboard overlay complete | Oct 25–27 |
| **v2.3-beta** | Marketable build (installer + visuals) | Nov 3–5 |
| **v2.4-beta2** | Internal tester distribution | Mid-Nov |
| **v2.5-release** | Public Beta + GitHub Launch | Late Nov |

---

## 🧠 NOTES

- Keep local-first architecture (no API telemetry).  
- Maintain <400MB memory footprint.  
- Tag every stable commit via:  
  ```bash
  python push_to_github_autotag_phase_changelog.py
