# OpsCenter AI — Deployment Guide

Hey! Here is the complete step-by-step guide on how to deploy this project to production. 

To deploy both frontend and backend correctly without mistakes, we need to handle them as two linked deployments. This is the industry-standard setup for React + FastAPI monorepos.

---

## 🔌 Architectural Requirements for Cloud Production

Before deploying, make sure you configure these two cloud dependencies:
1. **MongoDB Atlas (Database)**: Since a cloud server cannot access the local MongoDB running on your personal computer (`127.0.0.1:27017`), you must create a free database cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and copy the connection string.
2. **File Storage**: The backend saves uploaded log sheets into the local `uploads/` folder. 
   - **Important**: Vercel Serverless Functions have a **read-only filesystem**. Attempting to write files to disk on Vercel will crash the backend. 
   - **Solution**: We deploy the React frontend to **Vercel** (which is perfect for static web applications) and the FastAPI backend to **Render** or **Railway** (which support running persistent Docker/Python servers with writable disk storage).

---

## 🎨 Part 1: Deploy Backend to Render (Free Writable Hosting)

[Render](https://render.com/) is a great free hosting service that allows you to run Python servers and configure a persistent disk folder for files.

### Steps:
1. Create a free account on [Render](https://render.com/) and click **New > Web Service**.
2. Connect your GitHub repository (`OpsCenter`).
3. Configure the following settings:
   - **Name**: `opscenter-backend`
   - **Runtime**: `Python 3` (or `Python 3.10+`)
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** (under the "Env Groups" or "Environment" tab):
   - `MONGODB_URI`: *Your MongoDB Atlas connection string*
   - `DB_NAME`: `opscenter`
   - `GEMINI_API_KEY`: *Your Google Gemini API Key*
   - `GROQ_API_KEY`: *Your Groq API Key*
5. Add a **Persistent Disk** (to store uploaded images without losing them on restart):
   - Go to the **Disks** tab of your service.
   - Click **Add Disk**.
   - **Name**: `uploads-disk`
   - **Mount Path**: `/opt/render/project/src/backend/uploads` (or simply `backend/uploads`)
   - **Size**: `1 GB` (free tier)
6. Click **Deploy Web Service**. Render will build the virtualenv and boot the server. Once deployed, copy your service's URL (e.g., `https://opscenter-backend.onrender.com`).

---

## ⚡ Part 2: Deploy Frontend to Vercel

Vercel is the fastest platform to host React websites. We've included a `vercel.json` in the `frontend` folder to handle router page redirects.

### Steps:
1. Go to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository (`OpsCenter`).
3. In the project settings, configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - Add a key named `VITE_API_URL` and set its value to your Render backend URL (e.g. `https://opscenter-backend.onrender.com`).
   *Note: In `frontend/src/api.js`, we use `/api` relative path. If deploying to separate URLs, make sure your Vite config or Axios client points to this production variable.*
5. Click **Deploy**. Vercel will compile the React code and give you a live production website link!
