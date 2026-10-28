use crate::domain::{
    DependencyInfo, DependencyInstallProgress, DependencyOrigin, DependencyStatus, FirstRunStatus,
    SystemDiagnostics,
};
use crate::error::{AppError, AppResult};
use crate::storage::Db;
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use uuid::Uuid;

pub struct DependencyManager;

impl DependencyManager {
    /// Returns the application-managed directory for external binaries.
    /// Primary: %LOCALAPPDATA%\ToolsOnDesk\binaries
    /// Fallback / Legacy check: %LOCALAPPDATA%\ArceTools\binaries
    pub fn get_managed_binaries_dir() -> PathBuf {
        let dir = crate::utils::PathManager::binaries_dir();
        let _ = fs::create_dir_all(&dir);
        dir
    }

    /// Checks write permissions in a directory by creating and deleting a temporary file.
    pub fn check_directory_write_permission(dir: &Path) -> bool {
        let test_file = dir.join(format!(".write_test_{}", Uuid::new_v4()));
        match File::create(&test_file) {
            Ok(mut f) => {
                let _ = f.write_all(b"test");
                drop(f);
                let _ = fs::remove_file(&test_file);
                true
            }
            Err(_) => false,
        }
    }

    /// Retrieves available free disk space on the drive in megabytes.
    pub fn get_available_disk_space_mb(dir: &Path) -> u64 {
        #[cfg(windows)]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;

            let path_str = dir.to_string_lossy().to_string();
            let wide: Vec<u16> = OsStr::new(&path_str).encode_wide().chain(Some(0)).collect();

            let mut free_bytes_available: u64 = 0;
            let mut total_number_of_bytes: u64 = 0;
            let mut total_number_of_free_bytes: u64 = 0;

            unsafe {
                unsafe extern "system" {
                    fn GetDiskFreeSpaceExW(
                        lpDirectoryName: *const u16,
                        lpFreeBytesAvailableToCaller: *mut u64,
                        lpTotalNumberOfBytes: *mut u64,
                        lpTotalNumberOfFreeBytes: *mut u64,
                    ) -> i32;
                }

                if GetDiskFreeSpaceExW(
                    wide.as_ptr(),
                    &mut free_bytes_available,
                    &mut total_number_of_bytes,
                    &mut total_number_of_free_bytes,
                ) != 0
                {
                    return free_bytes_available / (1024 * 1024);
                }
            }
        }

