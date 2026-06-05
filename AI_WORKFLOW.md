# My AI-Assisted Development Workflow (AI_WORKFLOW.md)

Hey! This document explains the exact step-by-step sequence of how I used AI to build this project from scratch, including my prompting workflow, debugging cycles, and the areas where I had to step in and code manually.

---

## 📅 The Step-by-Step AI Workflow Sequence

Here is the actual sequence of how I built this project using AI:

### Phase 1: Project Setup & HUD UI Design (AI-Scaffolded)
1. **Folder Setup**: I asked the AI coding assistant to scaffold a clean folder layout for a FastAPI backend and a React (Vite) frontend.
2. **Futuristic HUD CSS**: I wanted the page to look like a premium sci-fi operation screen, but my CSS skills are pretty basic. 
   - *How AI helped*: I asked the AI to generate a CSS design system with CSS variables for neon green, cyan, and deep blues. It wrote the animations for the "blink dots", warning borders, scanlines, and neon glow effects.
3. **Core Pages**: The AI helped me scaffold the main pages: `DashboardPage`, `UploadPage`, `HistoryPage`, and `ReviewPage`.

---

### Phase 2: Gemini 1.5 Flash OCR Extraction (Vision Prompting)
1. **The Vision Prompt**: I needed to send uploaded images to Gemini 1.5 Flash and get back structured data. I wrote the prompt in `gemini_service.py`.
   - *Prompting Strategy*: I asked Gemini to identify table rows and output a strict JSON format containing the fields (date, shift, emp no, machine no, work order, qty, time) and a confidence score.
2. **Fallback Logic**: I prompted the AI to write a fallback wrapper: if Gemini Flash fails (or hits API limits), it falls back to Groq Vision using a Llama model.

---

### Phase 3: The Validation Battle (AI vs. Manual Rules)
1. **Initial Groq Validation**: Initially, I set up a Groq API route (`validate_record`) to check if the extracted fields were valid.
2. **The Halucination Problem**: When I ran tests, the AI validator kept throwing fake errors! It flagged a quantity of `10` as invalid (even though my range was 1 to 10000) and complained that the shift format wasn't `A/B/C`.
3. **Refactoring the Sequence**: I decided that AI shouldn't handle strict data validation. I prompted the AI to help me write a pure, deterministic Python rules engine in `validation_service.py` using regex and datetime libraries. I moved Groq AI completely out of the "errors list" pipeline and kept it only for anomaly checks (like checking if an employee is working on too many machines) and the Q&A Chat.

---

### Phase 4: Advanced Debugging (The Manual Fixes)
This is the sequence of manual fixes I wrote to make the OCR and validation work perfectly on real handwritten documents:

1. **Date Year Context Propagation**: 
   - *Problem*: The OCR read partial dates like `22/4` when they were written under a header row containing `22/4/26`. The validator rejected `22/4` because it lacked a year.
   - *My Fix*: I wrote a Python loop in `extraction.py` that checks for complete dates. If it finds a partial date (`22/4`), it automatically extracts the year (`26`) from the first row (or raw text) and appends it to form a valid complete date (`22/4/26`).
2. **Handling OCR Dash Artifacts**:
   - *Problem*: Dashes `—` in quantity columns representing "zero made" were misread by Gemini as `-1`.
   - *My Fix*: I wrote a utility `_clean_quantity` in `extraction.py` to normalise `-1` and dashes to `None` before the validation check runs.
3. **Roman Numeral Shifts**:
   - *Problem*: The shop floor sheets write shifts as `1, 2, 3` or `I, II, III`. The original frontend was expecting `A, B, C`.
   - *My Fix*: I modified the backend validation to accept all formats and canonicalise them to `I, II, III`. I manually updated the frontend components (`ShiftChart`, `HistoryPage` filters, `AiChat` examples) to display Roman numerals.

---

### Phase 5: Database Migration & Verification
1. **Re-validation Script**: Since the MongoDB database already had old records with garbage validation errors, I created and executed a script `revalidate_existing.py` to clean them up.
2. **Final Verification**: I booted up the uvicorn and Vite servers, uploaded the test image, and verified that all validation errors vanished and the data rendered cleanly!

---

## 💡 Prompting & Debugging Tips That Worked For Me

- **Temperature settings**: I set the temperature to `0.1` in all Groq tasks (validation, anomalies) to keep the responses as factual and consistent as possible.
- **Strict JSON formats**: When asking the AI service to output JSON, I always include a mockup structure in the system prompt and explicitly add `"Return ONLY a valid JSON array. No explanations."` to prevent the model from adding friendly conversational text around the JSON.
- **Handling False Positives**: Always run a post-filtering pass in Python (e.g. `_is_real_error()`) to strip out informational messages like *"No errors found"* which the AI occasionally includes in its response list.
