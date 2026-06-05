# OpsCenter AI — Precise System Architecture & Code Map

This document describes the complete working of the OpsCenter AI project from beginning to end, mapping every core functionality in sequence. It details the connection between the React (Vite) frontend and the FastAPI (Python) backend, specifying the folder names, file names, functions, exact line numbers, and code snippets.

---

## 📂 Project Structure Directory Map

```
opscenter/
├── backend/
│   ├── main.py              # FastAPI startup & router inclusions
│   ├── config.py            # Environment configurations (API keys & upload paths)
│   ├── database.py          # MongoDB client connection details
│   ├── routes/              # FastAPI controllers (routing layer)
│   │   ├── upload.py        # File ingestion & upload tracking
│   │   ├── extraction.py    # OCR triggers, date propagation, & record saving
│   │   ├── records.py       # Manual reviews, audit trail, exports (CSV/Excel)
│   │   ├── dashboard.py     # MongoDB aggregate charts & stats
│   │   └── chat.py          # Groq AI chat routing
│   └── services/            # Core business & AI logic
│       ├── gemini_service.py     # Gemini Flash 1.5 Vision OCR service
│       ├── groq_service.py       # Llama 3.3 chat, suggestions, & anomaly logic
│       ├── validation_service.py # Deterministic Python rules engine
│       └── anomaly_service.py    # Statistical outlier calculations
└── frontend/
    ├── index.html           # Single Page Application root
    ├── src/
    │   ├── api.js           # Central Axios HTTP client definitions
    │   ├── index.css        # Global CSS dark HUD design system
    │   ├── pages/           # Page controllers (views)
    │   │   ├── UploadPage.jsx
    │   │   ├── ReviewPage.jsx
    │   │   ├── HistoryPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   └── ChatPage.jsx
    │   └── components/      # Reusable widgets
    │       ├── Upload/      # DropZone & UploadHistory
    │       ├── Extraction/  # ConfidenceBar & ExtractionPanel
    │       ├── Review/      # ReviewForm
    │       └── Dashboard/   # ShiftChart & MachineTable
```

---

## 🔌 Frontend-Backend Connection Details

The connection between the React client and the FastAPI server is established via three configuration points:

### 1. Vite Development Proxy Configuration
* **Folder/File**: [frontend/vite.config.js](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/frontend/vite.config.js)
* **Line 6-12**: Maps the frontend dev server (`http://localhost:5173`) proxy targets:
  ```javascript
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    }
  }
  ```
  This automatically redirects any frontend AJAX request starting with `/api` or static image query starting with `/uploads` to the FastAPI backend running on port `8000` without triggering CORS browser blocks.

### 2. FastAPI Cross-Origin Resource Sharing (CORS) Middleware
* **Folder/File**: [backend/main.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/main.py)
* **Line 16-22**: Defines backend security configurations allowing origins to connect:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  This white-lists the Vite frontend server origins to resolve standard browser cross-origin requests.