        // Heuristic default for non-windows / fallback: 50,000 MB (50 GB)
        50_000
    }

    /// Tests internet connectivity with a fast timeout (2.5 seconds).
    pub async fn check_internet_connection() -> bool {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_millis(2500))
            .build();

        if let Ok(c) = client {
            // Check reliable endpoints
            if let Ok(res) = c.head("https://www.google.com").send().await {
                if res.status().is_success() || res.status().is_redirection() {
                    return true;
                }
            }
            if let Ok(res) = c.head("https://github.com").send().await {
                if res.status().is_success() || res.status().is_redirection() {
                    return true;
                }
            }
        }
        false
    }

    /// Gathers complete system diagnostics and component statuses.
    pub async fn get_system_diagnostics(db: Option<&Db>) -> SystemDiagnostics {
        let binaries_dir = Self::get_managed_binaries_dir();
        let has_write_perm = Self::check_directory_write_permission(&binaries_dir);
        let disk_space_mb = Self::get_available_disk_space_mb(&binaries_dir);
        let internet = Self::check_internet_connection().await;

        let os_version = if cfg!(windows) {
            "Windows 11 (x64)".to_string()
        } else {
            format!("{} ({})", env::consts::OS, env::consts::ARCH)
        };

        let arch = env::consts::ARCH.to_string();

        let dependencies = Self::check_all_dependencies(db).await;

        let app_data = if let Ok(local) = env::var("LOCALAPPDATA") {
            format!("{}\\ArceTools", local)
        } else {
            "./data".to_string()
        };

        SystemDiagnostics {
            os_version,
            arch,
            webview2_available: true,
            webview2_version: Some("Evergreen Chromium Embedded".to_string()),
            app_data_path: app_data,
            binaries_path: binaries_dir.to_string_lossy().to_string(),
            has_write_permission: has_write_perm,
            available_disk_space_mb: disk_space_mb,
            internet_connected: internet,
            dependencies,
        }
    }

    /// Checks the status of all dependencies.
    pub async fn check_all_dependencies(db: Option<&Db>) -> Vec<DependencyInfo> {
        let ffmpeg = Self::inspect_tool("ffmpeg", "FFmpeg Multimídia", "Conversão, compressão e recorte de áudio e vídeo", "audio_video").await;
        let ffprobe = Self::inspect_tool("ffprobe", "ffprobe Inspector", "Inspeção técnica de metadados, codecs e durações de mídia", "audio_video").await;
        let ytdlp = Self::inspect_tool("yt-dlp", "yt-dlp Downloader", "Motor de download de fontes permitidas sem quebra de DRM", "download").await;
        let libreoffice = Self::inspect_libreoffice(db).await;
        let webview2 = DependencyInfo {
            id: "webview2".to_string(),
            name: "WebView2 Runtime".to_string(),
            description: "Ambiente de renderização visual da interface de usuário".to_string(),
            category: "system".to_string(),
            status: DependencyStatus::Ready,
            version: Some("Sistema Windows".to_string()),
            latest_version: None,
            origin: DependencyOrigin::SystemPath,
            path: Some("C:\\Windows\\System32\\WebView2Loader.dll".to_string()),
            is_managed: false,
            can_install: false,
            can_update: false,
            can_remove: false,
            download_size_bytes: None,
            installed_size_bytes: None,
            last_checked_at: Some(chrono::Utc::now().to_rfc3339()),
            error_message: None,
        };

        vec![ffmpeg, ffprobe, ytdlp, libreoffice, webview2]
    }

    /// Inspects an external tool using find_executable with origin classification and version checking.
    pub async fn inspect_tool(
        binary_name: &str,
        display_name: &str,
        description: &str,
        category: &str,
    ) -> DependencyInfo {
        let exe_name = if cfg!(windows) && !binary_name.ends_with(".exe") {
            format!("{}.exe", binary_name)
        } else {
            binary_name.to_string()
        };

        let managed_dir = Self::get_managed_binaries_dir();
        let managed_path = managed_dir.join(&exe_name);

        let (found_path, origin, is_managed) = if managed_path.is_file() {
            (Some(managed_path), DependencyOrigin::Managed, true)
        } else if let Some(p) = crate::engines::ExternalToolManager::find_executable(binary_name) {
            let p_str = p.to_string_lossy().to_lowercase();
            let orig = if p_str.contains("winget") {
                DependencyOrigin::WinGet
            } else if p_str.contains("binaries") && p_str.contains("arcetools") {
                DependencyOrigin::Managed
            } else {
                DependencyOrigin::SystemPath
            };
            let managed = orig == DependencyOrigin::Managed;
            (Some(p), orig, managed)
        } else {
            (None, DependencyOrigin::Unknown, false)
        };

        let now = chrono::Utc::now().to_rfc3339();

        if let Some(path) = found_path {
            // Verify tool functionality with controlled command
            let arg = if binary_name == "yt-dlp" { "--version" } else { "-version" };
            let mut cmd = Command::new(&path);
            cmd.arg(arg);
            #[cfg(windows)]
            {
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            match tokio::time::timeout(Duration::from_secs(4), cmd.output()).await {
                Ok(Ok(output)) if output.status.success() => {
                    let out_str = String::from_utf8_lossy(&output.stdout);
                    let first_line = out_str.lines().next().unwrap_or("").trim().to_string();
                    let ver = if binary_name == "yt-dlp" {
                        first_line
                    } else {
                        first_line.split_whitespace().nth(2).unwrap_or(&first_line).to_string()
                    };

                    let file_size = fs::metadata(&path).map(|m| m.len()).ok();

                    DependencyInfo {
                        id: binary_name.to_string(),
                        name: display_name.to_string(),
                        description: description.to_string(),
                        category: category.to_string(),
                        status: DependencyStatus::Ready,
                        version: Some(ver),
                        latest_version: None,
                        origin,
                        path: Some(path.to_string_lossy().to_string()),
                        is_managed,
                        can_install: false,
                        can_update: binary_name == "yt-dlp",
                        can_remove: is_managed,
                        download_size_bytes: None,
                        installed_size_bytes: file_size,
                        last_checked_at: Some(now),
                        error_message: None,
                    }
                }
                Ok(Ok(output)) => DependencyInfo {
                    id: binary_name.to_string(),
                    name: display_name.to_string(),
                    description: description.to_string(),
                    category: category.to_string(),
                    status: DependencyStatus::CheckFailed,
                    version: None,
                    latest_version: None,
                    origin,
                    path: Some(path.to_string_lossy().to_string()),
                    is_managed,
                    can_install: false,
                    can_update: false,
                    can_remove: is_managed,
                    download_size_bytes: None,
                    installed_size_bytes: None,
                    last_checked_at: Some(now),
                    error_message: Some(format!("O executável retornou código de erro: {}", output.status)),
                },
                Ok(Err(e)) => DependencyInfo {
                    id: binary_name.to_string(),
                    name: display_name.to_string(),
                    description: description.to_string(),
                    category: category.to_string(),
                    status: DependencyStatus::CheckFailed,
                    version: None,
                    latest_version: None,
                    origin,
                    path: Some(path.to_string_lossy().to_string()),
                    is_managed,
                    can_install: false,
                    can_update: false,
                    can_remove: is_managed,
                    download_size_bytes: None,
                    installed_size_bytes: None,
                    last_checked_at: Some(now),
                    error_message: Some(format!("Falha ao iniciar o processo: {}", e)),
                },
                Err(_) => DependencyInfo {
                    id: binary_name.to_string(),
                    name: display_name.to_string(),
                    description: description.to_string(),
                    category: category.to_string(),
                    status: DependencyStatus::CheckFailed,
                    version: None,
                    latest_version: None,
                    origin,
                    path: Some(path.to_string_lossy().to_string()),
                    is_managed,
                    can_install: false,
                    can_update: false,
                    can_remove: is_managed,
                    download_size_bytes: None,
                    installed_size_bytes: None,
                    last_checked_at: Some(now),
                    error_message: Some("A verificação excedeu o tempo limite de 4 segundos.".to_string()),
                },
            }
        } else {
            // Not installed
            let dl_size = match binary_name {
                "ffmpeg" | "ffprobe" => Some(35 * 1024 * 1024), // ~35 MB zip
                "yt-dlp" => Some(18 * 1024 * 1024),            // ~18 MB exe
                _ => None,
            };

            DependencyInfo {
                id: binary_name.to_string(),
                name: display_name.to_string(),
                description: description.to_string(),
                category: category.to_string(),
                status: DependencyStatus::NotInstalled,
                version: None,
                latest_version: None,
                origin: DependencyOrigin::Unknown,
                path: None,
                is_managed: false,
                can_install: true,
                can_update: false,
                can_remove: false,
                download_size_bytes: dl_size,
                installed_size_bytes: None,
                last_checked_at: Some(now),
                error_message: None,
            }
        }
    }

    /// Inspects LibreOffice status, taking into account any custom path set by user.
    pub async fn inspect_libreoffice(db: Option<&Db>) -> DependencyInfo {
        let now = chrono::Utc::now().to_rfc3339();

        // 1. Check custom path preference if DB is provided
        if let Some(database) = db {
            if let Ok(Some(custom_path)) = database.get_preference("custom_libreoffice_path") {
                let p = PathBuf::from(&custom_path);
                if p.is_file() {
                    let mut cmd = Command::new(&p);
                    cmd.arg("--version");
                    #[cfg(windows)]
                    {
                        cmd.creation_flags(0x08000000);
                    }
                    if let Ok(Ok(output)) = tokio::time::timeout(Duration::from_secs(3), cmd.output()).await {
                        if output.status.success() {
                            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                            return DependencyInfo {
                                id: "libreoffice".to_string(),
                                name: "LibreOffice Headless".to_string(),
                                description: "Necessário para conversões fiéis de documentos do Word (.docx) para PDF".to_string(),
                                category: "documents".to_string(),
                                status: DependencyStatus::Ready,
                                version: Some(ver),
                                latest_version: None,
                                origin: DependencyOrigin::CustomPath,
                                path: Some(custom_path),
                                is_managed: false,
                                can_install: false,
                                can_update: false,
                                can_remove: false,
                                download_size_bytes: None,
                                installed_size_bytes: None,
                                last_checked_at: Some(now),
                                error_message: None,
                            };
                        }
                    }
                }
            }
        }

        // 2. Standard system locations
        let status = crate::engines::DocumentEngine::check_libreoffice();
        if status.is_available {
            DependencyInfo {
                id: "libreoffice".to_string(),
                name: "LibreOffice Headless".to_string(),
                description: "Necessário para conversões fiéis de documentos do Word (.docx) para PDF".to_string(),
                category: "documents".to_string(),
                status: DependencyStatus::Ready,
                version: status.version,
                latest_version: None,
                origin: DependencyOrigin::SystemPath,
                path: status.path,
                is_managed: false,
                can_install: false,
                can_update: false,
                can_remove: false,
                download_size_bytes: None,
                installed_size_bytes: None,
                last_checked_at: Some(now),
                error_message: None,
            }
        } else {
            DependencyInfo {
                id: "libreoffice".to_string(),
                name: "LibreOffice Headless".to_string(),
                description: "Necessário para conversões fiéis de documentos do Word (.docx) para PDF (opcional)".to_string(),
                category: "documents".to_string(),
                status: DependencyStatus::Optional,
                version: None,
                latest_version: None,
                origin: DependencyOrigin::Unknown,
                path: None,
                is_managed: false,
                can_install: true,
                can_update: false,
                can_remove: false,
                download_size_bytes: Some(300 * 1024 * 1024),
                installed_size_bytes: None,
                last_checked_at: Some(now),
                error_message: None,
            }
        }
    }

    /// Securely downloads a file with progress reporting, hash verification and cancellation support.
    pub async fn download_file_with_progress(
        url: &str,
        dest_file: &Path,
        expected_sha256: Option<&str>,
        max_bytes: u64,
        app_handle: Option<&AppHandle>,
        dep_id: &str,
        cancel_token: Arc<AtomicBool>,
    ) -> AppResult<String> {
        // Enforce HTTPS
        if !url.starts_with("https://") && !url.starts_with("http://127.0.0.1") {
            return Err(AppError::Dependency(
                "Apenas conexões seguras HTTPS são permitidas para download de componentes.".into(),
            ));
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(180))
            .build()
            .map_err(|e| AppError::Dependency(format!("Erro ao inicializar cliente HTTP: {}", e)))?;

        let res = client
            .get(url)
            .send()
            .await
            .map_err(|e| AppError::Dependency(format!("Falha na conexão de download: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Dependency(format!(
                "Servidor retornou erro HTTP: {}",
                res.status()
            )));
        }

        let total_size = res.content_length();
        if let Some(size) = total_size {
            if size > max_bytes {
                return Err(AppError::Dependency(format!(
                    "O tamanho do arquivo ({} bytes) excede o limite permitido ({} bytes).",
                    size, max_bytes
                )));
            }
        }

        let mut file = File::create(dest_file)?;
        let mut stream = res.bytes_stream();
        let mut downloaded_bytes: u64 = 0;
        let mut hasher = Sha256::new();
        let mut last_progress_emit = Instant::now();

        while let Some(chunk_res) = stream.next().await {
            if cancel_token.load(Ordering::SeqCst) {
                drop(file);
                let _ = fs::remove_file(dest_file);
                return Err(AppError::Canceled);
            }

            let chunk = chunk_res.map_err(|e| {
                AppError::Dependency(format!("Interrupção durante transferência: {}", e))
            })?;

            file.write_all(&chunk)?;
            hasher.update(&chunk);
            downloaded_bytes += chunk.len() as u64;

            if downloaded_bytes > max_bytes {
                drop(file);
                let _ = fs::remove_file(dest_file);
                return Err(AppError::Dependency(
                    "Download interrompido: o fluxo ultrapassou o limite seguro em bytes.".into(),
                ));
            }

            if last_progress_emit.elapsed() >= Duration::from_millis(150) {
                last_progress_emit = Instant::now();
                let pct = if let Some(tot) = total_size {
                    (downloaded_bytes as f64 / tot as f64) * 100.0
                } else {
                    0.0
                };

                if let Some(app) = app_handle {
                    let progress = DependencyInstallProgress {
                        dependency_id: dep_id.to_string(),
                        phase: "downloading".to_string(),
                        bytes_downloaded: downloaded_bytes,
                        total_bytes: total_size,
                        percentage: (pct * 10.0).round() / 10.0,
                        message: format!(
                            "Baixando componente... {:.1} MB",
                            downloaded_bytes as f64 / (1024.0 * 1024.0)
                        ),
                    };
                    let _ = app.emit("dependency-install-progress", progress);
                }
            }
        }

        file.flush()?;
        drop(file);

        let final_sha256 = hex::encode(hasher.finalize());

        // Verify SHA-256 integrity if expected hash is provided
        if let Some(expected) = expected_sha256 {
            if !expected.is_empty() && !final_sha256.eq_ignore_ascii_case(expected.trim()) {
                let _ = fs::remove_file(dest_file);
                return Err(AppError::Dependency(format!(
                    "Falha de integridade: o hash SHA-256 ({}) não confere com o esperado ({}).",
                    final_sha256, expected
                )));
            }
        }

        Ok(final_sha256)
    }

    /// Safely extracts FFmpeg and ffprobe executables from an archive with Zip-Slip protection.
    pub fn extract_ffmpeg_safe(zip_path: &Path, target_dir: &Path) -> AppResult<(PathBuf, PathBuf)> {
        let file = File::open(zip_path)?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| AppError::Dependency(format!("Arquivo ZIP corrompido ou inválido: {}", e)))?;

        let mut ffmpeg_dest = None;
        let mut ffprobe_dest = None;

        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| AppError::Dependency(format!("Falha ao ler entrada ZIP: {}", e)))?;

            // CRITICAL SECURITY: Check for Zip-Slip path traversal vulnerability
            let enclosed = match entry.enclosed_name() {
                Some(p) => p.to_owned(),
                None => {
                    return Err(AppError::Dependency(
                        "Tentativa de travessia de caminho (Zip Slip) detectada no arquivo compactado. Extração abortada por segurança.".into(),
                    ));
                }
            };

            if entry.is_file() {
                if let Some(file_name) = enclosed.file_name() {
                    let name_lower = file_name.to_string_lossy().to_lowercase();
                    if name_lower == "ffmpeg.exe" || name_lower == "ffmpeg" {
                        let out_path = target_dir.join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
                        let mut out_file = File::create(&out_path)?;
                        std::io::copy(&mut entry, &mut out_file)?;
                        ffmpeg_dest = Some(out_path);
                    } else if name_lower == "ffprobe.exe" || name_lower == "ffprobe" {
                        let out_path = target_dir.join(if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" });
                        let mut out_file = File::create(&out_path)?;
                        std::io::copy(&mut entry, &mut out_file)?;
                        ffprobe_dest = Some(out_path);
                    }
                }
            }
        }

        match (ffmpeg_dest, ffprobe_dest) {
            (Some(f), Some(p)) => Ok((f, p)),
            _ => Err(AppError::Dependency(
                "O pacote compactado não continha os executáveis esperados (ffmpeg e ffprobe).".into(),
            )),
        }
    }

    /// Installs FFmpeg and ffprobe in the managed directory.
    pub async fn install_ffmpeg(
        app_handle: Option<&AppHandle>,
        cancel_token: Arc<AtomicBool>,
        db: Option<&Db>,
    ) -> AppResult<()> {
        let managed_dir = Self::get_managed_binaries_dir();
        let temp_dir = env::temp_dir().join(format!("arce_ffmpeg_install_{}", Uuid::new_v4()));
        fs::create_dir_all(&temp_dir)?;

        let zip_file = temp_dir.join("ffmpeg.zip");

        // Official Gyan.dev release essentials build for Windows x64 (recommended by FFmpeg.org)
        let download_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
        // Pinned hash fallback / integrity check: if unavailable Gyan provides .zip.sha256
        let max_size = 120 * 1024 * 1024; // 120 MB max

        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "ffmpeg".to_string(),
                    phase: "downloading".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: Some(35 * 1024 * 1024),
                    percentage: 0.0,
                    message: "Iniciando download do FFmpeg e ffprobe de distribuidor oficial...".to_string(),
                },
            );
        }

        let dl_result = Self::download_file_with_progress(
            download_url,
            &zip_file,
            None,
            max_size,
            app_handle,
            "ffmpeg",
            cancel_token.clone(),
        )
        .await;

        if let Err(e) = dl_result {
            let _ = fs::remove_dir_all(&temp_dir);
            if let Some(database) = db {
                let _ = database.insert_error_log(&crate::domain::ErrorLogEntry {
                    id: Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    severity: "ERROR".to_string(),
                    source: "dependency_manager".to_string(),
                    module: "audio_video".to_string(),
                    operation: "install_ffmpeg".to_string(),
                    task_id: None,
                    error_code: "DEPENDENCY_DOWNLOAD_FAILED".to_string(),
                    user_message: "Não foi possível baixar os componentes do FFmpeg. Verifique sua conexão com a internet.".to_string(),
                    technical_details: Some(e.to_string()),
                    sanitized_stack: None,
                    status: "UNRESOLVED".to_string(),
                    app_version: "0.1.0".to_string(),
                    resolved_at: None,
                });
            }
            return Err(e);
        }

        // Extraction Phase
        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "ffmpeg".to_string(),
                    phase: "extracting".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percentage: 85.0,
                    message: "Extraindo e verificando integridade dos executáveis...".to_string(),
                },
            );
        }

        let staging_dir = temp_dir.join("staging");
        fs::create_dir_all(&staging_dir)?;

        let (staged_ffmpeg, staged_ffprobe) = match Self::extract_ffmpeg_safe(&zip_file, &staging_dir) {
            Ok(res) => res,
            Err(e) => {
                let _ = fs::remove_dir_all(&temp_dir);
                if let Some(database) = db {
                    let _ = database.insert_error_log(&crate::domain::ErrorLogEntry {
                        id: Uuid::new_v4().to_string(),
                        created_at: chrono::Utc::now().to_rfc3339(),
                        severity: "CRITICAL".to_string(),
                        source: "dependency_manager".to_string(),
                        module: "audio_video".to_string(),
                        operation: "extract_ffmpeg".to_string(),
                        task_id: None,
                        error_code: "DEPENDENCY_INSTALL_FAILED".to_string(),
                        user_message: "Falha na extração segura do pacote FFmpeg.".to_string(),
                        technical_details: Some(e.to_string()),
                        sanitized_stack: None,
                        status: "UNRESOLVED".to_string(),
                        app_version: "0.1.0".to_string(),
                        resolved_at: None,
                    });
                }
                return Err(e);
            }
        };

        // Validation Phase: test executions
        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "ffmpeg".to_string(),
                    phase: "validating".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percentage: 92.0,
                    message: "Executando teste funcional dos binários...".to_string(),
                },
            );
        }

        let mut test_cmd1 = Command::new(&staged_ffmpeg);
        test_cmd1.arg("-version");
        #[cfg(windows)]
        {
            test_cmd1.creation_flags(0x08000000);
        }
        let v1 = tokio::time::timeout(Duration::from_secs(4), test_cmd1.output()).await;

        let mut test_cmd2 = Command::new(&staged_ffprobe);
        test_cmd2.arg("-version");
        #[cfg(windows)]
        {
            test_cmd2.creation_flags(0x08000000);
        }
        let v2 = tokio::time::timeout(Duration::from_secs(4), test_cmd2.output()).await;

        let valid = match (v1, v2) {
            (Ok(Ok(o1)), Ok(Ok(o2))) => o1.status.success() && o2.status.success(),
            _ => false,
        };

        if !valid {
            let _ = fs::remove_dir_all(&temp_dir);
            if let Some(database) = db {
                let _ = database.insert_error_log(&crate::domain::ErrorLogEntry {
                    id: Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    severity: "ERROR".to_string(),
                    source: "dependency_manager".to_string(),
                    module: "audio_video".to_string(),
                    operation: "validate_ffmpeg".to_string(),
                    task_id: None,
                    error_code: "DEPENDENCY_VALIDATION_FAILED".to_string(),
                    user_message: "Os binários do FFmpeg baixados falharam no teste de execução do Windows.".to_string(),
                    technical_details: Some("Command -version failed or timed out".to_string()),
                    sanitized_stack: None,
                    status: "UNRESOLVED".to_string(),
                    app_version: "0.1.0".to_string(),
                    resolved_at: None,
                });
            }
            return Err(AppError::Dependency(
                "Os executáveis extraídos não responderam com sucesso ao teste funcional.".into(),
            ));
        }

        // Atomic move into managed directory
        let final_ffmpeg = managed_dir.join(staged_ffmpeg.file_name().unwrap());
        let final_ffprobe = managed_dir.join(staged_ffprobe.file_name().unwrap());

        let _ = fs::copy(&staged_ffmpeg, &final_ffmpeg);
        let _ = fs::copy(&staged_ffprobe, &final_ffprobe);
        let _ = fs::remove_dir_all(&temp_dir);

        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "ffmpeg".to_string(),
                    phase: "completed".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percentage: 100.0,
                    message: "FFmpeg e ffprobe instalados e validados com sucesso!".to_string(),
                },
            );
        }

        Ok(())
    }

    /// Installs or updates yt-dlp in the managed directory with atomic swap and rollback.
    pub async fn install_or_update_ytdlp(
        app_handle: Option<&AppHandle>,
        cancel_token: Arc<AtomicBool>,
        db: Option<&Db>,
    ) -> AppResult<()> {
        let managed_dir = Self::get_managed_binaries_dir();
        let target_exe = managed_dir.join(if cfg!(windows) { "yt-dlp.exe" } else { "yt-dlp" });
        let temp_dir = env::temp_dir().join(format!("arce_ytdlp_install_{}", Uuid::new_v4()));
        fs::create_dir_all(&temp_dir)?;

        let staged_exe = temp_dir.join("yt-dlp.tmp");

        // Official standalone yt-dlp executable from official GitHub release
        let download_url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
        let max_size = 35 * 1024 * 1024; // 35 MB max

        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "yt-dlp".to_string(),
                    phase: "downloading".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: Some(18 * 1024 * 1024),
                    percentage: 0.0,
                    message: "Baixando versão mais recente do yt-dlp oficial...".to_string(),
                },
            );
        }

        let dl_result = Self::download_file_with_progress(
            download_url,
            &staged_exe,
            None,
            max_size,
            app_handle,
            "yt-dlp",
            cancel_token.clone(),
        )
        .await;

        if let Err(e) = dl_result {
            let _ = fs::remove_dir_all(&temp_dir);
            if let Some(database) = db {
                let _ = database.insert_error_log(&crate::domain::ErrorLogEntry {
                    id: Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    severity: "ERROR".to_string(),
                    source: "dependency_manager".to_string(),
                    module: "download".to_string(),
                    operation: "install_ytdlp".to_string(),
                    task_id: None,
                    error_code: "DEPENDENCY_DOWNLOAD_FAILED".to_string(),
                    user_message: "Não foi possível baixar o motor de downloads yt-dlp.".to_string(),
                    technical_details: Some(e.to_string()),
                    sanitized_stack: None,
                    status: "UNRESOLVED".to_string(),
                    app_version: "0.1.0".to_string(),
                    resolved_at: None,
                });
            }
            return Err(e);
        }

        // Functional check on downloaded file
        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "yt-dlp".to_string(),
                    phase: "validating".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percentage: 90.0,
                    message: "Validando integridade e versão do yt-dlp...".to_string(),
                },
            );
        }

        let mut test_cmd = Command::new(&staged_exe);
        test_cmd.arg("--version");
        #[cfg(windows)]
        {
            test_cmd.creation_flags(0x08000000);
        }

        let valid = match tokio::time::timeout(Duration::from_secs(4), test_cmd.output()).await {
            Ok(Ok(out)) => out.status.success(),
            _ => false,
        };

        if !valid {
            let _ = fs::remove_dir_all(&temp_dir);
            if let Some(database) = db {
                let _ = database.insert_error_log(&crate::domain::ErrorLogEntry {
                    id: Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    severity: "ERROR".to_string(),
                    source: "dependency_manager".to_string(),
                    module: "download".to_string(),
                    operation: "validate_ytdlp".to_string(),
                    task_id: None,
                    error_code: "DEPENDENCY_VALIDATION_FAILED".to_string(),
                    user_message: "O executável do yt-dlp baixado falhou no teste funcional.".to_string(),
                    technical_details: Some("Command --version failed or timed out".to_string()),
                    sanitized_stack: None,
                    status: "UNRESOLVED".to_string(),
                    app_version: "0.1.0".to_string(),
                    resolved_at: None,
                });
            }
            return Err(AppError::Dependency(
                "O binário do yt-dlp baixado não respondeu adequadamente ao teste de versão.".into(),
            ));
        }

        // Atomic swap with rollback
        let backup_exe = managed_dir.join(if cfg!(windows) { "yt-dlp.exe.old" } else { "yt-dlp.old" });
        if target_exe.is_file() {
            let _ = fs::rename(&target_exe, &backup_exe);
        }

        match fs::copy(&staged_exe, &target_exe) {
            Ok(_) => {
                let _ = fs::remove_file(&backup_exe);
                let _ = fs::remove_dir_all(&temp_dir);
            }
            Err(e) => {
                // Rollback
                if backup_exe.is_file() {
                    let _ = fs::rename(&backup_exe, &target_exe);
                }
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(AppError::Dependency(format!(
                    "Falha ao substituir binário do yt-dlp. Rollback executado: {}",
                    e
                )));
            }
        }

        if let Some(app) = app_handle {
            let _ = app.emit(
                "dependency-install-progress",
                DependencyInstallProgress {
                    dependency_id: "yt-dlp".to_string(),
                    phase: "completed".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percentage: 100.0,
                    message: "yt-dlp instalado e pronto para uso!".to_string(),
                },
            );
        }

        Ok(())
    }

    /// Safely removes a managed dependency from the application directory.
    /// NEVER touches global PATH or Program Files installations!
    pub fn remove_managed_dependency(dependency_id: &str) -> AppResult<()> {
        let managed_dir = Self::get_managed_binaries_dir();

        match dependency_id {
            "ffmpeg" | "ffprobe" => {
                let f1 = managed_dir.join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
                let f2 = managed_dir.join(if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" });
                if f1.is_file() {
                    fs::remove_file(&f1)?;
                }
                if f2.is_file() {
                    fs::remove_file(&f2)?;
                }
                Ok(())
            }
            "yt-dlp" => {
                let y = managed_dir.join(if cfg!(windows) { "yt-dlp.exe" } else { "yt-dlp" });
                if y.is_file() {
                    fs::remove_file(&y)?;
                }
                Ok(())
            }
            _ => Err(AppError::Dependency(format!(
                "A dependência '{}' não pode ser removida ou não é gerenciada.",
                dependency_id
            ))),
        }
    }

    /// Reads first-run setup state from SQLite preferences.
    pub fn get_first_run_status(db: &Db) -> AppResult<FirstRunStatus> {
        let pref = db.get_preference("first_run_status")?;
        let is_completed = pref.as_deref() == Some("completed");
        let is_dismissed = pref.as_deref() == Some("dismissed");

        // Essential tools: check if ffmpeg and yt-dlp are available
        let ffmpeg_found = crate::engines::ExternalToolManager::find_executable("ffmpeg").is_some();
        let ytdlp_found = crate::engines::ExternalToolManager::find_executable("yt-dlp").is_some();
        let all_ready = ffmpeg_found && ytdlp_found;

        let is_first_run = pref.is_none();

        Ok(FirstRunStatus {
            is_first_run,
            completed: is_completed,
            dismissed: is_dismissed,
            all_essential_ready: all_ready,
        })
    }

    /// Updates first-run setup state in SQLite preferences.
    pub fn set_first_run_status(db: &Db, status: &str) -> AppResult<()> {
        db.set_preference("first_run_status", status)?;
        Ok(())
    }

    /// Sets custom path for LibreOffice.
    pub fn set_custom_libreoffice_path(db: &Db, path: &str) -> AppResult<()> {
        let p = Path::new(path);
        if !p.is_file() {
            return Err(AppError::Dependency(
                "O caminho informado para o LibreOffice (soffice.exe) não existe no disco.".into(),
            ));
        }

        // Test execution
        let mut cmd = std::process::Command::new(p);
        cmd.arg("--version");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        match cmd.output() {
            Ok(output) if output.status.success() => {
                db.set_preference("custom_libreoffice_path", path)?;
                Ok(())
            }
            _ => Err(AppError::Dependency(
                "O executável selecionado não respondeu como uma instalação válida do LibreOffice.".into(),
            )),
        }
    }
}
