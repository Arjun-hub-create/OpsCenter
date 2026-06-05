from database import records as records_col


async def get_historical_averages() -> dict:
    try:
        pipeline = [
            {"$group": {
                "_id": "$shift.value",
                "avg_qty": {"$avg": {"$toDouble": "$quantity_produced.value"}},
                "count": {"$sum": 1}
            }}
        ]
        cursor = records_col.aggregate(pipeline)
        avgs = {}
        async for doc in cursor:
            if doc["_id"]:
                avgs[doc["_id"]] = {"avg_qty": doc.get("avg_qty", 0), "count": doc.get("count", 0)}
        return avgs
    except Exception as e:
        print(f"[Anomaly] get_historical_averages error: {e}")
        return {}


def flag_quantity_anomaly(quantity, shift: str, shift_avgs: dict) -> str | None:
    try:
        qty = float(str(quantity).replace(",", ""))
        avg = shift_avgs.get(shift, {}).get("avg_qty", 0)
        if avg and qty > avg * 3:
            return f"Quantity {qty} is {round(qty/avg, 1)}x the shift {shift} average ({round(avg, 1)})"
    except Exception:
        pass
    return None


def flag_time_anomaly(time_taken) -> str | None:
    try:
        t = float(str(time_taken))
        if t == 0:
            return "Time taken is zero — possible data entry error"
        if t > 24:
            return f"Time taken {t}h exceeds maximum shift duration (24h)"
    except Exception:
        pass
    return None


async def flag_duplicate_employee_shift(employee: str, shift: str, date: str) -> str | None:
    try:
        query = {
            "employee_number.value": str(employee).strip(),
            "shift.value": str(shift).strip(),
            "date.value": str(date).strip(),
        }
        count = await records_col.count_documents(query)
        if count >= 3:
            return f"Employee {employee} appears on {count} machines in shift {shift} on {date}"
    except Exception as e:
        print(f"[Anomaly] flag_duplicate_employee_shift error: {e}")
    return None


async def run_anomaly_checks(record: dict) -> list:
    flags = []

    def get_val(field):
        f = record.get(field)
        if isinstance(f, dict):
            return f.get("value")
        return f

    shift_avgs = await get_historical_averages()
    qty = get_val("quantity_produced")
    shift = get_val("shift")
    time_val = get_val("time_taken")
    employee = get_val("employee_number")
    date_val = get_val("date")

    if qty and shift:
        flag = flag_quantity_anomaly(qty, str(shift).upper(), shift_avgs)
        if flag:
            flags.append(flag)

    if time_val:
        flag = flag_time_anomaly(time_val)
        if flag:
            flags.append(flag)

    if employee and shift and date_val:
        flag = await flag_duplicate_employee_shift(str(employee), str(shift), str(date_val))
        if flag:
            flags.append(flag)

    return flags
