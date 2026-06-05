# My AI-Assisted Development Workflow (AI_WORKFLOW.md)

Hey! This document details the step-by-step sequence of how I leveraged AI tools to build this project from start to finish. I used AI to accelerate my workflow—scaffolding directories, writing complex CSS animation keyframes, and drafting API endpoints—while keeping full control of the core architecture, data cleaning, and database schemas.

---

## 📅 The Step-by-Step AI Workflow Sequence

Here is the sequential workflow of how this project was developed:

### Phase 1: Planning and Scaffolding
1. **Directory Structure**: I asked the AI coding assistant to suggest a clean repository structure for a FastAPI + React (Vite) monorepo. This helped organize the code into `backend/` and `frontend/` folders.
2. **Futuristic HUD UI Design**: I wanted to build a premium dark-themed HUD layout with scanner animations, blink indicators, and grid lines. 
   - *How AI assisted*: Since coding raw keyframes and complex box-shadow neon glows from scratch takes a lot of time, I had the AI generate the CSS variables and base keyframes for elements like `.blink-dot` and `.progress-fill`. I then integrated these into `frontend/src/index.css` to build the components.
3. **Component Layout**: The AI drafted the shell structure for our React pages (`DashboardPage`, `UploadPage`, `HistoryPage`, `ReviewPage`).

---

### Phase 2: Ingestion & Gemini Vision OCR Integration
1. **Setting the Vision Prompt**: In `backend/services/gemini_service.py`, I wrote a detailed system prompt (`EXTRACTION_PROMPT`) to instruct Gemini 1.5 Flash to look at the uploaded image/PDF and return a structured JSON array.
   - *Prompting Strategy*: The model is instructed to output exact fields along with a confidence rating between 0.0 and 1.0. I added strict rules: `"Return ONLY a valid JSON object. No explanations, no markdown fences."` to avoid syntax errors when using `json.loads()`.
2. **Fallback Vision Layer**: I had the AI write an async fallback mechanism. If the Gemini API fails or hits rate limits, the system automatically redirects the image bytes to Groq Vision (`extract_via_groq_vision`) using a Llama model.

---

### Phase 3: Validation Refactoring (From AI to Python Rules)
1. **AI Validation Issues**: Originally, I set up a Groq LLM endpoint (`validate_record`) to check for errors. However, the AI was too unpredictable for strict business logic—it hallucinated validation errors on valid quantities (e.g. saying quantity `10` is invalid) and threw errors for our Roman numeral shifts (`I`, `II`, `III`).
2. **The Refactored Sequence**: I decided to separate validation concerns:
   - **Errors Pipeline (Deterministic)**: I wrote a Python rules engine in `backend/services/validation_service.py` to handle all hard errors (regex checking machine codes like `MC-XXX`, datetime parsing for dates, MongoDB checks for duplicate work orders).
   - **Anomaly Pipeline (Heuristics + AI)**: I kept Groq Llama active for semantic anomaly checks (e.g. flagging if an employee has lower than average production quantity) and for the natural language chat assistant.

---

### Phase 4: Advanced Edge Case Debugging
During manual integration testing, I found several OCR limitations and fixed them programmatically:

1. **Date Year Context Propagation**:
   - *Problem*: In handwritten logs, operators often write a complete date on the first row (e.g. `22/4/26`) but only write partial dates like `22/4` on subsequent rows. The standard date validator rejected `22/4` for missing the year.
   - *My Fix*: I implemented a propagation loop in `extraction.py`. Before validation runs, the backend identifies the first complete year in the document (or falls back to the raw OCR text or current year) and appends it to any partial date strings, converting `22/4` -> `22/4/26`.
2. **OCR Dash Artifact Cleaning**:
   - *Problem*: Empty cells containing dashes `—` or `nil` were misread by the OCR vision model as `-1`.
   - *My Fix*: I wrote `_clean_quantity` in `extraction.py` to map these misreads to `None` before validation.
3. **Roman Numeral Shifts**:
   - *Problem*: The UI expected A/B/C shifts, but sheets commonly use `1, 2, 3` or `I, II, III`.
   - *My Fix*: I normalized all inputs in the validation service (`normalize_shift`) to canonical Roman numerals and updated the frontend chart and page filters accordingly.

---

### Phase 5: DB Cleaning and Bootstrapping
1. **Re-validation Script**: I wrote and executed `revalidate_existing.py` in my scratch directory to loop through existing database records, run the new year propagation, and overwrite validation errors with clean results.
2. **Verification**: Verified that both the backend FastAPI server on port 8000 and the Vite frontend on port 5173 start up and hot-reload cleanly.
