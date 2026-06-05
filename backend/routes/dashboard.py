from fastapi import APIRouter
from database import uploads, records
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/dashboard/stats")
async def get_stats():
    total_uploads = await uploads.count_documents({})
    total_records = await records.count_documents({})
    reviewed_count = await records.count_documents({"reviewed": True})
    pending_review = total_records - reviewed_count
    validation_failures = await records.count_documents({"validation_errors.0": {"$exists": True}})
    pass_rate = round(((total_records - validation_failures) / total_records * 100), 1) if total_records else 0.0

    # Shift summary (Roman numerals: I, II, III)
    shift_summary = {"I": {"count": 0, "total_qty": 0},
                     "II": {"count": 0, "total_qty": 0},
                     "III": {"count": 0, "total_qty": 0}}
    pipeline = [
        {"$group": {
            "_id": "$shift.value",
            "count": {"$sum": 1},
            "total_qty": {"$sum": {"$toDouble": {"$ifNull": ["$quantity_produced.value", "0"]}}}
        }}
    ]
    async for doc in records.aggregate(pipeline):
        shift = str(doc.get("_id", "")).upper()
        if shift in shift_summary:
            shift_summary[shift] = {"count": doc["count"], "total_qty": round(doc["total_qty"], 0)}

    # Machine summary
    machine_pipeline = [
        {"$group": {
            "_id": "$machine_number.value",
            "count": {"$sum": 1},
            "total_qty": {"$sum": {"$toDouble": {"$ifNull": ["$quantity_produced.value", "0"]}}},
            "errors": {"$sum": {"$cond": [{"$gt": [{"$size": {"$ifNull": ["$validation_errors", []]}}, 0]}, 1, 0]}}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    machine_summary = []
    async for doc in records.aggregate(machine_pipeline):
        machine = doc.get("_id") or "UNKNOWN"
        count = doc.get("count", 0)
        errors = doc.get("errors", 0)
        machine_summary.append({
            "machine_number": machine,
            "count": count,
            "total_qty": round(doc.get("total_qty", 0), 0),
            "failure_rate": round((errors / count * 100), 1) if count else 0.0
        })

    # Daily uploads — last 7 days
    daily_uploads = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        count = await uploads.count_documents({"upload_time": {"$gte": start, "$lt": end}})
        daily_uploads.append({"date": start.strftime("%Y-%m-%d"), "count": count})

    # Top anomalies
    top_anomalies = []
    async for doc in records.find(
        {"anomaly_flags.0": {"$exists": True}},
        {"anomaly_flags": 1}
    ).sort("created_at", -1).limit(5):
        top_anomalies.extend(doc.get("anomaly_flags", []))
    top_anomalies = list(set(top_anomalies))[:5]

    return {
        "total_uploads": total_uploads,
        "total_records": total_records,
        "reviewed_count": reviewed_count,
        "pending_review": pending_review,
        "validation_failures": validation_failures,
        "pass_rate": pass_rate,
        "shift_summary": shift_summary,
        "machine_summary": machine_summary,
        "daily_uploads": daily_uploads,
        "top_anomalies": top_anomalies,
    }
