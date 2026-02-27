#!/usr/bin/env python3
import json, os, sqlite3, sys
from datetime import datetime

# Database path in project directory
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "email_tracking.db")

try:
    db = sqlite3.connect(DB_PATH)
    db.execute("""CREATE TABLE IF NOT EXISTS email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        business_name TEXT,
        report_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
except Exception as e:
    db = None

method = os.environ.get("REQUEST_METHOD", "GET")

if method == "POST":
    try:
        raw = sys.stdin.read()
        body = json.loads(raw)
        email = body.get("email", "")
        business_name = body.get("businessName", "")
        report_data = json.dumps(body.get("reportData", {}))

        if db:
            db.execute(
                "INSERT INTO email_log (email, business_name, report_data) VALUES (?, ?, ?)",
                [email, business_name, report_data]
            )
            db.commit()

        print("Status: 201")
        print("Content-Type: application/json")
        print()
        print(json.dumps({
            "success": True,
            "message": f"Report queued for {email}",
            "timestamp": datetime.now().isoformat()
        }))
    except Exception as e:
        print("Status: 400")
        print("Content-Type: application/json")
        print()
        print(json.dumps({"success": False, "error": str(e)}))

elif method == "GET":
    try:
        if db:
            rows = db.execute("SELECT id, email, business_name, created_at FROM email_log ORDER BY id DESC LIMIT 50").fetchall()
            results = [{"id": r[0], "email": r[1], "businessName": r[2], "createdAt": r[3]} for r in rows]
        else:
            results = []
        print("Content-Type: application/json")
        print()
        print(json.dumps(results))
    except Exception as e:
        print("Content-Type: application/json")
        print()
        print(json.dumps({"error": str(e)}))
else:
    print("Content-Type: application/json")
    print()
    print(json.dumps({"error": "Method not supported"}))
