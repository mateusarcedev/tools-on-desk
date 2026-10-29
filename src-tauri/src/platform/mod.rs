pub mod paths;
pub mod credentials;
pub mod processes;
pub mod system;
pub mod windows;
pub mod linux;
pub mod macos;

pub use paths::PathManager;
pub use credentials::{CredentialStore, SecureVault};
pub use processes::ProcessManager;
pub use system::{PlatformSystem, OsInfo, WebviewInfo};
