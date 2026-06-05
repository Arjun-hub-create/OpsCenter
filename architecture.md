# OpsCenter AI — System Architecture & Data Flow

This document maps out the end-to-end data flow of the project. It describes exactly what happens when a document is uploaded, how the AI extracts it, how validations and date context propagation are run, how database records are updated during manual review, and lists the exact folder names, file names, functions, and line numbers.

---

## 🗺️ System Data Flow Overview

```
[Browser UI: DropZone] --(File Upload)--> [FastAPI: /upload] --> Save to disk & MongoDB Uploads
                                                │
[Browser UI: UploadPage] --(Extract Req)--> [FastAPI: /extract/{id}]
                                                │
                                                ▼ (gemini_service.py)
                                        [Gemini 1.5 OCR Vision] -> returns raw JSON
                                                │
                                                ▼ (extraction.py)
                                        [Date Context Propagation] (completes short dates like 22/4 -> 22/4/26)
                                                │
                                                ▼ (extraction.py)
                                        [_clean_quantity] (normalizes dashes and -1 to None)
                                                │
                                                ▼ (validation_service.py)
                                        [Python Validation Rules] -> normalizes shift (1 -> I), validates formats
                                                │
                                                ▼ (groq_service.py / anomaly_service.py)
                                        [Groq AI Anomaly Checks & Auto-Correct suggestions]
                                                │
                                                ▼
                                        Save to MongoDB Records collection
                                                │
[Browser UI: ReviewForm] --(Save Form)--> [FastAPI: /records/{id}] -> Re-run Validation & Update DB
```

---

## 🛠️ Step-by-Step Execution Sequence

Here is the exact code sequence for every phase of the project:

### 1. Document Upload & Ingestion
* **Trigger Point (Frontend)**:
  - **Folder/File**: [frontend/src/components/Upload/DropZone.jsx](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/components/Upload/DropZone.jsx)
  - **Function**: Uses Axios to POST the document file.
* **API Client Mapping**:
  - **Folder/File**: [frontend/src/api.js](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/api.js)
  - **Line 17**: `export const uploadFile = (formData, onProgress) => api.post('/upload', formData, ...)` maps the UI request to the backend `/api/upload` endpoint.
* **Ingestion Route (Backend)**:
  - **Folder/File**: [backend/routes/upload.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/upload.py)
  - **Line 30**: `@router.post("/upload")` defines the endpoint.
  - **Line 41**: Reads the incoming file content.
  - **Line 42**: Saves the file under a unique UUID string into the `backend/uploads/` directory on disk.
  - **Line 45-54**: Inserts a new upload record in the MongoDB `uploads` collection containing `filename`, `stored_name` (UUID), `file_type`, `size_bytes`, and status `"pending"`.
  - **Line 56**: Returns a `201 Created` JSON payload containing the upload ID.

---

### 2. OCR OCR Extraction
* **Trigger Point (Frontend)**:
  - **Folder/File**: [frontend/src/pages/UploadPage.jsx](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/pages/UploadPage.jsx)
  - **Line 14**: `handleUploaded` triggers immediately after the upload completes, calling the extraction API.
* **API Client Mapping**:
  - **Folder/File**: [frontend/src/api.js](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/api.js)
  - **Line 34**: `export const extractRecord = uploadId => api.post(\`/extract/\${uploadId}\`)` sends the request.
* **OCR Route (Backend)**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 44**: `@router.post("/extract/{upload_id}")` defines the extraction controller.
  - **Line 47**: Retrieves the upload document from MongoDB (`uploads` collection).
  - **Line 63**: `extracted = await extract_from_image(image_bytes, mime_type)` executes the AI OCR query.
* **Gemini Service**:
  - **Folder/File**: [backend/services/gemini_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/gemini_service.py)
  - **Line 66**: `async def extract_from_image(image_bytes, mime_type)` constructs the prompt (`EXTRACTION_PROMPT` at line 22) demanding structured JSON with fields, raw text, and confidence scores, and calls the Google Gemini API.

---

### 3. Year Context Propagation
To handle handwritten shortcuts where later rows omit the year (e.g., date written as `22/4` below a full row showing `22/4/26`), the backend propagates the year context *before* running validations.
* **Processing logic**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 74-90**: Loops through the Gemini extracted rows to identify the first complete 3-part date (e.g., `22/4/26` or `2026-04-22`) and captures the year (e.g. `26` or `2026`).
  - **Line 92-104**: If no row has a year, it falls back to scanning the `raw_text` for any complete date strings, or defaults to the last two digits of the current year (e.g., `"26"`).
  - **Line 106-123**: Loops back through all rows. If a row has a partial 2-part date (e.g., `22/4` matching `^\d{1,2}/\d{1,2}$`), it appends the separator and the year to make it complete (e.g., `22/4/26`), allowing it to pass parsing.

