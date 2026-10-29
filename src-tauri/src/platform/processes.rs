use crate::error::AppResult;
use tokio::process::{Child, Command};

/// Cross-platform process lifecycle supervision and cancellation management.
/// - Windows: Headless invocation with CREATE_NO_WINDOW (0x08000000) and process tree termination via `taskkill`.
/// - Unix (Linux & macOS): Isolated process group creation via `process_group(0)`, graceful SIGTERM followed by SIGKILL timeout, and child reaping without zombie processes.
pub struct ProcessManager;

impl ProcessManager {
    /// Configures a tokio Command for headless background execution and process group isolation.
    pub fn configure_command(cmd: &mut Command) {
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        #[cfg(unix)]
        {
            cmd.process_group(0);
        }
    }

    /// Configures a standard library Command for headless background execution and process group isolation.
    pub fn configure_std_command(cmd: &mut std::process::Command) {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }
    }

    /// Safely terminates a child process and all descendant subprocesses (tree kill).
    pub async fn terminate_process_tree(child: &mut Child) -> AppResult<()> {
        let Some(pid) = child.id() else {
            return Ok(());
        };

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            let mut kill_cmd = std::process::Command::new("taskkill");
            kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
            kill_cmd.creation_flags(0x08000000);
            let _ = kill_cmd.output();
            let _ = child.kill().await;
        }

        #[cfg(unix)]
        {
            let pgid = pid as i32;

            // 1. Send SIGTERM to the entire process group (-pgid) for graceful stop
            unsafe {
                libc::kill(-pgid, libc::SIGTERM);
            }

            // 2. Poll for up to 300ms (6 * 50ms) to allow graceful shutdown
            let mut exited = false;
            for _ in 0..6 {
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                if let Ok(Some(_)) = child.try_wait() {
                    exited = true;
                    break;
                }
            }

            // 3. If process group is still active after timeout, issue SIGKILL
            if !exited {
                unsafe {
                    libc::kill(-pgid, libc::SIGKILL);
                }
                let _ = child.kill().await;
            }

            // 4. Reap the child process to avoid zombie processes in the OS table
            let _ = child.wait().await;
        }

        Ok(())
    }
}
