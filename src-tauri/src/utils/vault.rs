//! Secure Vault for credentials management.
//! Re-exports the unified multiplatform CredentialStore from the platform abstraction layer.

pub use crate::platform::credentials::{CredentialStore, SecureVault};
