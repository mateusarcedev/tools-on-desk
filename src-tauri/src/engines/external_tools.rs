use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub name: String,
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub license: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalToolsStatus {
    pub ffmpeg: ToolStatus,
    pub ffprobe: ToolStatus,
    pub yt_dlp: ToolStatus,
}

pub struct ExternalToolManager;

impl ExternalToolManager {
    /// Locate an executable checking next to current binary, known WinGet/ProgramFiles paths, and PATH.
    pub fn find_executable(binary_name: &str) -> Option<PathBuf> {
        let exe_name = if cfg!(windows) && !binary_name.ends_with(".exe") {
            format!("{}.exe", binary_name)
        } else {
            binary_name.to_string()
        };

        // 1. Check relative to current exe
        if let Ok(current_exe) = env::current_exe() {
            if let Some(parent) = current_exe.parent() {
                let candidate = parent.join(&exe_name);
                if candidate.is_file() {
                    return Some(candidate);
                }
                let bin_candidate = parent.join("binaries").join(&exe_name);
                if bin_candidate.is_file() {
                    return Some(bin_candidate);
                }
            }
        }

        // 2. Check current working directory and src-tauri/binaries
        let cwd_candidate = PathBuf::from("binaries").join(&exe_name);
        if cwd_candidate.is_file() {
            return Some(cwd_candidate);
        }

        // 3. Check Windows specific directories (WinGet packages, links, AppData)
        if cfg!(windows) {
            if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
                let local_path = Path::new(&local_app_data);

                // Check ArceTools local binaries cache
                let arce_bin = local_path.join("ArceTools").join("binaries").join(&exe_name);
                if arce_bin.is_file() {
                    return Some(arce_bin);
                }

                // Check WinGet Links
                let links_bin = local_path.join("Microsoft").join("WinGet").join("Links").join(&exe_name);
                if links_bin.is_file() {
                    return Some(links_bin);
                }

                // Check WinGet Packages
                let winget_dir = local_path.join("Microsoft").join("WinGet").join("Packages");
                if winget_dir.is_dir() {
                    if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if !path.is_dir() {
                                continue;
                            }
                            let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                            
                            // Check for ffmpeg/ffprobe
                            if (binary_name == "ffmpeg" || binary_name == "ffprobe") 
                                && (dir_name.contains("FFmpeg") || dir_name.contains("ffmpeg")) {
                                let direct = path.join("bin").join(&exe_name);
                                if direct.is_file() {
                                    return Some(direct);
                                }
                                // Search 1 level down
                                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                                    for sub in sub_entries.flatten() {
                                        let sub_bin = sub.path().join("bin").join(&exe_name);
                                        if sub_bin.is_file() {
                                            return Some(sub_bin);
                                        }
                                    }
                                }
                            }

                            // Check for yt-dlp
                            if binary_name == "yt-dlp" && dir_name.contains("yt-dlp") {
                                let direct = path.join(&exe_name);
                                if direct.is_file() {
                                    return Some(direct);
                                }
                                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                                    for sub in sub_entries.flatten() {
                                        let sub_bin = sub.path().join(&exe_name);
                                        if sub_bin.is_file() {
                                            return Some(sub_bin);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Search in PATH environment variable
        if let Ok(path_var) = env::var("PATH") {
            let separator = if cfg!(windows) { ';' } else { ':' };
            for part in path_var.split(separator) {
                let candidate = Path::new(part).join(&exe_name);
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }

        None
    }

    pub fn get_ffmpeg() -> AppResult<PathBuf> {
        Self::find_executable("ffmpeg")
            .ok_or_else(|| AppError::Internal("FFmpeg não foi encontrado no sistema. Instale ou configure o binário.".into()))
    }

    pub fn get_ffprobe() -> AppResult<PathBuf> {
        Self::find_executable("ffprobe")
            .ok_or_else(|| AppError::Internal("ffprobe não foi encontrado no sistema. Instale ou configure o binário.".into()))
    }

    pub fn get_ytdlp() -> AppResult<PathBuf> {
        Self::find_executable("yt-dlp")
            .ok_or_else(|| AppError::Internal("yt-dlp não foi encontrado no sistema. Instale ou configure o binário.".into()))
    }

    /// Check statuses of all 3 external tools
    pub async fn check_all_tools() -> ExternalToolsStatus {
        let ffmpeg_status = Self::probe_tool("ffmpeg", &["-version"]).await;
        let ffprobe_status = Self::probe_tool("ffprobe", &["-version"]).await;
        let ytdlp_status = Self::probe_tool("yt-dlp", &["--version"]).await;

        ExternalToolsStatus {
            ffmpeg: ffmpeg_status,
            ffprobe: ffprobe_status,
            yt_dlp: ytdlp_status,
        }
    }

    async fn probe_tool(name: &str, args: &[&str]) -> ToolStatus {
        let path_opt = Self::find_executable(name);
        match path_opt {
            Some(path) => {
                let mut cmd = Command::new(&path);
                cmd.args(args);
                #[cfg(windows)]
                {
                    // CREATE_NO_WINDOW = 0x08000000
                    cmd.creation_flags(0x08000000);
                }
                match cmd.output().await {
                    Ok(output) if output.status.success() => {
                        let text = String::from_utf8_lossy(&output.stdout).to_string();
                        let first_line = text.lines().next().unwrap_or("").trim().to_string();
                        let license = if text.contains("GPL version 3") {
                            Some("GPL v3".to_string())
                        } else if text.contains("LGPL") {
                            Some("LGPL".to_string())
                        } else if name == "yt-dlp" {
                            Some("Unlicense".to_string())
                        } else {
                            None
                        };

                        ToolStatus {
                            name: name.to_string(),
                            available: true,
                            version: Some(first_line),
                            path: Some(path.to_string_lossy().to_string()),
                            license,
                            details: Some("Operacional".to_string()),
                        }
                    }
                    Ok(output) => ToolStatus {
                        name: name.to_string(),
                        available: false,
                        version: None,
                        path: Some(path.to_string_lossy().to_string()),
                        license: None,
                        details: Some(format!("Código de saída: {}", output.status)),
                    },
                    Err(e) => ToolStatus {
                        name: name.to_string(),
                        available: false,
                        version: None,
                        path: Some(path.to_string_lossy().to_string()),
                        license: None,
                        details: Some(format!("Falha ao executar: {}", e)),
                    },
                }
            }
            None => ToolStatus {
                name: name.to_string(),
                available: false,
                version: None,
                path: None,
                license: None,
                details: Some("Executável não encontrado".to_string()),
            },
        }
    }

    /// Run a command safely with line-by-line monitoring and cancellation support
    pub async fn run_with_cancellation<F>(
        cmd_path: &Path,
        args: &[String],
        cancel_token: Arc<AtomicBool>,
        mut on_line: F,
    ) -> AppResult<()>
    where
        F: FnMut(&str) + Send + 'static,
    {
        let mut cmd = Command::new(cmd_path);
        cmd.args(args);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        #[cfg(windows)]
        {
            // CREATE_NO_WINDOW = 0x08000000
            cmd.creation_flags(0x08000000);
        }

        let mut child = cmd.spawn().map_err(|e| {
            AppError::Internal(format!("Falha ao iniciar processo {}: {}", cmd_path.display(), e))
        })?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let mut stdout_reader = stdout.map(|s| BufReader::new(s).lines());
        let mut stderr_reader = stderr.map(|s| BufReader::new(s).lines());

        loop {
            // Check cancellation
            if cancel_token.load(Ordering::SeqCst) {
                #[cfg(windows)]
                if let Some(pid) = child.id() {
                    let mut kill_cmd = std::process::Command::new("taskkill");
                    kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
                    #[cfg(windows)]
                    {
                        use std::os::windows::process::CommandExt;
                        kill_cmd.creation_flags(0x08000000);
                    }
                    let _ = kill_cmd.output();
                }
                let _ = child.kill().await;
                return Err(AppError::Canceled);
            }

            tokio::select! {
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(200)) => {
                    // Periodic check in case process is blocked without generating stdout/stderr
                    continue;
                }

                line_res = async {
                    if let Some(ref mut reader) = stdout_reader {
                        reader.next_line().await
                    } else {
                        Ok(None)
                    }
                } => {
                    match line_res {
                        Ok(Some(line)) => on_line(&line),
                        Ok(None) => {},
                        Err(_) => {},
                    }
                }

                err_res = async {
                    if let Some(ref mut reader) = stderr_reader {
                        reader.next_line().await
                    } else {
                        Ok(None)
                    }
                } => {
                    match err_res {
                        Ok(Some(line)) => on_line(&line),
                        Ok(None) => {},
                        Err(_) => {},
                    }
                }

                status_res = child.wait() => {
                    let status = status_res.map_err(|e| AppError::Internal(format!("Erro ao aguardar processo: {}", e)))?;
                    if cancel_token.load(Ordering::SeqCst) {
                        return Err(AppError::Canceled);
                    }
                    if !status.success() {
                        return Err(AppError::Internal(format!("Processo encerrou com status: {}", status)));
                    }
                    return Ok(());
                }
            }
        }
    }
}
