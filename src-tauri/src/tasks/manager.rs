use crate::domain::{
    AudioConvertOptions, AudioTrimOptions, DownloadOptions, HistoryEntry, ImageConvertOptions,
    ImagesToPdfOptions, PosterOptions, Task, TaskStatus, VideoCompressOptions, VideoConvertOptions,
    VideoExtractAudioOptions, VideoExtractFrameOptions, VideoTrimOptions,
};
use crate::engines::{AudioEngine, DownloadEngine, ImageEngine, PosterEngine, VideoEngine};
use crate::error::{AppError, AppResult};
use crate::storage::Db;
use chrono::Local;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Semaphore};

pub enum TaskJob {
    Poster(PosterOptions),
    ConvertImages(ImageConvertOptions),
    ImagesToPdf(ImagesToPdfOptions),
    AudioConvert(AudioConvertOptions),
    AudioTrim(AudioTrimOptions),
    VideoConvert(VideoConvertOptions),
    VideoCompress(VideoCompressOptions),
    VideoTrim(VideoTrimOptions),
    VideoExtractAudio(VideoExtractAudioOptions),
    VideoExtractFrame(VideoExtractFrameOptions),
    DownloadMedia(DownloadOptions),
}

#[derive(Clone)]
pub struct TaskManager {
    db: Db,
    app_handle: Option<AppHandle>,
    cancel_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    concurrency_limit: Arc<AtomicUsize>,
    job_tx: mpsc::UnboundedSender<(Task, TaskJob)>,
}

