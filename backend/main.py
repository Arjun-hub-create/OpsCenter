from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import verify_connection
from routes.upload import router as upload_router
from routes.extraction import router as extraction_router
from routes.records import router as records_router
from routes.dashboard import router as dashboard_router
from routes.chat import router as chat_router
from config import UPLOAD_DIR

app = FastAPI(title="OpsCenter AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Routers
app.include_router(upload_router, prefix="/api")
app.include_router(extraction_router, prefix="/api")
app.include_router(records_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.on_event("startup")
async def startup():
    print("[OpsCenter AI] Starting server...")
    await verify_connection()
    print("[OpsCenter AI] Server ready.")


@app.get("/api/health")
async def health():
    return {"status": "online", "service": "OpsCenter AI", "version": "1.0.0"}
