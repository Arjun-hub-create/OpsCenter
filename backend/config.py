import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "opscenter")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# Ensure upload dir exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
