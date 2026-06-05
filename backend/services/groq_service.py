import json
from groq import Groq
from config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"


def _chat(system: str, user: str, max_tokens: int = 512) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()


# ── Keywords that indicate a "positive" / informational message ──
# If the AI returns a line containing any of these, it is NOT an error.
_POSITIVE_KEYWORDS = [
    "no missing",
    "no issues",
    "no errors",
    "no anomalies",
    "all fields",
    "all values",
    "looks correct",
    "looks valid",
    "no suspicious",
    "no invalid",
    "records are valid",
    "within range",
    "is valid",
    "are valid",
    "correctly formatted",
    "no validation issues",
]


def _is_real_error(msg: str) -> bool:
    """Return True only if msg looks like an actual error, not a positive remark."""
    if not msg or not msg.strip():
        return False
    lower = msg.strip().lower()
    for kw in _POSITIVE_KEYWORDS:
        if kw in lower:
            return False
    return True


async def validate_record(record_dict: dict) -> list:
    system = (
        "You are a manufacturing data validator. Given this extracted record, "
        "identify ALL validation issues. Check: missing mandatory fields (date, shift, "
        "work_order_number), invalid shift values (valid shifts are I, II, III or 1, 2, 3 — "
        "these are Roman numeral / numeric shift identifiers used in manufacturing), "
        "machine code format (should match MC-XXX pattern, case-insensitive), "
        "suspicious quantities (negative, zero, or >10000), "
        "time_taken issues (should be between 0.1 and 24 hours). "
        "A dash '—' or '-' in quantity means zero production — flag only if it looks like "
        "an OCR misread (e.g. '-1'). "
        "Return ONLY a JSON array of error strings. If there are no errors, return []. "
        "No explanation, no preamble, no positive statements."
    )
    try:
        result = _chat(system, json.dumps(record_dict))
        # Strip markdown
        result = result.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(result)
        if not isinstance(parsed, list):
            return []
        # Filter out positive / informational messages that aren't real errors
        return [msg for msg in parsed if isinstance(msg, str) and _is_real_error(msg)]
    except Exception as e:
        print(f"[Groq] validate_record error: {e}")
        return []


async def generate_correction_suggestion(field_name: str, value) -> str:
    system = (
        f"For a manufacturing document field '{field_name}' with unclear value '{value}', "
        "suggest the most likely correct value. Be brief. Return just the suggestion, nothing else."
    )
    try:
        return _chat(system, f"Field: {field_name}, Value: {value}", max_tokens=64)
    except Exception as e:
        print(f"[Groq] correction_suggestion error: {e}")
        return ""


async def chat_with_records(user_message: str, records_context: str) -> str:
    system = (
        "You are an AI assistant for a manufacturing operations system called OpsCenter AI. "
        f"You have access to these records:\n{records_context}\n"
        "Answer the user's question based on this data. Be concise and precise. "
        "Use numbers and specifics. If you cannot find an answer in the data, say so."
    )
    try:
        return _chat(system, user_message, max_tokens=512)
    except Exception as e:
        print(f"[Groq] chat error: {e}")
        return "Error processing your query. Please try again."


async def detect_anomalies(record_dict: dict, historical_avg: dict) -> list:
    system = (
        "You are an anomaly detection system for manufacturing records. "
        f"Compare this manufacturing record against historical averages: {json.dumps(historical_avg)}. "
        "Shifts are identified as Roman numerals I, II, III (or numbers 1, 2, 3). "
        "Flag any anomalies. Return ONLY a JSON array of anomaly description strings. "
        "If there are no anomalies, return []. "
        "No preamble, no explanation, no positive statements."
    )
    try:
        result = _chat(system, json.dumps(record_dict), max_tokens=256)
        result = result.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(result)
        if not isinstance(parsed, list):
            return []
        return [msg for msg in parsed if isinstance(msg, str) and _is_real_error(msg)]
    except Exception as e:
        print(f"[Groq] detect_anomalies error: {e}")
        return []
