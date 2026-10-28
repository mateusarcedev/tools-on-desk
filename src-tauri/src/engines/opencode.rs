use crate::domain::OpenCodeStatus;
use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::process::Command;

pub struct OpenCodeManager;

impl OpenCodeManager {
    /// Discovers if opencode is installed on the machine
    pub async fn check_status(workspace_base: &Path) -> OpenCodeStatus {
        let binary_path = Self::find_opencode_binary();
        let installed = binary_path.is_some();
        let mut version = None;

        if let Some(ref bin) = binary_path {
            if let Ok(v) = Self::probe_version(bin).await {
                version = Some(v);
            }
        }

        let workspace_path = workspace_base.join("opencode_workspace").to_string_lossy().to_string();

        OpenCodeStatus {
            installed,
            version,
            binary_path: binary_path.map(|p| p.to_string_lossy().to_string()),
            running: false,
            workspace_path,
        }
    }

    fn find_opencode_binary() -> Option<PathBuf> {
        // 1. Direct PATH lookup
        if let Ok(path) = which_path("opencode") {
            return Some(path);
        }

        #[cfg(target_os = "windows")]
        {
            // 2. LocalAppData Programs
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let p1 = PathBuf::from(&local_app_data).join("Programs").join("OpenCode").join("opencode.exe");
                if p1.is_file() {
                    return Some(p1);
                }
            }

            // 3. AppData npm
            if let Ok(app_data) = std::env::var("APPDATA") {
                let p2 = PathBuf::from(&app_data).join("npm").join("opencode.cmd");
                if p2.is_file() {
                    return Some(p2);
                }
            }
        }

        None
    }

    async fn probe_version(binary: &Path) -> AppResult<String> {
        let mut cmd = Command::new(binary);
        cmd.arg("--version");

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = tokio::time::timeout(Duration::from_secs(5), cmd.output())
            .await
            .map_err(|_| AppError::OpenCode("Timeout ao verificar versão do OpenCode".into()))?
            .map_err(|e| AppError::OpenCode(format!("Falha ao executar OpenCode: {}", e)))?;

        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(ver)
        } else {
            Err(AppError::OpenCode("Comando opencode --version retornou código de erro".into()))
        }
    }

    /// Executes an OpenCode task within an isolated project sandbox directory
    pub async fn run_sandboxed_task(
        workspace_dir: &Path,
        task_instruction: &str,
        cancel_token: Arc<AtomicBool>,
    ) -> AppResult<String> {
        let binary = Self::find_opencode_binary()
            .ok_or_else(|| AppError::OpenCode("OpenCode não encontrado no sistema. O estúdio utilizará o orquestrador nativo de IA.".into()))?;

        let _ = std::fs::create_dir_all(workspace_dir);

        let mut cmd = Command::new(&binary);
        cmd.arg("run")
            .arg("--dir")
            .arg(workspace_dir)
            .arg(task_instruction);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd.spawn()
            .map_err(|e| AppError::OpenCode(format!("Falha ao iniciar processo do OpenCode: {}", e)))?;

        // Watch for cancellation
        let cancel_clone = cancel_token.clone();
        let child_task = async {
            child.wait().await
        };

        tokio::select! {
            res = child_task => {
                match res {
                    Ok(exit_status) => {
                        if exit_status.success() {
                            Ok("Tarefa do OpenCode executada com sucesso.".to_string())
                        } else {
                            Err(AppError::OpenCode(format!("OpenCode encerrou com código {:?}", exit_status.code())))
                        }
                    }
                    Err(e) => Err(AppError::OpenCode(format!("Erro durante execução do OpenCode: {}", e)))
                }
            }
            _ = async {
                while !cancel_clone.load(Ordering::Relaxed) {
                    tokio::time::sleep(Duration::from_millis(150)).await;
                }
            } => {
                let _ = child.kill().await;
                Err(AppError::Canceled)
            }
        }
    }
}

fn which_path(bin_name: &str) -> Result<PathBuf, ()> {
    if let Ok(paths) = std::env::var("PATH") {
        let sep = if cfg!(windows) { ';' } else { ':' };
        for part in paths.split(sep) {
            let dir = Path::new(part);
            let candidate = if cfg!(windows) {
                dir.join(format!("{}.exe", bin_name))
            } else {
                dir.join(bin_name)
            };
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }
    Err(())
}
