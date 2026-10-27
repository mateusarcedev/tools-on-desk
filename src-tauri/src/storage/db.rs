use crate::domain::{ErrorLogEntry, ErrorLogFilter, ErrorLogStats, HistoryEntry, Task, TaskStatus};
use crate::error::AppResult;
use crate::utils::sanitizer::sanitize_error_text;
use chrono::Utc;
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
        let conn = Connection::open(&db_path)?;
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
            PRAGMA journal_mode = WAL;

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

            CREATE TABLE IF NOT EXISTS error_logs (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                severity TEXT NOT NULL,
                source TEXT NOT NULL,
                module TEXT NOT NULL,
                operation TEXT NOT NULL,
                task_id TEXT,
                error_code TEXT NOT NULL,
                user_message TEXT NOT NULL,
                technical_details TEXT,
                sanitized_stack TEXT,
                status TEXT NOT NULL,
                app_version TEXT NOT NULL,
                resolved_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_error_logs_module ON error_logs (module);
            CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs (severity);
            CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs (status);
            CREATE INDEX IF NOT EXISTS idx_error_logs_task_id ON error_logs (task_id);
            CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs (error_code);
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

    // ==========================================
    // TASKS
    // ==========================================

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
            FROM tasks ORDER BY created_at DESC LIMIT 100
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
        for item in rows {
            tasks.push(item?);
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

    // ==========================================
    // HISTORY
    // ==========================================

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

    // ==========================================
    // ERROR LOGS (CENTRAL DE ERROS E DIAGNÓSTICOS - M03 / M04)
    // ==========================================

    pub fn insert_error_log(&self, entry: &ErrorLogEntry) -> AppResult<()> {
        let conn = self.conn.lock();

        let sanitized_user_msg = sanitize_error_text(&entry.user_message);
        let sanitized_technical = entry
            .technical_details
            .as_deref()
            .map(sanitize_error_text);
        let sanitized_stack = entry
            .sanitized_stack
            .as_deref()
            .map(sanitize_error_text);

        // Deduplication guard: ignore redundant duplicate within 3 seconds
        let duplicate_count: i64 = conn.query_row(
            r#"
            SELECT COUNT(*) FROM error_logs
            WHERE error_code = ?1
              AND module = ?2
              AND (technical_details = ?3 OR user_message = ?4)
              AND created_at >= datetime('now', '-3 seconds')
            "#,
            params![
                entry.error_code,
                entry.module,
                sanitized_technical,
                sanitized_user_msg
            ],
            |row| row.get(0),
        ).unwrap_or(0);

        if duplicate_count > 0 {
            // Already logged by another layer (e.g. backend task + unhandled promise)
            return Ok(());
        }

        conn.execute(
            r#"
            INSERT INTO error_logs (
                id, created_at, severity, source, module, operation, task_id,
                error_code, user_message, technical_details, sanitized_stack,
                status, app_version, resolved_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            ON CONFLICT(id) DO UPDATE SET
                technical_details = excluded.technical_details,
                status = excluded.status,
                resolved_at = excluded.resolved_at
            "#,
            params![
                entry.id,
                entry.created_at,
                entry.severity,
                entry.source,
                entry.module,
                entry.operation,
                entry.task_id,
                entry.error_code,
                sanitized_user_msg,
                sanitized_technical,
                sanitized_stack,
                entry.status,
                entry.app_version,
                entry.resolved_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_error_logs(&self, filter: &ErrorLogFilter) -> AppResult<Vec<ErrorLogEntry>> {
        let conn = self.conn.lock();
        let mut query = String::from(
            "SELECT id, created_at, severity, source, module, operation, task_id, error_code, \
             user_message, technical_details, sanitized_stack, status, app_version, resolved_at \
             FROM error_logs WHERE 1=1"
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(sev) = &filter.severity {
            let s = sev.trim();
            if !s.is_empty() && !s.eq_ignore_ascii_case("all") {
                query.push_str(" AND UPPER(severity) = UPPER(?)");
                params_vec.push(Box::new(s.to_string()));
            }
        }

        if let Some(m) = &filter.module {
            let m_str = m.trim();
            if !m_str.is_empty() && !m_str.eq_ignore_ascii_case("all") {
                query.push_str(" AND LOWER(module) = LOWER(?)");
                params_vec.push(Box::new(m_str.to_string()));
            }
        }

        if let Some(st) = &filter.status {
            let st_str = st.trim();
            if !st_str.is_empty() && !st_str.eq_ignore_ascii_case("all") {
                query.push_str(" AND UPPER(status) = UPPER(?)");
                params_vec.push(Box::new(st_str.to_string()));
            }
        }

        if let Some(period) = &filter.period {
            let p = period.trim().to_lowercase();
            match p.as_str() {
                "today" | "24h" => {
                    query.push_str(" AND created_at >= datetime('now', '-24 hours')");
                }
                "week" | "7d" => {
                    query.push_str(" AND created_at >= datetime('now', '-7 days')");
                }
                "month" | "30d" => {
                    query.push_str(" AND created_at >= datetime('now', '-30 days')");
                }
                _ => {}
            }
        }

        if let Some(search) = &filter.search {
            let s = search.trim();
            if !s.is_empty() {
                query.push_str(" AND (user_message LIKE ? OR technical_details LIKE ? OR error_code LIKE ? OR operation LIKE ?)");
                let pattern = format!("%{}%", s);
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern));
            }
        }

        query.push_str(" ORDER BY created_at DESC");

        let limit = filter.limit.unwrap_or(200);
        if limit > 0 {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = filter.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }

        let mut stmt = conn.prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

        let rows = stmt.query_map(param_refs.as_slice(), |row| {
            Ok(ErrorLogEntry {
                id: row.get(0)?,
                created_at: row.get(1)?,
                severity: row.get(2)?,
                source: row.get(3)?,
                module: row.get(4)?,
                operation: row.get(5)?,
                task_id: row.get(6)?,
                error_code: row.get(7)?,
                user_message: row.get(8)?,
                technical_details: row.get(9)?,
                sanitized_stack: row.get(10)?,
                status: row.get(11)?,
                app_version: row.get(12)?,
                resolved_at: row.get(13)?,
            })
        })?;

        let mut results = Vec::new();
        for item in rows {
            results.push(item?);
        }
        Ok(results)
    }

    pub fn get_all_error_logs_for_export(&self, filter: Option<&ErrorLogFilter>) -> AppResult<Vec<ErrorLogEntry>> {
        let mut filter_copy = filter.cloned().unwrap_or_default();
        filter_copy.limit = Some(100_000);
        filter_copy.offset = Some(0);
        self.get_error_logs(&filter_copy)
    }

    pub fn get_error_log_by_id(&self, id: &str) -> AppResult<Option<ErrorLogEntry>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, created_at, severity, source, module, operation, task_id, error_code,
                   user_message, technical_details, sanitized_stack, status, app_version, resolved_at
            FROM error_logs WHERE id = ?1
            "#,
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(ErrorLogEntry {
                id: row.get(0)?,
                created_at: row.get(1)?,
                severity: row.get(2)?,
                source: row.get(3)?,
                module: row.get(4)?,
                operation: row.get(5)?,
                task_id: row.get(6)?,
                error_code: row.get(7)?,
                user_message: row.get(8)?,
                technical_details: row.get(9)?,
                sanitized_stack: row.get(10)?,
                status: row.get(11)?,
                app_version: row.get(12)?,
                resolved_at: row.get(13)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_error_log_by_task_id(&self, task_id: &str) -> AppResult<Option<ErrorLogEntry>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, created_at, severity, source, module, operation, task_id, error_code,
                   user_message, technical_details, sanitized_stack, status, app_version, resolved_at
            FROM error_logs WHERE task_id = ?1 ORDER BY created_at DESC LIMIT 1
            "#,
        )?;
        let mut rows = stmt.query(params![task_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(ErrorLogEntry {
                id: row.get(0)?,
                created_at: row.get(1)?,
                severity: row.get(2)?,
                source: row.get(3)?,
                module: row.get(4)?,
                operation: row.get(5)?,
                task_id: row.get(6)?,
                error_code: row.get(7)?,
                user_message: row.get(8)?,
                technical_details: row.get(9)?,
                sanitized_stack: row.get(10)?,
                status: row.get(11)?,
                app_version: row.get(12)?,
                resolved_at: row.get(13)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_error_stats(&self) -> AppResult<ErrorLogStats> {
        let conn = self.conn.lock();

        let total: i64 = conn.query_row("SELECT COUNT(*) FROM error_logs", [], |r| r.get(0))?;
        let critical: i64 = conn.query_row("SELECT COUNT(*) FROM error_logs WHERE severity = 'CRITICAL'", [], |r| r.get(0))?;
        let unresolved: i64 = conn.query_row("SELECT COUNT(*) FROM error_logs WHERE status = 'UNRESOLVED'", [], |r| r.get(0))?;

        // Calculate size from SQLite page count and page size
        let page_count: i64 = conn.query_row("PRAGMA page_count", [], |r| r.get(0)).unwrap_or(0);
        let page_size: i64 = conn.query_row("PRAGMA page_size", [], |r| r.get(0)).unwrap_or(4096);
        let size_bytes = page_count * page_size;

        Ok(ErrorLogStats {
            total,
            critical,
            unresolved,
            database_size_bytes: size_bytes,
        })
    }

    pub fn resolve_error_log(&self, id: &str, resolved: bool) -> AppResult<()> {
        let conn = self.conn.lock();
        if resolved {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE error_logs SET status = 'RESOLVED', resolved_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
        } else {
            conn.execute(
                "UPDATE error_logs SET status = 'UNRESOLVED', resolved_at = NULL WHERE id = ?1",
                params![id],
            )?;
        }
        Ok(())
    }

    pub fn clear_error_logs(&self, retention_days: Option<i64>) -> AppResult<usize> {
        let conn = self.conn.lock();
        let affected = if let Some(days) = retention_days {
            conn.execute(
                "DELETE FROM error_logs WHERE created_at < date('now', ?1)",
                params![format!("-{} days", days)],
            )?
        } else {
            conn.execute("DELETE FROM error_logs", [])?
        };
        Ok(affected)
    }

    // ==========================================
    // PREFERENCES
    // ==========================================

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
