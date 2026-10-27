use crate::domain::{HistoryEntry, Task, TaskStatus};
use crate::error::AppResult;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Arc;

#[derive(Clone)]
pub struct Db {
    conn: Arc<Mutex<Connection>>,
}

impl Db {
    pub fn new<P: AsRef<Path>>(db_path: P) -> AppResult<Self> {
        let conn = Connection::open(db_path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        db.recover_interrupted_tasks()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn new_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                op TEXT NOT NULL,
                mod_name TEXT NOT NULL,
                status TEXT NOT NULL,
                progress REAL NOT NULL,
                source_path TEXT,
                target_path TEXT,
                options_json TEXT,
                error TEXT,
                size_mb REAL,
                created_at TEXT NOT NULL,
                finished_at TEXT
            );

            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                op TEXT NOT NULL,
                mod_name TEXT NOT NULL,
                status TEXT NOT NULL,
                date TEXT NOT NULL,
                size TEXT NOT NULL,
                file_path TEXT,
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            "#,
        )?;
        Ok(())
    }

    fn recover_interrupted_tasks(&self) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tasks SET status = 'failed', error = 'Interrompido antes da conclusão' WHERE status = 'processing'",
            [],
        )?;
        Ok(())
    }

    pub fn insert_task(&self, task: &Task) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            r#"
            INSERT INTO tasks (id, name, op, mod_name, status, progress, source_path, target_path, options_json, error, size_mb, created_at, finished_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            "#,
            params![
                task.id,
                task.name,
                task.op,
                task.mod_name,
                task.status.as_str(),
                task.progress,
                task.source_path,
                task.target_path,
                task.options_json,
                task.error,
                task.size_mb,
                task.created_at,
                task.finished_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_task_progress(&self, id: &str, progress: f64) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tasks SET progress = ?1 WHERE id = ?2",
            params![progress, id],
        )?;
        Ok(())
    }

    pub fn update_task_status(
        &self,
        id: &str,
        status: TaskStatus,
        progress: f64,
        error: Option<&str>,
        finished_at: Option<&str>,
    ) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tasks SET status = ?1, progress = ?2, error = ?3, finished_at = ?4 WHERE id = ?5",
            params![status.as_str(), progress, error, finished_at, id],
        )?;
        Ok(())
    }

    pub fn get_task(&self, id: &str) -> AppResult<Option<Task>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, name, op, mod_name, status, progress, source_path, target_path, options_json, error, size_mb, created_at, finished_at
            FROM tasks WHERE id = ?1
            "#,
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let status_str: String = row.get(4)?;
            Ok(Some(Task {
                id: row.get(0)?,
                name: row.get(1)?,
                op: row.get(2)?,
                mod_name: row.get(3)?,
                status: TaskStatus::from_str(&status_str),
                progress: row.get(5)?,
                source_path: row.get(6)?,
                target_path: row.get(7)?,
                options_json: row.get(8)?,
                error: row.get(9)?,
                size_mb: row.get(10)?,
                speed: None,
                created_at: row.get(11)?,
                finished_at: row.get(12)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_tasks(&self) -> AppResult<Vec<Task>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, name, op, mod_name, status, progress, source_path, target_path, options_json, error, size_mb, created_at, finished_at
            FROM tasks ORDER BY created_at DESC
            "#,
        )?;

        let rows = stmt.query_map([], |row| {
            let status_str: String = row.get(4)?;
            Ok(Task {
                id: row.get(0)?,
                name: row.get(1)?,
                op: row.get(2)?,
                mod_name: row.get(3)?,
                status: TaskStatus::from_str(&status_str),
                progress: row.get(5)?,
                source_path: row.get(6)?,
                target_path: row.get(7)?,
                options_json: row.get(8)?,
                error: row.get(9)?,
                size_mb: row.get(10)?,
                speed: None,
                created_at: row.get(11)?,
                finished_at: row.get(12)?,
            })
        })?;

        let mut tasks = Vec::new();
        for task in rows {
            tasks.push(task?);
        }
        Ok(tasks)
    }

    pub fn remove_task(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_completed_tasks(&self) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "DELETE FROM tasks WHERE status IN ('done', 'canceled', 'failed')",
            [],
        )?;
        Ok(())
    }

    pub fn insert_history(&self, entry: &HistoryEntry) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            r#"
            INSERT INTO history (id, name, op, mod_name, status, date, size, file_path, error)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            params![
                entry.id,
                entry.name,
                entry.op,
                entry.mod_name,
                entry.status,
                entry.date,
                entry.size,
                entry.file_path,
                entry.error,
            ],
        )?;
        Ok(())
    }

    pub fn list_history(&self) -> AppResult<Vec<HistoryEntry>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, name, op, mod_name, status, date, size, file_path, error
            FROM history ORDER BY date DESC LIMIT 200
            "#,
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                name: row.get(1)?,
                op: row.get(2)?,
                mod_name: row.get(3)?,
                status: row.get(4)?,
                date: row.get(5)?,
                size: row.get(6)?,
                file_path: row.get(7)?,
                error: row.get(8)?,
            })
        })?;

        let mut history = Vec::new();
        for item in rows {
            history.push(item?);
        }
        Ok(history)
    }

    pub fn clear_history(&self) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM history", [])?;
        Ok(())
    }

    pub fn get_preference(&self, key: &str) -> AppResult<Option<String>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT value FROM preferences WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    pub fn set_preference(&self, key: &str, value: &str) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO preferences (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )?;
        Ok(())
    }
}
