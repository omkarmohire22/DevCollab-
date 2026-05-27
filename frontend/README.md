<div align="center">

<br />

```
██████╗ ███████╗██╗   ██╗ ██████╗ ██████╗ ██╗     ██╗      █████╗ ██████╗ 
██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗██║     ██║     ██╔══██╗██╔══██╗
██║  ██║█████╗  ██║   ██║██║     ██║   ██║██║     ██║     ███████║██████╔╝
██║  ██║██╔══╝  ╚██╗ ██╔╝██║     ██║   ██║██║     ██║     ██╔══██║██╔══██╗
██████╔╝███████╗ ╚████╔╝ ╚██████╗╚██████╔╝███████╗███████╗██║  ██║██████╔╝
╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═════╝ 
```

### **The all-in-one collaboration platform built for developer teams.**  
*GitHub × Notion × Slack — unified, intelligent, real-time.*

<br />

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11.2-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

> 🏆 **DevFusion 2.0 | The Developers Hackathon**  
> Problem Statement: **DevCollab — Real-Time Project Collaboration Platform for Developers**

<br />

</div>

---

## 🧭 Table of Contents

- [The Vision](#-the-vision)
- [What It Does](#-what-it-does)
- [Tech Stack](#-tech-stack)
- [Features Built](#-features-built)
- [Team](#-team)

---

## 🌟 The Vision

Student developer teams work across too many tools — GitHub for code, Notion for docs, Slack for chat, Jira for tasks. Context switching kills productivity and fragments collaboration.

**DevCollab** brings it all together into a single, beautiful workspace: manage tasks on a Kanban board, save reusable code snippets, collaborate on a wiki, get an AI project assistant, and watch your team's pulse — all in real time.

---

## 💡 What It Does

DevCollab is a full-featured developer collaboration platform where teams can:

- **Create workspaces** with multiple projects, roles (Owner / Admin / Member / Viewer), and member management
- **Track tasks** on a drag-and-drop Kanban board with priorities, labels, assignees, due dates, attachments, and @mention comments
- **Collaborate in real time** with live presence indicators, board-sync events, and instant notifications — powered by simulated Socket.IO
- **Store and share code snippets** with syntax highlighting, tag search, and one-click copy
- **Write and link documentation** in a rich wiki with page linking and version history
- **Chat with an AI Project Assistant** for progress summaries, blocker detection, standup reports, and automated task breakdowns
- **Sketch and analyse architecture** on an interactive whiteboard — the "wow factor" AI Pair Planning canvas
- **Monitor team health** with Dev Pulse: burnout alerts, mood check-ins, sparkline charts, and AI weekly digest
- **Track every action** in a global Activity Feed
- **Upgrade via a payments page** (Free / Pro sandbox checkout)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18.3 + Vite 5.3 |
| **Styling** | Tailwind CSS 3.4 |
| **Animations** | Framer Motion 11.2 |
| **Routing** | React Router DOM 7 |
| **State Management** | React Context API (AuthContext + RealtimeContext) |
| **Real-Time Layer** | Simulated Socket.IO event engine (RealtimeContext) |
| **AI Features** | Hardcoded AI response engine (demo-ready; swap in Claude / OpenAI API) |
| **Build Tool** | Vite with PostCSS + Autoprefixer |
| **Canvas / Whiteboard** | HTML5 Canvas API |
| **Syntax Highlighting** | Custom keyword-based tokeniser (no external lib) |
---

## ✅ Features Built

### 🏢 Workspace & Projects
- [x] Create a workspace with a name, description, and tech stack tags
- [x] Multi-project support inside each workspace
- [x] Role system: Owner, Admin, Member, Viewer (UI enforced)
- [x] Member invite flow with email input
- [x] Workspace settings page (name, danger zone, member management)

### 📋 Task Management (Kanban)
- [x] Four-column Kanban board: **To Do → In Progress → In Review → Done**
- [x] Drag-and-drop task cards across columns (HTML5 DnD + Framer Motion)
- [x] Task modal: title, description, assignee, priority (P0 / P1 / P2), due date, labels, attachments
- [x] Task comments with @mention support
- [x] Overdue task highlighting
- [x] Column card counters and colour-coded column headers

### 🔴 Real-Time Collaboration
- [x] Simulated Socket.IO event engine with scripted remote user events
- [x] Live presence bar: shows who is online and what they are viewing
- [x] Task-level viewers: "Riya is viewing this task"
- [x] Real-time notification toasts: task moved, comment added, task assigned
- [x] Notification centre panel with full history

### 💻 Code Snippet Manager
- [x] Save snippets with title, language, tags, and description
- [x] Syntax-highlighted display (JS, TS, Python, Java, C++, Go)
- [x] Search by title or tag
- [x] Copy to clipboard button
- [x] AI Code Reviewer: paste any snippet → get a quality score (1–10), bugs, performance issues, readability and security suggestions

### 📖 Documentation Wiki
- [x] Project wiki with multiple pages
- [x] Rich-text-style editor with headings, bullets, code blocks
- [x] Page linking and navigation
- [x] Version history view

### 🤖 AI Project Assistant
- [x] **"Summarise this project"** — sprint progress summary with velocity
- [x] **"What's blocking us?"** — identifies stale In Progress tasks and suggested actions
- [x] **"Generate standup report"** — daily standup in structured format
- [x] **"Break down a feature"** — auto-generates subtasks from a plain-English description (e.g. "Build a login system" → 6 Kanban-ready tasks)
- [x] Chat-style UI with typing animation and message history

### 🎨 AI Pair Planning (Whiteboard) ⭐ *Wow-Factor Feature*
- [x] Freehand canvas with Pen, Marker, Rectangle, Circle, Arrow, Text, and Eraser tools
- [x] Colour palette and stroke-size picker
- [x] Undo / Clear / Export (PNG download)
- [x] **"AI Analyse" button** — reads the canvas and returns: architecture title, description, improvement suggestions, and auto-generated Kanban tasks
- [x] Animated AI analysis result panel with task list

### 📊 Dev Pulse — Team Health Dashboard ⭐ *Wow-Factor Feature*
- [x] Per-member burnout risk bar (colour-coded: green / amber / red)
- [x] Daily mood check-ins (emoji selector)
- [x] Activity sparklines per member (7-day trend)
- [x] Overdue task count and completion rate
- [x] **"Generate Weekly Digest"** — AI-written team summary
- [x] Overdue and burnout alerts in a notifications strip

### 📡 Activity Feed
- [x] Global workspace feed: task moved, comment added, doc updated, member joined
- [x] Filter by project or member
- [x] Event type icons and relative timestamps

### 👤 User System
- [x] Sign in / Sign up modal (accepts any credentials for demo)
- [x] Profile page with avatar, bio, skills, and GitHub link
- [x] Notification centre with in-app alert history

### 💳 Payments
- [x] Free plan: 1 workspace, 3 projects, 5 members
- [x] Pro plan: unlimited everything + AI features ($12/user/month)
- [x] Sandbox checkout flow

---

## 👥 Team

| Name | Role | GitHub |
|---|---|---|
| **Shravani Hajare** | Backend & AI Integration — Context, AI pages | [@shravanihajare](https://github.com/shravanihaj74) |
| **Omkar Mohire** | Frontend Lead — Kanban, Whiteboard, Animations | [@omkarmohire](https://github.com/omkarmohire22) |
| **Khushi Chile** | UI/UX Design — Component library, Design system | [@khushichile](https://github.com/khushi-io) |
| **Vinit Dalal** | DevOps & Tooling — Vite config, build, deploy | [@vinitdalal](https://github.com/vinitdalal05032004-bit) |
---

<div align="center">

<br />

**Built with confidence in 10 days at DevFusion 2.0 | The Developers Hackathon**

*If you found this project useful or interesting, please consider giving it a ⭐ on GitHub!*

<br />

</div>