### 3. Backend Static Upload Files Mount
* **Folder/File**: [backend/main.py](file:///c:/Users/arjun/Downloads/Documents/opscenter/opscenter/backend/main.py)
* **Line 26**: Connects static file storage serving:
  ```python
  app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
  ```
  This mounts the local backend disk folder `uploads` to the network endpoint `/uploads`, allowing the frontend React images and PDF iframes (e.g. inside `ExtractionPanel.jsx`) to directly request and display uploaded document previews.

---

## ⚙️ Detailed Execution Sequence (17 Functional Flows)

---

### Flow 1: Document Upload Ingestion
* **Frontend Controller**: `frontend/src/components/Upload/DropZone.jsx`
  - **Line 45**: `const result = await uploadFile(fd, setProgress)` compiles the selected image/PDF into `FormData` and posts it.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 17–21**: `uploadFile` maps the upload to `POST /upload`.
* **Backend Endpoint**: `backend/routes/upload.py`
  - **Line 30**: `@router.post("/upload")` receives the file.
  - **Line 42**: `async with aiofiles.open(file_path, "wb") as f:` saves the physical document to the `backend/uploads/` folder.
  - **Line 54**: `result = await uploads.insert_one(doc)` inserts the record with `"status": "pending"` into the MongoDB `uploads` collection.

---

### Flow 2: Upload History List
* **Frontend Controller**: `frontend/src/components/Upload/UploadHistory.jsx`
  - **Line 19**: `const data = await getUploads(1, 30)` loads recent documents on mount.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 29–30**: `getUploads` triggers `GET /uploads`.
* **Backend Endpoint**: `backend/routes/upload.py`
  - **Line 87–95**: `get_uploads()` queries the MongoDB `uploads` collection, sorting by `upload_time` descending (`uploads.find({}).sort("upload_time", -1)`).

---

### Flow 3: Delete Upload & Clean Up Records
* **Frontend Controller**: `frontend/src/components/Upload/UploadHistory.jsx`
  - **Line 46**: `await deleteUpload(uploadId)` triggers deletion of the whole upload group.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 76**: `deleteUpload` triggers `DELETE /uploads/{id}`.
* **Backend Endpoint**: `backend/routes/upload.py`
  - **Line 109**: `@router.delete("/uploads/{upload_id}")`
  - **Line 124**: `os.remove(file_path)` deletes the physical JPEG/PNG/PDF file from the disk.
  - **Line 129**: `await uploads.delete_one({"_id": oid})` deletes the upload record.
  - **Line 132**: `await records.delete_many({"upload_id": upload_id})` purges all parsed rows from MongoDB.

---

### Flow 4: OCR Extraction Request
* **Frontend Controller**: `frontend/src/pages/UploadPage.jsx`
  - **Line 19**: `await extractRecord(upload.id)` triggers right after a file is uploaded.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 34–35**: `extractRecord` triggers `POST /extract/{upload_id}`.
* **Backend Endpoint**: `backend/routes/extraction.py`
  - **Line 44**: `@router.post("/extract/{upload_id}")`
  - **Line 63**: `extracted = await extract_from_image(image_bytes, mime_type)` calls the vision models.

---

### Flow 5: Google Gemini 1.5 Flash Vision OCR
* **Backend Service**: `backend/services/gemini_service.py`
  - **Line 66**: `async def extract_from_image(image_bytes, mime_type)`
  - **Line 73**: `response = gemini_model.generate_content([EXTRACTION_PROMPT, image_part])` uses Gemini Flash to read the handwriting.
  - **Line 86**: `extract_via_groq_vision(...)` serves as the fallback if Gemini hits rate limits.

---

### Flow 6: Date Context Propagation (Edge Cases)
Handles partial dates like `22/4` by copying the year `26` from elsewhere on the page.
* **Backend Processor**: `backend/routes/extraction.py`
  - **Line 74–90**: Loops through all extracted rows to find the first complete 3-part date and extracts the year.
  - **Line 92–104**: If not found in rows, searches the raw OCR text for a year, defaulting to the current year.
  - **Line 106–123**: Loops back through all rows, appending the year context to any partial 2-part dates (e.g. `22/4` $\rightarrow$ `22/4/26`) so they pass date-format parsing.

---

### Flow 7: OCR Dash Artifact Cleaning
* **Backend Processor**: `backend/routes/extraction.py`
  - **Line 143**: `record_doc["quantity_produced"] = _clean_quantity(...)` cleans field data.
  - **Line 17–27**: `_clean_quantity()` converts values like `"-1"` (common misread of dashes in handwritten tables) to `None`, indicating blank production.

---

### Flow 8: Deterministic Validation Rules
* **Backend Service**: `backend/services/validation_service.py`
  - **Line 194**: `async def run_all_validations(record, exclude_id)` runs Python rules:
    - **Line 54**: `validate_date()` checks formats like `DD/MM/YY` against `DATE_FORMATS` list.
    - **Line 83**: `validate_shift()` maps raw input like `"1"` or `"A"` to canonical Roman numerals `"I"`, `"II"`, `"III"`.
    - **Line 97**: `validate_machine_code()` enforces formatting using regex pattern `MC-\d{2,4}`.
    - **Line 126**: `validate_quantity()` validates numeric boundaries ($1 \le Q \le 10000$).
    - **Line 180**: `check_duplicate_work_order()` checks MongoDB collection `records` for duplicates.

---

### Flow 9: Anomaly Detection Checks
* **Backend Service**: `backend/services/anomaly_service.py`
  - **Line 155 in `extraction.py`**: Calls `run_anomaly_checks(record_doc)`.
  - Checks if quantity is $>3\times$ the historical average of the shift, or if an employee is booked on 3+ machines.
* **Groq AI Service**: `backend/services/groq_service.py`
  - **Line 109**: `async def detect_anomalies(record_dict, historical_avg)` asks Groq Llama 3.3 to flag semantic irregularities against historical metrics.

---

### Flow 10: Auto-Correction suggestions
* **Backend Service**: `backend/services/groq_service.py`
  - **Line 83**: `async def generate_correction_suggestion(field_name, value)`
  - Triggered in `extraction.py` line 176 for fields with low confidence ($<0.5$). Groq returns a correction recommendation displayed in the Review Form.

---

### Flow 11: DB Record Saving
* **Backend Processor**: `backend/routes/extraction.py`
  - **Line 185**: `result = await records.insert_one(record_doc)` saves the validated document.
  - **Line 190**: `await uploads.update_one({"_id": ObjectId(upload_id)}, {"$set": {"status": "extracted"}})` marks the document status as extracted.

---

### Flow 12: Loading Records for Manual Review
* **Frontend Controller**: `frontend/src/pages/ReviewPage.jsx`
  - **Line 28**: `const res = await getRecords({ upload_id: uploadId, limit: 100 })` fetches all rows associated with the document.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 40–41**: `getRecords` triggers `GET /records`.
* **Backend Endpoint**: `backend/routes/records.py`
  - **Line 37–73**: `get_records()` filters and returns matching records.

---

### Flow 13: Manual Edit & Form Saving (With Audit Logs)
* **Frontend Controller**: `frontend/src/components/Review/ReviewForm.jsx`
  - **Line 49**: `const updated = await updateRecord(record.id, form)` posts manual changes.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 45–46**: `updateRecord` triggers `PUT /records/{id}`.
* **Backend Endpoint**: `backend/routes/records.py`
  - **Line 175**: `@router.put("/records/{record_id}")` receives the payload.
  - **Line 189–202**: Audits changes. If a value differs from DB, creates an audit log entry in `audit_entries`.
  - **Line 206**: `py_errors = await run_all_validations(merged, exclude_id=record_id)` re-runs validations on edited data.
  - **Line 218**: `await records.update_one({"_id": oid}, {"$set": update_fields})` updates the DB.

---

### Flow 14: History Records Table
* **Frontend Page**: `frontend/src/pages/HistoryPage.jsx`
  - **Line 34**: `const data = await getRecords(params)` queries records using search, shift, and status filters.
* **Backend Endpoint**: `backend/routes/records.py`
  - **Line 37–73**: `get_records()` returns filter queries and handles pagination skip limits.

---

### Flow 15: AI Chat Q&A Interaction
* **Frontend Component**: `frontend/src/components/Chat/AiChat.jsx`
  - **Line 48**: `const data = await sendChatMessage(msg)` posts a message.
* **Axios API Client**: `frontend/src/api.js`
  - **Line 51–52**: `sendChatMessage` maps to `POST /chat`.
* **Backend Endpoint**: `backend/routes/chat.py`
  - **Line 19**: `@router.post("/chat")`
  - **Line 27**: `async for doc in records.find({}).sort("created_at", -1).limit(100)` fetches the last 100 records to build the AI's training context.
  - **Line 43**: `response = await chat_with_records(message, records_context)` sends the request to the Groq service.

---

### Flow 16: Dashboard Statistics & Chart Feeds
* **Frontend Page**: `frontend/src/pages/DashboardPage.jsx`
  - **Line 17**: `const data = await getDashboardStats()` fetches charts and aggregates.
* **Backend Endpoint**: `backend/routes/dashboard.py`
  - **Line 8**: `@router.get("/dashboard/stats")`
  - **Line 18–31**: Runs MongoDB aggregate pipeline `records.aggregate(...)` to group and count shift totals.
  - **Line 34–54**: Groups machine stats and computes failure rates.
  - **Line 57–63**: Runs daily upload metrics for the past 7 days.

---

### Flow 17: CSV and Excel Exports
* **Frontend Page**: `frontend/src/pages/HistoryPage.jsx`
  - **Line 55**: Calls `exportCSV()`.
  - **Line 61**: Calls `exportExcel()`.
* **Backend Endpoint**: `backend/routes/records.py`
  - **Line 76**: `@router.get("/records/export/csv")` writes records to a CSV string and streams it back.
  - **Line 110**: `@router.get("/records/export/excel")` uses `openpyxl` to build and stream color-coded Excel sheets.
