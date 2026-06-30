# 🏙️ CityLens AI
> See. Report. Resolve.

AI-powered hyperlocal civic issue reporting platform built 
for Vibe2Ship Hackathon (CodingNinjas × Google for Developers).

🔗 **Live Demo:** https://city-lens-ai-production.up.railway.app

---

## 🤖 AI Agent Pipeline

| Agent | Input | Output |
|---|---|---|
| Vision Agent | Citizen photo | Category, severity, hazards, department |
| Routing Agent | Issue data | Department, priority P1-P4, escalation path |
| Resolution Agent | Before+After photos | Fix quality verification |
| Insight Agent | All reports | Hotspots, trends, predictions |

---

## ✨ Features

- **Vision Agent** — Gemini 2.5 Flash analyzes civic issue photos
- **Routing Agent** — Auto-assigns Indian municipal department + priority
- **Resolution Agent** — AI verifies before/after fix quality  
- **Insight Agent** — City-wide pattern detection & predictions
- **GreenCoins** — Civic reward tokens (+10 report, +25 verified, +50 resolved)
- **Live Map** — Geo-tagged reports with severity markers
- **Legal Complaint Generator** — AI-drafted formal municipal letters
- **Firebase Auth** — Google Sign-in for rewards tracking

---

## 🛠️ Tech Stack

**Frontend:** React 18 + Vite + TypeScript + Tailwind CSS

**Backend:** Node.js + Express + TypeScript

**AI:** Gemini 2.5 Flash (4 agents)

**Database:** Firebase Firestore + Firebase Auth

**Maps:** Google Maps JS API + Geocoding API

**Deployment:** Railway

---

## 🚀 Setup

1. Clone repo
```bash
   git clone https://github.com/sri-ijan/City-Lens-AI.git
   cd City-Lens-AI
```

2. Install dependencies
```bash
   npm install
```

3. Create `.env` file
GEMINI_API_KEY=your_key
VITE_GOOGLE_MAPS_PLATFORM_KEY=your_maps_key
PORT=3000
NODE_ENV=development

4. Run locally
```bash
   npm run dev
```

---

## 🏆 Hackathon

**Event:** Vibe2Ship — CodingNinjas × Google for Developers  
**Problem Statement:** PS2 — Community Hero (Hyperlocal Problem Solver)  
**Team:** Srijan

---

## 📊 Evaluation Criteria Coverage

| Criteria | Implementation |
|---|---|
| Problem Solving & Impact | Civic issue reporting with AI pipeline |
| Agentic Depth | 4 Gemini agents chained together |
| Innovation & Creativity | Resolution verification + Insight Agent |
| Google Technologies | Gemini, Firebase, Maps, AI Studio |
| Product Experience | Dark editorial UI, smooth scroll |
| Technical Implementation | Full-stack TypeScript, real-time Firestore |
| Completeness | All flows working end-to-end |