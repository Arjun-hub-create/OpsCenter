import json
from fastapi import APIRouter
from database import records
from services.groq_service import chat_with_records

router = APIRouter()

FIELD_NAMES = ["date", "shift", "employee_number", "operation_code",
               "machine_number", "work_order_number", "quantity_produced", "time_taken"]


def _get_field_val(record, field):
    f = record.get(field)
    if isinstance(f, dict):
        return f.get("value", "")
    return f or ""


@router.post("/chat")
async def chat(body: dict):
    message = body.get("message", "").strip()
    if not message:
        return {"response": "Please enter a message."}

    # Fetch last 100 records as context
    context_docs = []
    async for doc in records.find({}).sort("created_at", -1).limit(100):
        context_docs.append({
            "id": str(doc["_id"]),
            "date": _get_field_val(doc, "date"),
            "shift": _get_field_val(doc, "shift"),
            "employee": _get_field_val(doc, "employee_number"),
            "machine": _get_field_val(doc, "machine_number"),
            "work_order": _get_field_val(doc, "work_order_number"),
            "qty": _get_field_val(doc, "quantity_produced"),
            "time": _get_field_val(doc, "time_taken"),
            "errors": doc.get("validation_errors", []),
            "anomalies": doc.get("anomaly_flags", []),
            "reviewed": doc.get("reviewed", False),
        })

    records_context = json.dumps(context_docs, default=str)
    response = await chat_with_records(message, records_context)
    return {"response": response, "records_used": len(context_docs)}
