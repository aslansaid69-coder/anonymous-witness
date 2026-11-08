"""Run inside the Docker API container; stdout is a private transfer stream."""

import base64
import json
from datetime import date, datetime, time
from pathlib import Path
from sqlalchemy import create_engine, MetaData, select
from app.config import settings


def encode(value):
    if isinstance(value, bytes):
        return {"$bytes": base64.b64encode(value).decode()}
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    raise TypeError(type(value).__name__)


def export():
    engine = create_engine(settings.database_url)
    metadata = MetaData()
    metadata.reflect(engine)
    data = {}
    with engine.connect() as db:
        for name in (
            "users",
            "reports",
            "evidence",
            "messages",
            "status_history",
            "audit_logs",
        ):
            rows = [
                dict(row)
                for row in db.execute(select(metadata.tables[name])).mappings()
            ]
            if name == "evidence":
                for row in rows:
                    if row.get("encrypted_content") is None:
                        row["encrypted_content"] = (
                            settings.storage_dir / row["stored_filename"]
                        ).read_bytes()
            data[name] = rows
    print(json.dumps(data, default=encode))


if __name__ == "__main__":
    export()
