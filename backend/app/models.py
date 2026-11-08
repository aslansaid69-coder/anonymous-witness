from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (
    String,
    Text,
    ForeignKey,
    DateTime,
    Date,
    Time,
    Integer,
    CheckConstraint,
    LargeBinary,
)
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid4())


STATUSES = (
    "Submitted",
    "Under Review",
    "Additional Information Requested",
    "In Progress",
    "Resolved",
    "Rejected",
)
CATEGORIES = (
    "Theft",
    "Fraud",
    "Violence",
    "Corruption",
    "Cybercrime",
    "Drug-related activity",
    "Suspicious activity",
    "Other",
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("role IN ('officer','admin')"),)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    report_number: Mapped[str] = mapped_column(String(40), unique=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    encrypted_description: Mapped[str] = mapped_column(Text)
    encrypted_location: Mapped[str] = mapped_column(Text)
    incident_date: Mapped[datetime] = mapped_column(Date, index=True)
    incident_time: Mapped[datetime] = mapped_column(Time)
    status: Mapped[str] = mapped_column(String(60), default="Submitted", index=True)
    access_token_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )
    __table_args__ = (
        CheckConstraint(
            "status IN ('Submitted','Under Review','Additional Information Requested','In Progress','Resolved','Rejected')"
        ),
        CheckConstraint(
            "category IN ('Theft','Fraud','Violence','Corruption','Cybercrime','Drug-related activity','Suspicious activity','Other')"
        ),
    )


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), index=True)
    original_filename: Mapped[str] = mapped_column(Text)
    stored_filename: Mapped[str] = mapped_column(String(80), unique=True)
    mime_type: Mapped[str] = mapped_column(String(80))
    file_size: Mapped[int] = mapped_column(Integer)
    file_hash: Mapped[str] = mapped_column(String(64))
    encrypted_content: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), index=True)
    sender_type: Mapped[str] = mapped_column(String(20))
    encrypted_message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    __table_args__ = (
        CheckConstraint("sender_type IN ('citizen','officer','internal')"),
    )


class StatusHistory(Base):
    __tablename__ = "status_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    new_status: Mapped[str] = mapped_column(String(60))
    changed_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    report_id: Mapped[str | None] = mapped_column(
        ForeignKey("reports.id"), nullable=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class Session(Base):
    __tablename__ = "sessions"
    id_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    report_id: Mapped[str | None] = mapped_column(
        ForeignKey("reports.id"), nullable=True
    )
    csrf_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    __table_args__ = (CheckConstraint("(user_id IS NULL) != (report_id IS NULL)"),)


class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class SubmissionUpload(Base):
    __tablename__ = "submission_uploads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    token_hash: Mapped[str] = mapped_column(String(64))
    content_type: Mapped[str] = mapped_column(String(200))
    total_bytes: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    __table_args__ = (CheckConstraint("total_bytes > 0 AND total_bytes <= 54525952"),)


class SubmissionChunk(Base):
    __tablename__ = "submission_chunks"
    upload_id: Mapped[str] = mapped_column(
        ForeignKey("submission_uploads.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    encrypted_content: Mapped[bytes] = mapped_column(LargeBinary)
    __table_args__ = (CheckConstraint("position >= 0 AND position < 104"),)
