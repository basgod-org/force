import aiosqlite
import os

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "force.db"))


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
        await db.execute("PRAGMA journal_mode=WAL")
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
                session_id TEXT,
                agent_type TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                author TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                from_status TEXT,
                to_status TEXT NOT NULL,
                actor TEXT,
                session_id TEXT,
                note TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS agent_direct_chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                author TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_direct_chats ON agent_direct_chats(agent_id, session_id)"
        )
        # Tracks chat sessions linked to a user identity (auth wired later; default 'boss').
        await db.execute("""
            CREATE TABLE IF NOT EXISTS agent_chat_sessions (
                session_id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'boss',
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON agent_chat_sessions(agent_id, user_id)"
        )
        # Migrate existing DB: add columns if missing
        for col, typedef in [("session_id", "TEXT"), ("agent_type", "TEXT"), ("is_chat", "INTEGER DEFAULT 0")]:
            try:
                await db.execute(f"ALTER TABLE tasks ADD COLUMN {col} {typedef}")
            except Exception:
                pass
        # Link direct-chat messages to a user identity.
        try:
            await db.execute("ALTER TABLE agent_direct_chats ADD COLUMN user_id TEXT DEFAULT 'boss'")
        except Exception:
            pass
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
