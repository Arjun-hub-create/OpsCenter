import re
from datetime import datetime
from database import records as records_col


# ── Shift helpers ────────────────────────────────────────────────
# Manufacturing documents commonly use Roman numerals (I, II, III),
# Arabic digits (1, 2, 3), or letters (A, B, C) for shifts.
VALID_SHIFTS = {
    # Roman numerals
    "I", "II", "III",
    # Arabic digits
    "1", "2", "3",
    # Letters
    "A", "B", "C",
}

# Normalisation map → canonical Roman numeral form
_SHIFT_NORM = {
    "1": "I", "A": "I",
    "2": "II", "B": "II",
    "3": "III", "C": "III",
    "I": "I", "II": "II", "III": "III",
}


def normalize_shift(raw) -> str | None:
    """Return canonical Roman-numeral form (I / II / III), or None."""
    if not raw:
        return None
    key = str(raw).strip().upper()
    return _SHIFT_NORM.get(key)


# ── Date helpers ─────────────────────────────────────────────────
# Supported date formats (including short-year variants common in
# handwritten manufacturing logs: DD/M/YY, D/M/YY, DD/MM/YY, etc.)
DATE_FORMATS = [
    "%Y-%m-%d",       # 2026-04-19
    "%d-%m-%Y",       # 19-04-2026
    "%d/%m/%Y",       # 19/04/2026
    "%m/%d/%Y",       # 04/19/2026
    "%d-%b-%Y",       # 19-Apr-2026
    "%d-%b-%y",       # 19-Apr-26
    "%B %d, %Y",      # April 19, 2026
    "%d %B %Y",       # 19 April 2026
    "%d/%m/%y",       # 19/04/26   ← common handwritten
    "%d-%m-%y",       # 19-04-26
    "%m/%d/%y",       # 04/19/26
    "%Y/%m/%d",       # 2026/04/19
]


def validate_date(value) -> list:
    errors = []
    if not value:
        errors.append({"field": "date", "message": "Date is missing or null"})
        return errors

    raw = str(value).strip()

    # Handle cases like "19/4/26" → zero-pad to "19/04/26" for parsing
    # Regex: one-or-two digit day, separator, one-or-two digit month, separator, two-or-four digit year
    m = re.match(r"^(\d{1,2})([/\-])(\d{1,2})\2(\d{2,4})$", raw)
    if m:
        d, sep, mo, y = m.group(1), m.group(2), m.group(3), m.group(4)
        raw = f"{d.zfill(2)}{sep}{mo.zfill(2)}{sep}{y}"

    parsed = False
    for fmt in DATE_FORMATS:
        try:
            datetime.strptime(raw, fmt)
            parsed = True
            break
        except ValueError:
            continue

    if not parsed:
        errors.append({"field": "date", "message": f"Invalid date format: '{value}'"})
    return errors


def validate_shift(value) -> list:
    errors = []
    if not value:
        errors.append({"field": "shift", "message": "Shift is missing"})
        return errors
    canonical = normalize_shift(value)
    if canonical is None:
        errors.append({
            "field": "shift",
            "message": f"Invalid shift '{value}' — must be I, II, III (or 1/2/3 or A/B/C)"
        })
    return errors


def validate_machine_code(value) -> list:
    errors = []
    if not value:
        return errors  # optional – not an error if missing
    raw = str(value).strip()
    # Accept MC-XXX where XXX is 2-4 digits; case-insensitive
    pattern = re.compile(r"^MC-\d{2,4}$", re.IGNORECASE)
    if not pattern.match(raw):
        # Also accept "Mc-XXX" or "mc-XXX" with a dash variant like "Mc -XXX"
        alt_pattern = re.compile(r"^MC\s*-\s*\d{2,4}$", re.IGNORECASE)
        if not alt_pattern.match(raw):
            errors.append({
                "field": "machine_number",
                "message": f"Machine code '{value}' does not match MC-XXX format"
            })
    return errors


# Characters that represent "no value" / "nil" in handwritten docs
_DASH_CHARS = {"—", "–", "-", "−", "~", "nil", "n/a", "na", "none", "null", ""}


def _is_dash_or_nil(val) -> bool:
    """Return True if the value is a dash, blank, or nil-like string."""
    if val is None:
        return True
    return str(val).strip().lower() in _DASH_CHARS


def validate_quantity(value) -> list:
    errors = []
    if value is None or str(value).strip() == "":
        errors.append({"field": "quantity_produced", "message": "Quantity is missing"})
        return errors

    # Treat dash / nil as intentional "zero produced" — flag as info, not error
    if _is_dash_or_nil(value):
        return []  # Not an error; quantity intentionally left blank

    try:
        qty = float(str(value).replace(",", ""))
        if qty < 0:
            errors.append({
                "field": "quantity_produced",
                "message": f"Quantity {qty} is negative — possible OCR misread of a dash"
            })
        elif qty > 10000:
            errors.append({
                "field": "quantity_produced",
                "message": f"Quantity {qty} is suspiciously high (>10,000)"
            })
    except ValueError:
        errors.append({
            "field": "quantity_produced",
            "message": f"Quantity '{value}' is not a valid number"
        })
    return errors


def validate_work_order(value) -> list:
    errors = []
    if not value or str(value).strip() == "":
        errors.append({"field": "work_order_number", "message": "Work order number is missing"})
    return errors


def validate_time_taken(value) -> list:
    errors = []
    if value is None or str(value).strip() == "":
        return errors
    if _is_dash_or_nil(value):
        return []
    try:
        t = float(str(value))
        if t <= 0:
            errors.append({"field": "time_taken", "message": "Time taken must be greater than 0"})
        elif t > 24:
            errors.append({"field": "time_taken", "message": f"Time taken {t}h exceeds 24 hours"})
    except ValueError:
        errors.append({"field": "time_taken", "message": f"Time taken '{value}' is not a valid number"})
    return errors


async def check_duplicate_work_order(work_order: str, exclude_id: str = None) -> bool:
    if not work_order:
        return False
    query = {"work_order_number.value": str(work_order).strip()}
    if exclude_id:
        from bson import ObjectId
        try:
            query["_id"] = {"$ne": ObjectId(exclude_id)}
        except Exception:
            pass
    count = await records_col.count_documents(query)
    return count > 0


async def run_all_validations(record: dict, exclude_id: str = None) -> list:
    errors = []

    def get_val(field):
        f = record.get(field)
        if isinstance(f, dict):
            return f.get("value")
        return f

    errors.extend(validate_date(get_val("date")))
    errors.extend(validate_shift(get_val("shift")))
    errors.extend(validate_machine_code(get_val("machine_number")))
    errors.extend(validate_quantity(get_val("quantity_produced")))
    errors.extend(validate_work_order(get_val("work_order_number")))
    errors.extend(validate_time_taken(get_val("time_taken")))

    wo = get_val("work_order_number")
    if wo and await check_duplicate_work_order(str(wo), exclude_id):
        errors.append({
            "field": "work_order_number",
            "message": f"Work order '{wo}' already exists in another record"
        })

    return errors
