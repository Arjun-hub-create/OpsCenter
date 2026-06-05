import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import aiofiles
from database import uploads, records
from config import UPLOAD_DIR
from bson import ObjectId

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "image/tiff": ".tiff",
}


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "upload_time" in doc and hasattr(doc["upload_time"], "isoformat"):
        doc["upload_time"] = doc["upload_time"].isoformat()
    doc.pop("file_base64", None)
    return doc


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {list(ALLOWED_TYPES.keys())}"
        )
    ext = ALLOWED_TYPES[file.content_type]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    contents = await file.read()
    import base64
    file_base64 = base64.b64encode(contents).decode("utf-8")

    if not os.getenv("VERCEL"):
        try:
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(contents)
        except Exception as e:
            print(f"[Upload] Local save failed: {e}")

    doc = {
        "filename": file.filename,
        "file_type": file.content_type,
        "upload_time": datetime.utcnow(),
        "status": "pending",
        "file_path": file_path,
        "stored_name": unique_name,
        "size_bytes": len(contents),
        "file_base64": file_base64,
    }
    result = await uploads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return JSONResponse(content=_serialize(doc), status_code=201)


@router.post("/upload/bulk")
async def upload_bulk(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            results.append({"filename": file.filename, "error": "Unsupported type"})
            continue
        ext = ALLOWED_TYPES[file.content_type]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        contents = await file.read()
        import base64
        file_base64 = base64.b64encode(contents).decode("utf-8")

        if not os.getenv("VERCEL"):
            try:
                async with aiofiles.open(file_path, "wb") as f:
                    await f.write(contents)
            except Exception as e:
                print(f"[Upload Bulk] Local save failed: {e}")

        doc = {
            "filename": file.filename,
            "file_type": file.content_type,
            "upload_time": datetime.utcnow(),
            "status": "pending",
            "file_path": file_path,
            "stored_name": unique_name,
            "size_bytes": len(contents),
            "file_base64": file_base64,
        }
        result = await uploads.insert_one(doc)
        doc["_id"] = result.inserted_id
        results.append(_serialize(doc))
    return JSONResponse(content=results, status_code=201)


@router.get("/uploads")
async def get_uploads(page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    cursor = uploads.find({}).sort("upload_time", -1).skip(skip).limit(limit)
    docs = []
    async for doc in cursor:
        docs.append(_serialize(doc))
    total = await uploads.count_documents({})
    return {"uploads": docs, "total": total, "page": page, "limit": limit}


@router.get("/uploads/{upload_id}")
async def get_upload(upload_id: str):
    try:
        doc = await uploads.find_one({"_id": ObjectId(upload_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Upload not found")
    return _serialize(doc)


@router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: str):
    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload ID")

    doc = await uploads.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Delete physical file on disk
    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"[Upload Delete] Failed to remove file: {e}")

    # Delete upload doc from DB
    await uploads.delete_one({"_id": oid})

    # Delete all records associated with this upload
    await records.delete_many({"upload_id": upload_id})

    return {"status": "success", "message": "Upload and associated records deleted successfully"}
