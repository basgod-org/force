import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "force.db")


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                repo_path TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                project_id INTEGER REFERENCES projects(id),
                assigned_agent TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.commit()
        await _seed(db)


async def _seed(db):
    cursor = await db.execute("SELECT COUNT(*) FROM projects")
    row = await cursor.fetchone()
    if row[0] > 0:
        return

    await db.execute(
        "INSERT INTO projects (name, description, repo_path) VALUES (?, ?, ?)",
        ("Force", "Agent management dashboard", "/home/pruthvi/Projects/force"),
    )
    await db.execute(
        "INSERT INTO projects (name, description, repo_path) VALUES (?, ?, ?)",
        ("BasgodTrade", "Trading platform", "/home/pruthvi/Projects/basgod/BasgodTrade"),
    )
    await db.commit()
