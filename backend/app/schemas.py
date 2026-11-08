from datetime import date, time
from pydantic import BaseModel, Field, field_validator
from .models import CATEGORIES, STATUSES


class ReportInput(BaseModel):
    category: str
    description: str = Field(min_length=20, max_length=10000)
    location: str = Field(min_length=3, max_length=500)
    incident_date: date
    incident_time: time

    @field_validator("description", "location")
    @classmethod
    def clean(cls, value, info):
        value = value.strip()
        if len(value) < (20 if info.field_name == "description" else 3):
            raise ValueError("Too short")
        return value

    @field_validator("category")
    @classmethod
    def category_ok(cls, value):
        if value not in CATEGORIES:
            raise ValueError("Invalid category")
        return value

    @field_validator("incident_date")
    @classmethod
    def date_ok(cls, value):
        from datetime import datetime
        from zoneinfo import ZoneInfo

        if value > datetime.now(ZoneInfo("Asia/Almaty")).date():
            raise ValueError("Incident date cannot be in the future")
        return value


class Credentials(BaseModel):
    report_number: str = Field(min_length=1, max_length=40)
    token: str = Field(min_length=1, max_length=100)


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class MessageInput(BaseModel):
    text: str = Field(min_length=1, max_length=5000)

    @field_validator("text")
    @classmethod
    def nonempty(cls, v):
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class StatusInput(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid(cls, v):
        if v not in STATUSES:
            raise ValueError("Invalid status")
        return v


class PasswordInput(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(min_length=12, max_length=200)
