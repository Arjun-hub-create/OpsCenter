import os
import re
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from database import uploads, records
from services.gemini_service import extract_from_image
from services.groq_service import validate_record as groq_validate, detect_anomalies, generate_correction_suggestion
from services.validation_service import run_all_validations
from services.anomaly_service import run_anomaly_checks
import json


# ── Dash/nil characters that represent "no value" in handwritten docs ──
_DASH_CHARS = {"—", "–", "-", "−", "~", "nil", "n/a", "na", "none", "null"}


def _clean_quantity(field_data: dict) -> dict:
    """If OCR read a dash as '-1' or similar, normalise to None (intentionally blank)."""
    if not isinstance(field_data, dict):
        return field_data
    val = field_data.get("value")
    if val is not None:
        raw = str(val).strip().lower()
        if raw in _DASH_CHARS or raw == "-1":
            field_data["value"] = None
            field_data["confidence"] = max(field_data.get("confidence", 0), 0.3)
    return field_data

router = APIRouter()

FIELD_NAMES = ["date", "shift", "employee_number", "operation_code",
               "machine_number", "work_order_number", "quantity_produced", "time_taken"]


def _serialize_record(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
        doc["created_at"] = doc["created_at"].isoformat()
    if "review_time" in doc and doc["review_time"] and hasattr(doc["review_time"], "isoformat"):
        doc["review_time"] = doc["review_time"].isoformat()
    return doc


@router.post("/extract/{upload_id}")
async def extract_record(upload_id: str):
    try:
        upload_doc = await uploads.find_one({"_id": ObjectId(upload_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload ID")
    if not upload_doc:
        raise HTTPException(status_code=404, detail="Upload not found")

    file_path = upload_doc.get("file_path", "")
    mime_type = upload_doc.get("file_type", "image/jpeg")

    file_base64 = upload_doc.get("file_base64")
    if file_base64:
        import base64
        try:
            image_bytes = base64.b64decode(file_base64)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to decode stored file: {e}")
    else:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        try:
            with open(file_path, "rb") as f:
                image_bytes = f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file from disk: {e}")

    # Gemini OCR extraction
    extracted = await extract_from_image(image_bytes, mime_type)
    raw_text = extracted.get("raw_text", "")
    rows = extracted.get("rows", [])

    if not rows:
        # Fallback to a single empty row if no rows were extracted
        rows = [{f: {"value": None, "confidence": 0.0} for f in FIELD_NAMES}]

    # Delete existing records for this upload to prevent duplicates
    await records.delete_many({"upload_id": upload_id})

    # ── Date Context Propagation ──
    # If some rows have complete dates (e.g. 22/4/26) and others have partial dates (e.g. 22/4),
    # propagate the year format so they validate correctly.
    last_complete_year = None
    for r in rows:
        dt_val = r.get("date", {}).get("value") if isinstance(r.get("date"), dict) else r.get("date")
        if dt_val:
            dt_str = str(dt_val).strip()
            # Match 3-part date (e.g. DD/MM/YY or YYYY-MM-DD or DD-MM-YY)
            m = re.match(r"^(\d{1,4})([/\-\.])(\d{1,2})\2(\d{2,4})$", dt_str)
            if m:
                part1, sep, part2, part3 = m.group(1), m.group(2), m.group(3), m.group(4)
                if len(part1) == 4:
                    last_complete_year = part1
                else:
                    last_complete_year = part3
                break

    if not last_complete_year and raw_text:
        # Look for a 3-part date in the raw text
        m_txt = re.search(r"\b(\d{1,2})([/\-\.])(\d{1,2})\2(\d{2,4})\b", raw_text)
        if m_txt:
            part1, sep, part2, part3 = m_txt.group(1), m_txt.group(2), m_txt.group(3), m_txt.group(4)
            if len(part1) == 4:
                last_complete_year = part1
            else:
                last_complete_year = part3
        else:
            # Fallback to current year's last 2 digits (e.g. "26")
            from datetime import datetime as dt
            last_complete_year = str(dt.now().year)[2:]

    if last_complete_year:
        for r in rows:
            dt_data = r.get("date")
            if isinstance(dt_data, dict):
                dt_val = dt_data.get("value")
                if dt_val:
                    dt_str = str(dt_val).strip()
                    # Check if it is a 2-part date (e.g., DD/MM or D/M)
                    m_partial = re.match(r"^(\d{1,2})([/\-\.])(\d{1,2})$", dt_str)
                    if m_partial:
                        sep = m_partial.group(2)
                        dt_data["value"] = f"{dt_str}{sep}{last_complete_year}"
            elif dt_data:
                dt_str = str(dt_data).strip()
                m_partial = re.match(r"^(\d{1,2})([/\-\.])(\d{1,2})$", dt_str)
                if m_partial:
                    sep = m_partial.group(2)
                    r["date"] = f"{dt_str}{sep}{last_complete_year}"

    from datetime import datetime
    inserted_records = []

    for idx, row in enumerate(rows):
        # Build record document for this row
        record_doc = {
            "upload_id": upload_id,
            "raw_text": raw_text,
            "validation_errors": [],
            "anomaly_flags": [],
            "reviewed": False,
            "review_time": None,
            "audit_trail": [],
        }
        for field in FIELD_NAMES:
            record_doc[field] = row.get(field, {"value": None, "confidence": 0.0})

        # Normalise shift value to canonical Roman numerals
        from services.validation_service import normalize_shift
        shift_data = record_doc.get("shift", {})
        if isinstance(shift_data, dict):
            raw_shift = shift_data.get("value")
            norm_shift = normalize_shift(raw_shift)
            if norm_shift:
                shift_data["value"] = norm_shift

        # Clean up OCR artifacts: dashes misread as "-1" in quantity
        record_doc["quantity_produced"] = _clean_quantity(record_doc.get("quantity_produced", {}))

        # Python validation
        py_errors = await run_all_validations(record_doc)
        error_messages = [f"{e['field']}: {e['message']}" for e in py_errors]

        # NOTE: Groq AI validation removed — it produced unreliable false positives
        # (e.g. "shift should be A/B/C" when I/II/III is correct, "quantity 10 invalid").
        # Only deterministic Python validation is used for errors now.
        # Groq AI is still used for anomaly detection below (informational flags).

        # Anomaly detection
        anomaly_flags = await run_anomaly_checks(record_doc)

        # Historical avg for Groq anomaly check
        try:
            from services.anomaly_service import get_historical_averages
            hist_avg = await get_historical_averages()
            groq_anomalies = await detect_anomalies(record_doc, hist_avg)
            if isinstance(groq_anomalies, list):
                anomaly_flags.extend(groq_anomalies)
        except Exception as e:
            print(f"[Extract] Groq anomaly skipped: {e}")

        record_doc["validation_errors"] = list(set(error_messages))
        record_doc["anomaly_flags"] = list(set(anomaly_flags))

        # Auto-correction suggestions for low-confidence fields
        suggestions = {}
        for field in FIELD_NAMES:
            field_data = record_doc.get(field, {})
            if isinstance(field_data, dict) and field_data.get("confidence", 1.0) < 0.5:
                try:
                    suggestion = await generate_correction_suggestion(field, field_data.get("value"))
                    if suggestion:
                        suggestions[field] = suggestion
                except Exception:
                    pass
        record_doc["suggestions"] = suggestions
        record_doc["created_at"] = datetime.utcnow()

        # Insert this record
        result = await records.insert_one(record_doc)
        record_doc["_id"] = result.inserted_id
        inserted_records.append(record_doc)

    # Update upload status
    await uploads.update_one({"_id": ObjectId(upload_id)}, {"$set": {"status": "extracted"}})

    return _serialize_record(inserted_records[0])


@router.get("/extract/{upload_id}")
async def get_extraction(upload_id: str):
    record = await records.find_one({"upload_id": upload_id})
    if not record:
        raise HTTPException(status_code=404, detail="No extraction found for this upload")
    return _serialize_record(record)
