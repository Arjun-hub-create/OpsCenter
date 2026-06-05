# Technical Development & AI Integration Notes (AGENTS.md)

This document details the precise technical architecture, API prompts, and AI model configurations I used to build the OpsCenter AI system.

---

## ⚙️ Model Configurations & Services

### 1. Google Gemini 1.5 Flash (OCR & Data Extraction)
* **File Location**: [backend/services/gemini_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/gemini_service.py)
* **Model**: `gemini-1.5-flash`
* **MIME-Types Supported**: JPEG, PNG, WEBP, PDF, TIFF, GIF
* **Purpose**: Primary vision engine for parsing handwritten manufacturing logs.
* **Prompt Structure (`EXTRACTION_PROMPT`)**:
  - Demands strict JSON matching the schema of our Pydantic models.
  - Returns a `raw_text` string representing all visible characters on the page, and a `rows` array.
  - Each extracted field contains a `value` (string, float, or `null`) and a `confidence` score (float, `0.0` to `1.0`).

### 2. Groq (Llama-3.3-70b-versatile)
* **File Location**: [backend/services/groq_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/groq_service.py)
* **Model**: `llama-3.3-70b-versatile`
* **Temperature**: `0.1` (to ensure deterministic reasoning and avoid creative hallucinations).
* **Purposes**:
  1. **AI Chat Assistant** (`chat_with_records`): Answers natural language queries over database records by feeding the database context as JSON directly to the model.
  2. **AI Anomaly Detection** (`detect_anomalies`): Compares record values (like time taken and quantity) against historical shift averages.
  3. **Auto-Correction Suggestions** (`generate_correction_suggestion`): Provides corrections for low-confidence fields (<0.5) when rendering the Review form.

---

## 🛡️ Validation Architecture (Dual-Layer)

We split validation into a deterministic layer (for errors) and an AI/statistical layer (for warnings and anomalies). This prevents LLM hallucinations from creating false-positive error flags.

### Layer 1: Deterministic Rules Engine (Python)
* **File Location**: [backend/services/validation_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/validation_service.py)
* **Rules Executed**:
  - **Date format validation**: Supports `DD/MM/YY`, `DD/M/YY`, `DD/MM/YYYY`, etc.
  - **Shift canonicalization**: Maps raw input (A, B, C or 1, 2, 3) into Roman numerals `I`, `II`, `III`.
  - **Machine number check**: Case-insensitive regex matching pattern `MC-\d{2,4}` (with flexible spaces).
  - **Quantity boundaries**: Checks that values are numeric and fit within $1 \le \text{qty} \le 10000$.
  - **Duplicate Work Order detection**: Checks the database using MongoDB Atlas filters to ensure work order numbers are globally unique.
  - **Time taken check**: Ensures values fit within $0.1 \le \text{time} \le 24$ hours.

### Layer 2: AI & Statistical Anomalies (Groq & Services)
* **File Location**: [backend/services/anomaly_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/anomaly_service.py)
* **Rules Executed**:
  - **Quantity Spike check**: Flags records where quantity is $>3\times$ the historical shift average.
  - **Employee Overload check**: Flags if an employee is recorded working on 3 or more different machines during the same shift/day.
  - **Groq Semantic anomalies**: Flags contextual anomalies using the historical averages dictionary.

---

## 📈 Confidence Score Handling & UX Integration

Confidence scores are passed from the OCR service to the frontend:
* **High Confidence ($\ge 0.8$)**: Rendered in green, no warning borders.
* **Medium Confidence ($0.5$ to $0.8$)**: Rendered in orange, indicates minor character ambiguity.
* **Low Confidence ($< 0.5$)**: Rendered in red. Triggers a warning border on the Review Form and queries `groq_service.py` to display an inline suggestion box (*"Did you mean: X?"*).
