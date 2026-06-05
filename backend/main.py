from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import base64

from database import verify_connection, uploads
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

# Serve uploads dynamically (support for read-only serverless filesystems)
@app.get("/uploads/{stored_name}")
async def get_uploaded_file(stored_name: str):
    doc = await uploads.find_one({"stored_name": stored_name})
    if not doc:
        # Fallback to local disk files if they exist
        local_path = os.path.join(UPLOAD_DIR, stored_name)
        if os.path.exists(local_path):
            from fastapi.responses import FileResponse
            return FileResponse(local_path)
        raise HTTPException(status_code=404, detail="File not found")
    
    file_base64 = doc.get("file_base64")
    if file_base64:
        try:
            content = base64.b64decode(file_base64)
            return Response(content=content, media_type=doc.get("file_type", "application/octet-stream"))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error decoding file: {e}")
            
    local_path = doc.get("file_path", "")
    if local_path and os.path.exists(local_path):
        from fastapi.responses import FileResponse
        return FileResponse(local_path)
        
    raise HTTPException(status_code=404, detail="File not found")

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