impl TaskManager {
    pub fn new(db: Db, app_handle: Option<AppHandle>) -> Self {
        let (job_tx, mut job_rx) = mpsc::unbounded_channel::<(Task, TaskJob)>();
        let cancel_tokens = Arc::new(Mutex::new(HashMap::new()));
        let concurrency_limit = Arc::new(AtomicUsize::new(2));

        let db_clone = db.clone();
        let app_handle_clone = app_handle.clone();
        let cancel_tokens_clone = cancel_tokens.clone();
        let concurrency_clone = concurrency_limit.clone();

        // Background worker loop
        tauri::async_runtime::spawn(async move {
            let semaphore = Arc::new(Semaphore::new(concurrency_clone.load(Ordering::SeqCst)));

            while let Some((task, job)) = job_rx.recv().await {
                let permit = match semaphore.clone().acquire_owned().await {
                    Ok(p) => p,
                    Err(_) => break,
                };

                let db = db_clone.clone();
                let app = app_handle_clone.clone();
                let tokens = cancel_tokens_clone.clone();
                let task_id = task.id.clone();

                let cancel_flag = Arc::new(AtomicBool::new(false));
                {
                    tokens.lock().insert(task_id.clone(), cancel_flag.clone());
                }

                tauri::async_runtime::spawn(async move {
                    let _permit = permit;

                    // Update status to processing
                    let _ = db.update_task_status(&task_id, TaskStatus::Processing, 0.0, None, None);
                    if let Some(ref a) = app {
                        let _ = a.emit("task-status-changed", serde_json::json!({
                            "id": task_id,
                            "status": "processing",
                            "progress": 0.0
                        }));
                    }

                    let task_id_for_prog = task_id.clone();
                    let db_for_prog = db.clone();
                    let app_for_prog = app.clone();
                    let cancel_check = cancel_flag.clone();

                    let progress_cb = move |p: f64| {
                        let _ = db_for_prog.update_task_progress(&task_id_for_prog, p);
                        if let Some(ref a) = app_for_prog {
                            let _ = a.emit("task-progress", serde_json::json!({
                                "id": task_id_for_prog,
                                "progress": p
                            }));
                        }
                    };

                    // Run the actual job
                    let result: AppResult<String> = match job {
                        TaskJob::Poster(opts) => {
                            if cancel_check.load(Ordering::SeqCst) {
                                Err(AppError::Canceled)
                            } else {
                                tauri::async_runtime::spawn_blocking(move || {
                                    PosterEngine::generate_pdf(&opts, progress_cb)
                                })
                                .await
                                .map_err(|e| AppError::Internal(e.to_string()))
                                .and_then(|r| r)
                            }
                        }
                        TaskJob::ConvertImages(opts) => {
                            if cancel_check.load(Ordering::SeqCst) {
                                Err(AppError::Canceled)
                            } else {
                                tauri::async_runtime::spawn_blocking(move || {
                                    let res = ImageEngine::convert_batch(&opts, progress_cb)?;
                                    Ok(format!("{} imagens convertidas", res.len()))
                                })
                                .await
                                .map_err(|e| AppError::Internal(e.to_string()))
                                .and_then(|r| r)
                            }
                        }
                        TaskJob::ImagesToPdf(opts) => {
                            if cancel_check.load(Ordering::SeqCst) {
                                Err(AppError::Canceled)
                            } else {
                                tauri::async_runtime::spawn_blocking(move || {
                                    ImageEngine::images_to_pdf(&opts, progress_cb)
                                })
                                .await
                                .map_err(|e| AppError::Internal(e.to_string()))
                                .and_then(|r| r)
                            }
                        }
                        TaskJob::AudioConvert(opts) => {
                            AudioEngine::convert(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::AudioTrim(opts) => {
                            AudioEngine::trim(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::VideoConvert(opts) => {
                            VideoEngine::convert(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::VideoCompress(opts) => {
                            VideoEngine::compress(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::VideoTrim(opts) => {
                            VideoEngine::trim(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::VideoExtractAudio(opts) => {
                            AudioEngine::extract_audio_from_video(&opts, cancel_check.clone(), progress_cb).await
                        }
                        TaskJob::VideoExtractFrame(opts) => {
                            VideoEngine::extract_frame(&opts).await
                        }
                        TaskJob::DownloadMedia(opts) => {
                            DownloadEngine::download(&opts, cancel_check.clone(), progress_cb).await
                        }
                    };

                    let now = Local::now().format("%d %b, %H:%M").to_string();

                    match result {
                        Ok(target_file) => {
                            let _ = db.update_task_status(
                                &task_id,
                                TaskStatus::Done,
                                1.0,
                                None,
                                Some(&now),
                            );

                            let size_str = if let Ok(metadata) = std::fs::metadata(&target_file) {
                                format!("{:.1} MB", metadata.len() as f64 / (1024.0 * 1024.0))
                            } else {
                                task.size_mb
                                    .map(|s| format!("{:.1} MB", s))
                                    .unwrap_or_else(|| "—".into())
                            };

                            let history_entry = HistoryEntry {
                                id: task_id.clone(),
                                name: task.name.clone(),
                                op: task.op.clone(),
                                mod_name: task.mod_name.clone(),
                                status: "Concluído".to_string(),
                                date: now,
                                size: size_str,
                                file_path: Some(target_file),
                                error: None,
                            };
                            let _ = db.insert_history(&history_entry);

                            if let Some(ref a) = app {
                                let _ = a.emit("task-completed", serde_json::json!({
                                    "id": task_id,
                                    "status": "done",
                                    "progress": 1.0
                                }));
                            }
                        }
                        Err(AppError::Canceled) => {
                            let _ = db.update_task_status(
                                &task_id,
                                TaskStatus::Canceled,
                                0.0,
                                Some("Cancelado pelo usuário"),
                                Some(&now),
                            );
                            if let Some(ref a) = app {
                                let _ = a.emit("task-status-changed", serde_json::json!({
                                    "id": task_id,
                                    "status": "canceled",
                                    "error": "Cancelado pelo usuário"
                                }));
                            }
                        }
                        Err(err) => {
                            let err_msg = err.to_string();
                            let _ = db.update_task_status(
                                &task_id,
                                TaskStatus::Failed,
                                0.0,
                                Some(&err_msg),
                                Some(&now),
                            );

                            let history_entry = HistoryEntry {
                                id: task_id.clone(),
                                name: task.name.clone(),
                                op: task.op.clone(),
                                mod_name: task.mod_name.clone(),
                                status: "Erro".to_string(),
                                date: now,
                                size: "—".to_string(),
                                file_path: None,
                                error: Some(err_msg.clone()),
                            };
                            let _ = db.insert_history(&history_entry);

                            if let Some(ref a) = app {
                                let _ = a.emit("task-status-changed", serde_json::json!({
                                    "id": task_id,
                                    "status": "failed",
                                    "error": err_msg
                                }));
                            }
                        }
                    }

                    tokens.lock().remove(&task_id);
                });
            }
        });

        Self {
            db,
            app_handle,
            cancel_tokens,
            concurrency_limit,
            job_tx,
        }
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    pub fn set_concurrency(&self, limit: usize) {
        self.concurrency_limit.store(limit.clamp(1, 8), Ordering::SeqCst);
    }

    pub fn submit_task(&self, task: Task, job: TaskJob) -> AppResult<()> {
        self.db.insert_task(&task)?;

        if let Some(ref a) = self.app_handle {
            let _ = a.emit("task-created", &task);
        }

        self.job_tx
            .send((task, job))
            .map_err(|_| AppError::Internal("Fila de processamento encerrada".into()))?;

        Ok(())
    }

    pub fn cancel_task(&self, id: &str) -> AppResult<()> {
        if let Some(token) = self.cancel_tokens.lock().get(id) {
            token.store(true, Ordering::SeqCst);
        }

        let now = Local::now().format("%d %b, %H:%M").to_string();
        self.db.update_task_status(
            id,
            TaskStatus::Canceled,
            0.0,
            Some("Cancelado pelo usuário"),
            Some(&now),
        )?;

        if let Some(ref a) = self.app_handle {
            let _ = a.emit("task-status-changed", serde_json::json!({
                "id": id,
                "status": "canceled",
                "error": "Cancelado pelo usuário"
            }));
        }

        Ok(())
    }

    pub fn retry_task(&self, id: &str) -> AppResult<()> {
        let task_opt = self.db.get_task(id)?;
        if let Some(task) = task_opt {
            let options_json = task.options_json.clone().unwrap_or_default();
            let job = match task.mod_name.as_str() {
                "posters" => {
                    let opts: PosterOptions = serde_json::from_str(&options_json)
                        .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                    TaskJob::Poster(opts)
                }
                "images" => {
                    if task.op.contains("PDF") {
                        let opts: ImagesToPdfOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::ImagesToPdf(opts)
                    } else {
                        let opts: ImageConvertOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::ConvertImages(opts)
                    }
                }
                "audio" => {
                    if task.op.contains("Corte") {
                        let opts: AudioTrimOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::AudioTrim(opts)
                    } else {
                        let opts: AudioConvertOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::AudioConvert(opts)
                    }
                }
                "video" => {
                    if task.op.contains("Comprimir") {
                        let opts: VideoCompressOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::VideoCompress(opts)
                    } else if task.op.contains("Corte") {
                        let opts: VideoTrimOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::VideoTrim(opts)
                    } else if task.op.contains("Extrair áudio") {
                        let opts: VideoExtractAudioOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::VideoExtractAudio(opts)
                    } else {
                        let opts: VideoConvertOptions = serde_json::from_str(&options_json)
                            .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                        TaskJob::VideoConvert(opts)
                    }
                }
                "downloads" => {
                    let opts: DownloadOptions = serde_json::from_str(&options_json)
                        .map_err(|e| AppError::InvalidInput(format!("Opções inválidas: {}", e)))?;
                    TaskJob::DownloadMedia(opts)
                }
                _ => return Err(AppError::InvalidInput("Tipo de tarefa não suportado para repetição".into())),
            };

            let updated_task = Task {
                status: TaskStatus::Waiting,
                progress: 0.0,
                error: None,
                ..task
            };

            let _ = self.db.update_task_status(id, TaskStatus::Waiting, 0.0, None, None);
            if let Some(ref a) = self.app_handle {
                let _ = a.emit("task-status-changed", serde_json::json!({
                    "id": id,
                    "status": "waiting",
                    "progress": 0.0
                }));
            }

            self.job_tx
                .send((updated_task, job))
                .map_err(|_| AppError::Internal("Fila de processamento encerrada".into()))?;
        }

        Ok(())
    }
}
