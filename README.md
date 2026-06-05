# ⬡ OpsCenter AI — Manufacturing Document Digitization

Welcome to my project, **OpsCenter AI**! 

I built this system to solve a real-world problem: digitizing handwritten logs on shop floors. It uses AI vision to extract the table data, runs a strict validation check, alerts you of any weird production anomalies, and gives you a chat assistant to ask questions about the records.

I designed the UI with a futuristic HUD theme (using custom CSS grids and neon glow highlights) to make it look like a high-tech dashboard.

---

## 🚀 How to Run the Project (Step-by-Step)

Here are the exact commands to set up and start the application in sequence. 

### Prerequisites
- Make sure you have **Python 3.10+** and **Node.js** installed on your system.
- You need a local **MongoDB** server running at `mongodb://127.0.0.1:27017` (or you can use an Atlas connection string).

---

### Step 1: Clone and Go to the Project Directory
Open your terminal (PowerShell or Git Bash on Windows) and run:
```bash
git clone <your-repository-url>
cd opscenter
```

---

### Step 2: Set up the Backend
Now open a terminal window to get the backend running:

```powershell
# 1. Navigate to the backend folder
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\activate

# 4. Install all the required dependencies
pip install -r requirements.txt
```

---

### Step 3: Configure Environment Variables
You need to create a `.env` file inside the `backend` folder. You can copy the template first:

```powershell
# Copy the example env file
copy .env.example .env
```

Now, open the newly created `.env` file in the `backend` folder and fill in your keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=opscenter
UPLOAD_DIR=uploads
```

---

### Step 4: Run the Backend Server
Once the environment variables are saved, start the backend server:

```powershell
# Start FastAPI server with live reloading on port 8000
python -m uvicorn main:app --port 8000 --reload
```
You should see: `INFO: Application startup complete` in your terminal. Keep this terminal open!

---

### Step 5: Set up and Run the Frontend
Now, open a **second terminal window** to run the React frontend:

```powershell
# 1. Navigate to the frontend folder
cd frontend

# 2. Install node packages
npm install

# 3. Start the Vite development server
npm run dev
```

---

### Step 6: Open the App in Your Browser
Once Vite starts, open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

You are ready to upload images/PDFs and test the app!

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18 + Vite for fast loading
- **Backend**: FastAPI (Python) for asynchronous endpoints
- **Database**: MongoDB (via Motor async driver)
- **AI/OCR**: Google Gemini 1.5 Flash (vision model for reading handwriting)
- **AI Chat & Anomalies**: Groq (Llama-3.3-70b-versatile for fast processing)
- **Styling**: Pure CSS (no Tailwind, just custom design tokens and HUD neon effects)

---

## 🌟 Key Features

1. **Document Upload**: Supports drag-and-drop uploads of log sheet images (JPEG, PNG, etc.) or PDF files.
2. **AI OCR Extraction**: Gemini automatically extracts columns like Date, Shift, Employee Number, Machine Code, Qty, and Time Taken.
3. **Smart Date Propagation**: If a log sheet has a partial date like `22/4` below a full date `22/4/26`, the backend automatically completes the year context to prevent validation failures.
4. **Deterministic Validation**: Python rules validate values like machine code formatting (`MC-XXX`), work order duplicates, and correct shift numbers (`I`, `II`, `III`).
5. **UI Review Form**: Allows manual correction of low-confidence fields with color-coded confidence bars.
6. **AI Chat Assistant**: Ask questions about records using plain English in the Chat tab.
7. **Export to CSV/Excel**: Clean export buttons that style and highlight erroneous rows.
