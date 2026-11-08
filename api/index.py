"""ASGI entrypoint for Vercel's Python runtime; secrets remain server-side."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.main import app
