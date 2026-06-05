import base64
import json
import google.generativeai as genai
from config import GEMINI_API_KEY, GROQ_API_KEY
from groq import Groq

# Configure Gemini
try:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
except Exception as e:
    print(f"[Gemini] Configure error: {e}")
    gemini_model = None

# Initialize Groq client
try:
    groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except Exception as e:
    print(f"[Groq] Client init error: {e}")
    groq_client = None

EXTRACTION_PROMPT = """You are an expert OCR system for handwritten and printed manufacturing documents.
Extract the table data from the image. Each row in the table represents a record.
For each row, extract exactly these fields:
- date
- shift
- employee_number
- operation_code
- machine_number
- work_order_number
- quantity_produced
- time_taken

For each field, return an object:
- value: the extracted value (null if blank or unreadable)
- confidence: float between 0.0 and 1.0 (self-reported based on clarity of handwriting)

Also return raw_text: a single string containing all readable text in the image.

Return ONLY a valid JSON object. No explanations, no markdown fences.
Format:
{
  "raw_text": "...",
  "rows": [
    {
      "date": {"value": "...", "confidence": 0.9},
      "shift": {"value": "...", "confidence": 0.95},
      "employee_number": {"value": "...", "confidence": 0.8},
      "operation_code": {"value": "...", "confidence": 0.85},
      "machine_number": {"value": "...", "confidence": 0.9},
      "work_order_number": {"value": "...", "confidence": 0.9},
      "quantity_produced": {"value": "...", "confidence": 0.9},
      "time_taken": {"value": "...", "confidence": 0.9}
    },
    ...
  ]
}
"""

def _null_result():
    return {
        "raw_text": "",
        "rows": []
    }

async def extract_from_image(image_bytes: bytes, mime_type: str) -> dict:
    try:
        if not gemini_model:
            raise Exception("Gemini model not initialized")
        
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_part = {"mime_type": mime_type, "data": b64}
        response = gemini_model.generate_content([EXTRACTION_PROMPT, image_part])
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return _normalize_result(data)
    except Exception as e:
        print(f"[Gemini] Extraction error: {e}. Falling back to Groq Vision...")
        return await extract_via_groq_vision(image_bytes, mime_type)

async def extract_via_groq_vision(image_bytes: bytes, mime_type: str) -> dict:
    if not groq_client:
        print("[Groq Vision] Error: Groq client not initialized")
        return _null_result()
    
    try:
        if mime_type == "application/pdf":
            try:
                import fitz
                print("[Groq Vision] Converting PDF to image for Groq OCR...")
                doc = fitz.open(stream=image_bytes, filetype="pdf")
                if len(doc) > 0:
                    page = doc[0]
                    zoom = 2.0  # 2.0x zoom (144 DPI) for high quality OCR text resolution
                    mat = fitz.Matrix(zoom, zoom)
                    pix = page.get_pixmap(matrix=mat)
                    image_bytes = pix.tobytes("png")
                    mime_type = "image/png"
                    print(f"[Groq Vision] PDF page converted successfully to PNG ({len(image_bytes)} bytes)")
                else:
                    raise Exception("PDF document has no pages")
            except Exception as pdf_err:
                print(f"[Groq Vision] PDF conversion failed: {pdf_err}")
                return _null_result()

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        completion = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64}",
                            },
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=1500,
        )
        text = completion.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return _normalize_result(data)
    except Exception as e:
        print(f"[Groq Vision] Extraction error: {e}")
        return _null_result()

def _normalize_result(data: dict) -> dict:
    # Ensure raw_text exists
    if "raw_text" not in data:
        data["raw_text"] = ""
    # Ensure rows exists and is a list
    if "rows" not in data or not isinstance(data["rows"], list):
        data["rows"] = []
    
    fields = ["date", "shift", "employee_number", "operation_code",
              "machine_number", "work_order_number", "quantity_produced", "time_taken"]
              
    for row in data["rows"]:
        for f in fields:
            if f not in row:
                row[f] = {"value": None, "confidence": 0.0}
            elif not isinstance(row[f], dict):
                row[f] = {"value": row[f], "confidence": 0.9}
            else:
                if "value" not in row[f]:
                    row[f]["value"] = None
                if "confidence" not in row[f]:
                    row[f]["confidence"] = 0.5
    return data
