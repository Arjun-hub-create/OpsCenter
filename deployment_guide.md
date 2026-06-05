# OpsCenter AI — Vercel Deployment Guide

Hey! Here is the complete step-by-step guide on how to deploy this project to production.

Since Vercel has a read-only filesystem, we have adapted the backend to store all uploaded files (images and PDFs) directly in MongoDB as Base64 encoded strings. This allows you to host **both** the frontend (React/Vite) and backend (FastAPI/Python) together on **Vercel** under a unified monorepo structure.

---

## 🔌 Architectural Requirements for Vercel

Before deploying, make sure you have:
1. **MongoDB Atlas (Database)**: Since the serverless environment cannot access local databases (`127.0.0.1:27017`), you must create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and copy the connection string.
2. **API Keys**:
   - **Google Gemini API Key**: For handwriting vision OCR.
   - **Groq API Key**: For chat and suggestion generation.

---

## ⚡ Step-by-Step Vercel Deployment

Vercel will build your React code and deploy your FastAPI backend as serverless functions.

### 1. Push your code to GitHub
Make sure all your latest local commits (including the new `vercel.json` and `api/` directories) are pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure Vercel monorepo deployment"
git push origin main
```

### 2. Import project to Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Select your GitHub repository (`OpsCenter`) and click **Import**.
3. In the project settings, configure:
   - **Framework Preset**: Select `Other` (or leave it as default).
   - **Root Directory**: Leave it as `.` (the root of your workspace, do NOT select `frontend`).
   - **Build Command**: Leave as default (`npm run build`, which runs the root script `cd frontend && npm install && npm run build`).
   - **Output Directory**: `frontend/dist` (type this in manually).

### 3. Add Environment Variables
Add the following key-value pairs in the **Environment Variables** section on Vercel:

| Variable Name | Value |
|---|---|
| `MONGODB_URI` | *Your MongoDB Atlas connection string* (e.g., `mongodb+srv://...`) |
| `DB_NAME` | `opscenter` |
| `GEMINI_API_KEY` | *Your Google Gemini API Key* |
| `GROQ_API_KEY` | *Your Groq API Key* |

### 4. Deploy!
Click **Deploy**. Vercel will install dependencies, compile the React assets to `frontend/dist`, discover the `api/index.py` backend entry point, and deploy them together.

Once the deployment finishes, Vercel will provide you with a production URL (e.g., `https://opscenter.vercel.app`) where your complete, fully functional OpsCenter app is live!
