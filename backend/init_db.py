"""
Database initialization script.

Run this script to create the database and all tables.

Usage:
    python init_db.py

LEARNING EXERCISE:
- Run this script and verify cloudpulse.db is created
- What happens if you run it twice? (SQLAlchemy is idempotent)
"""

from app.database import init_db

if __name__ == "__main__":
    print("Initializing CloudPulse database...")
    init_db()
    print("Done! Database is ready to use.")
