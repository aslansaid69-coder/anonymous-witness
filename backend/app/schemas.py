from pydantic import BaseModel, Field, field_validator
from typing import Literal


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)
    otp: str = Field(default="", max_length=8)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=16, max_length=200)


class SchoolInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    number: str = Field(min_length=1, max_length=30)
    district: str = Field(default="", max_length=100)
    active: bool = False

    @field_validator("name", "number", "district")
    @classmethod
    def trim(cls, v):
        return v.strip()


class OfficerInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    username: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9._-]+$")
    school_ids: list[str] = Field(default_factory=list, max_length=50)
    active: bool = True


class OfficerEdit(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    school_ids: list[str] = Field(default_factory=list, max_length=50)
    active: bool = True


class StatusInput(BaseModel):
    status: Literal["New", "In progress", "Closed"]


class TextInput(BaseModel):
    text: str = Field(min_length=1, max_length=10000)

    @field_validator("text")
    @classmethod
    def trim(cls, v):
        if not v.strip():
            raise ValueError("Required")
        return v.strip()


class RetentionInput(BaseModel):
    days: int = Field(ge=1, le=3650)


class TwoFactorInput(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
