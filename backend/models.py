from pydantic import BaseModel, Field
from typing import Any, Optional, List
from datetime import datetime


class UploadedFile(BaseModel):
    id: Optional[str] = None
    filename: str
    file_type: str
    upload_time: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending / extracted / reviewed
    file_path: str


class ExtractedField(BaseModel):
    value: Any = None
    confidence: float = 0.0


class AuditEntry(BaseModel):
    field: str
    original_value: Any
    corrected_value: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ExtractedRecord(BaseModel):
    upload_id: str
    date: Optional[ExtractedField] = None
    shift: Optional[ExtractedField] = None
    employee_number: Optional[ExtractedField] = None
    operation_code: Optional[ExtractedField] = None
    machine_number: Optional[ExtractedField] = None
    work_order_number: Optional[ExtractedField] = None
    quantity_produced: Optional[ExtractedField] = None
    time_taken: Optional[ExtractedField] = None
    raw_text: str = ""
    validation_errors: List[str] = []
    anomaly_flags: List[str] = []
    reviewed: bool = False
    review_time: Optional[datetime] = None
    audit_trail: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(BaseModel):
    message: str


class RecordUpdate(BaseModel):
    date: Optional[str] = None
    shift: Optional[str] = None
    employee_number: Optional[str] = None
    operation_code: Optional[str] = None
    machine_number: Optional[str] = None
    work_order_number: Optional[str] = None
    quantity_produced: Optional[str] = None
    time_taken: Optional[str] = None
