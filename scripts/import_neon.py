"""Import a private encrypted transfer into an EMPTY migrated Neon database.

Input file is supplied by argv; DATABASE_URL must be a direct connection.
Existing rows are never overwritten. Sessions and rate limits are not copied.
"""

import base64
import json
import os
import sys
from datetime import datetime, date, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from sqlalchemy import select, func, DateTime, Date, Time
from app.db import engine, Base
from app import models
from app.security import passwords


def main():
    data = json.loads(Path(sys.argv[1]).read_text())
    with engine.begin() as db:
        if db.scalar(select(func.count()).select_from(models.User.__table__)):
            raise RuntimeError(
                "Target database is not empty. Refusing to overwrite it."
            )
        for table in Base.metadata.sorted_tables:
            rows = data.get(table.name, [])
            for row in rows:
                for name, value in list(row.items()):
                    column = table.columns[name]
                    if isinstance(value, dict) and "$bytes" in value:
                        row[name] = base64.b64decode(value["$bytes"], validate=True)
                    elif value is not None and isinstance(column.type, DateTime):
                        row[name] = datetime.fromisoformat(value)
                    elif value is not None and isinstance(column.type, Date):
                        row[name] = date.fromisoformat(value)
                    elif value is not None and isinstance(column.type, Time):
                        row[name] = time.fromisoformat(value)
                if table.name == "users" and row["username"].startswith("demo."):
                    row["password_hash"] = passwords.hash(os.environ["DEMO_PASSWORD"])
                db.execute(table.insert().values(**row))
    print("Encrypted data and evidence imported; cloud demo passwords rotated.")


if __name__ == "__main__":
    main()