---

### 4. Cleanup & Data Validation Pipeline
* **Quantity Normalisation**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 143**: `record_doc["quantity_produced"] = _clean_quantity(...)` normalises dash artifacts.
  - **Line 17-27**: `_clean_quantity` takes values like `"-1"` (common OCR misread of a dash `—` in empty quantity cells) or `nil` and converts them to `None`.
* **Deterministic Rules Engine**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 146**: `py_errors = await run_all_validations(record_doc)` runs the rules pipeline.
  - **Folder/File**: [backend/services/validation_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/validation_service.py)
  - **Line 194**: `async def run_all_validations(record, exclude_id)` executes validation rules:
    - **Line 54 (`validate_date`)**: Checks if date parses against `DATE_FORMATS` after zero-padding.
    - **Line 83 (`validate_shift`)**: Validates shift inputs. normalizes shifts like `"1"` or `"A"` to canonical Roman numerals `"I"`, `"II"`, `"III"`.
    - **Line 97 (`validate_machine_code`)**: Checks if machine number matches `MC-XXX` (2-4 digits, case-insensitive, ignores spaces).
    - **Line 126 (`validate_quantity`)**: Checks that quantity is a number between 1 and 10000. Treats dashes or blank fields as valid zero production.
    - **Line 156 (`validate_work_order`)**: Ensures work order number is present.
    - **Line 163 (`validate_time_taken`)**: Verifies time is a number between 0.1 and 24 hours.
    - **Line 180 (`check_duplicate_work_order`)**: Queries MongoDB collection `records` to ensure no other document already has this work order number.

---

### 5. Anomaly Detection & AI Suggestions
* **Rules Anomaly Checks**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 155**: `anomaly_flags = await run_anomaly_checks(record_doc)` calls basic anomaly calculations in [backend/services/anomaly_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/anomaly_service.py) (e.g. quantity spikes compared to historical shift averages).
* **Groq AI Anomaly Checks**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 161**: `groq_anomalies = await detect_anomalies(record_doc, hist_avg)` queries Groq Llama-3.3.
  - **Folder/File**: [backend/services/groq_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/groq_service.py)
  - **Line 109**: `async def detect_anomalies(record_dict, historical_avg)` performs semantic comparisons.
* **Auto-Correction Suggestions**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 176**: `generate_correction_suggestion(field, ...)` is called for low-confidence OCR fields.
  - **Folder/File**: [backend/services/groq_service.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/services/groq_service.py)
  - **Line 83**: `generate_correction_suggestion()` provides single-word replacement suggestions.

---

### 6. Persistence & Client Response
* **Database Save**:
  - **Folder/File**: [backend/routes/extraction.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/extraction.py)
  - **Line 185**: `result = await records.insert_one(record_doc)` saves the record to the `records` collection.
  - **Line 190**: Updates the upload document status in `uploads` collection to `"extracted"`.
  - **Line 192**: Returns the serialised record to the frontend (which handles navigation to `/review/{upload_id}`).

---

### 7. Manual Review & Records Update
When the user edits values in the Review page and clicks "Save Record":
* **Trigger Point (Frontend)**:
  - **Folder/File**: [frontend/src/components/Review/ReviewForm.jsx](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/components/Review/ReviewForm.jsx)
  - **Function**: Collects modified form input values and submits.
* **API Client Mapping**:
  - **Folder/File**: [frontend/src/api.js](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/src/api.js)
  - **Line 45**: `export const updateRecord = (id, data) => api.put(\`/records/\${id}\`, data)` triggers the PUT request.
* **Backend Update Route**:
  - **Folder/File**: [backend/routes/records.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/routes/records.py)
  - **Line 175**: `@router.put("/records/{record_id}")` receives the payload.
  - **Line 189-202**: Compares the incoming payload with existing fields in DB. If a field value changed, it logs an entry in `audit_entries` showing the field, original value, corrected value, and timestamp.
  - **Line 206**: `py_errors = await run_all_validations(merged, exclude_id=record_id)` re-evaluates deterministic validation rules using the new values.
  - **Line 210-216**: Marks the record as reviewed (`"reviewed": True`), sets `review_time`, and appends new audit trail entries to the `audit_trail` list.
  - **Line 218**: `await records.update_one({"_id": oid}, {"$set": update_fields})` commits the changes to MongoDB.
  - **Line 228**: Returns the updated record back to the React UI to update the table immediately.
