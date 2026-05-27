# DevCollab — Real-Time Project Collaboration Platform

A full-stack developer collaboration platform with Kanban boards, AI assistant, code snippets, wiki, whiteboard, team analytics, and real-time features.

## 🏗️ Project Structure

```
DevCollabfinal/
├── frontend/          # React + Vite + Tailwind CSS
└── backend/           # Node.js + Express + Supabase
```

## 🚀 Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS + Framer Motion
- Supabase JS Client
- React Router v7

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- Nodemailer (SMTP email)
- OpenAI API

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/shravanihaj74/DevCollab-Real-Time-Project-Collaboration-Platform-for-Developers.git
cd DevCollab-Real-Time-Project-Collaboration-Platform-for-Developers
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values
npm start
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

## 🔑 Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
PORT=4000
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="DevCollab <your_email@gmail.com>"
OPENAI_API_KEY=sk-your_openai_key
```

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:4000/api
```

## ✨ Features

- 🔐 Authentication (Supabase Auth + Google OAuth)
- 📋 Kanban Board with drag & drop
- 💻 Code Snippets with syntax highlighting
- 📄 Team Wiki
- 🤖 AI Assistant (OpenAI)
- 🎨 Collaborative Whiteboard with AI analysis
- 📊 Dev Pulse — Team health & burnout analytics
- 💳 Payment sandbox (Stripe-like)
- 📧 Email invitations
- 🔔 Real-time notifications
- 📈 Activity feed

## 📦 Deployment

- **Frontend**: Vercel
- **Backend**: Railway or Render
- **Database**: Supabase
- **Email**: Resend or Gmail SMTP
