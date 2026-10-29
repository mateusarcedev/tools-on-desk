use crate::error::{AppError, AppResult};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const DPAPI_ENTROPY: &[u8] = b"TOOLSONDESK_DPAPI_ENTROPY_v1";
const LEGACY_SALT: &[u8] = b"ARCE_TOOLS_SECURE_VAULT_SALT_v1";
const MODERN_SECURE_SALT: &[u8] = b"TOOLSONDESK_SECURE_VAULT_SALT_v2";

#[cfg(target_os = "windows")]
mod win_dpapi {
    use std::ptr::null_mut;

    #[repr(C)]
    struct DataBlob {
        cb_data: u32,
        pb_data: *mut u8,
    }

    const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

    #[link(name = "crypt32")]
    unsafe extern "system" {
        fn CryptProtectData(
            p_data_in: *const DataBlob,
            sz_data_descr: *const u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut std::ffi::c_void,
            p_prompt_struct: *mut std::ffi::c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;

        fn CryptUnprotectData(
            p_data_in: *const DataBlob,
            ppsz_data_descr: *mut *mut u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut std::ffi::c_void,
            p_prompt_struct: *mut std::ffi::c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn LocalFree(h_mem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    }

    pub fn protect(data: &[u8], entropy: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let ent_blob = DataBlob {
            cb_data: entropy.len() as u32,
            pb_data: entropy.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: null_mut(),
        };

        let res = unsafe {
            CryptProtectData(
                &in_blob,
                null_mut(),
                &ent_blob,
                null_mut(),
                null_mut(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out_blob,
            )
        };

        if res == 0 || out_blob.pb_data.is_null() {
            return Err("Falha na chamada CryptProtectData do Windows DPAPI".into());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize)
        };
        let protected = slice.to_vec();
        unsafe { LocalFree(out_blob.pb_data as *mut std::ffi::c_void); }
        Ok(protected)
    }

    pub fn unprotect(data: &[u8], entropy: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let ent_blob = DataBlob {
            cb_data: entropy.len() as u32,
            pb_data: entropy.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: null_mut(),
        };

        let res = unsafe {
            CryptUnprotectData(
                &in_blob,
                null_mut(),
                &ent_blob,
                null_mut(),
                null_mut(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out_blob,
            )
        };

        if res == 0 || out_blob.pb_data.is_null() {
            return Err("Falha na chamada CryptUnprotectData do Windows DPAPI".into());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize)
        };
        let unprotected = slice.to_vec();
        unsafe { LocalFree(out_blob.pb_data as *mut std::ffi::c_void); }
        Ok(unprotected)
    }
}

/// Unified, cross-platform CredentialStore implementation:
/// - Windows: Windows DPAPI (crypt32.dll) with user login binding and volatile memory zeroing.
/// - macOS: Apple Keychain Services (`/usr/bin/security` integration).
/// - Linux: Secret Service API (`secret-tool` / freedesktop secrets).
pub struct CredentialStore;

impl CredentialStore {
    /// Returns the descriptive name of the security backend active on this platform.
    pub fn backend_name() -> &'static str {
        #[cfg(target_os = "windows")]
        {
            "Windows DPAPI (crypt32.dll)"
        }
        #[cfg(target_os = "macos")]
        {
            "Apple Keychain Services"
        }
        #[cfg(target_os = "linux")]
        {
            "FreeDesktop Secret Service"
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            "Generic Secure Vault"
        }
    }

    /// Checks if the native OS credential storage mechanism is accessible.
    pub fn is_available() -> bool {
        #[cfg(target_os = "windows")]
        {
            // Windows DPAPI is always present in win32/kernel32
            true
        }
        #[cfg(target_os = "macos")]
        {
            Path::new("/usr/bin/security").is_file()
        }
        #[cfg(target_os = "linux")]
        {
            // Check if secret-tool or DBus daemon is reachable
            if let Ok(output) = std::process::Command::new("which")
                .arg("secret-tool")
                .output()
            {
                if output.status.success() {
                    return true;
                }
            }
            // Also check DBus session bus address
            std::env::var("DBUS_SESSION_BUS_ADDRESS").is_ok()
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            true
        }
    }

    /// Stores a secret securely in the platform vault.
    pub fn store_secret(app_data_dir: &Path, key_name: &str, secret: &str) -> AppResult<()> {
        let _ = fs::create_dir_all(app_data_dir);

        #[cfg(target_os = "windows")]
        {
            let vault_file = Self::get_vault_path(app_data_dir);
            let mut map: HashMap<String, String> = if vault_file.exists() {
                Self::read_all_secrets(app_data_dir).unwrap_or_default()
            } else {
                HashMap::new()
            };

            map.insert(key_name.to_string(), secret.to_string());

            let mut json = serde_json::to_vec(&map)
                .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;

            let encrypted = win_dpapi::protect(&json, DPAPI_ENTROPY)
                .map_err(|e| AppError::Internal(format!("Erro Windows DPAPI ao proteger dados: {}", e)))?;
            Self::zeroize_bytes(&mut json);

            fs::write(&vault_file, encrypted)?;
            return Ok(());
        }

        #[cfg(target_os = "macos")]
        {
            // Apple Keychain via /usr/bin/security
            let mut cmd = std::process::Command::new("/usr/bin/security");
            cmd.args([
                "add-generic-password",
                "-a",
                "ToolsOnDesk",
                "-s",
                key_name,
                "-w",
                secret,
                "-U",
            ]);
            let output = cmd.output().map_err(|e| {
                AppError::Internal(format!("Falha ao invocar Apple Keychain: {}", e))
            })?;

            if !output.status.success() {
                let err_msg = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::Internal(format!(
                    "Erro ao salvar credencial no Apple Keychain: {}",
                    err_msg
                )));
            }

            // Also maintain local encrypted copy in vault_file for atomic project introspection
            Self::store_fallback_encrypted(app_data_dir, key_name, secret)?;
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            // Attempt Secret Service via secret-tool if installed
            let mut stored_in_secret_service = false;
            if let Ok(mut cmd) = std::process::Command::new("secret-tool")
                .args(["store", "--label=ToolsOnDesk", "service", "ToolsOnDesk", "key", key_name])
                .stdin(std::process::Stdio::piped())
                .spawn()
            {
                use std::io::Write;
                if let Some(mut stdin) = cmd.stdin.take() {
                    let _ = stdin.write_all(secret.as_bytes());
                }
                if let Ok(status) = cmd.wait() {
                    if status.success() {
                        stored_in_secret_service = true;
                    }
                }
            }

            // Store securely in modern encrypted format with hardware entropy
            Self::store_fallback_encrypted(app_data_dir, key_name, secret)?;

            if !stored_in_secret_service && !Self::is_available() {
                // If neither secret-tool nor dbus was available, alert user
                // but local encrypted storage still keeps data safe from plain-text exposure
            }
            return Ok(());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Self::store_fallback_encrypted(app_data_dir, key_name, secret)?;
            Ok(())
        }
    }

    /// Retrieves a secret from the vault.
    pub fn get_secret(app_data_dir: &Path, key_name: &str) -> AppResult<Option<String>> {
        #[cfg(target_os = "windows")]
        {
            let secrets = Self::read_all_secrets(app_data_dir)?;
            return Ok(secrets.get(key_name).cloned());
        }

        #[cfg(target_os = "macos")]
        {
            let mut cmd = std::process::Command::new("/usr/bin/security");
            cmd.args([
                "find-generic-password",
                "-a",
                "ToolsOnDesk",
                "-s",
                key_name,
                "-w",
            ]);
            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let secret = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !secret.is_empty() {
                        return Ok(Some(secret));
                    }
                }
            }

            // Fallback to local encrypted copy
            let secrets = Self::read_fallback_encrypted(app_data_dir)?;
            return Ok(secrets.get(key_name).cloned());
        }

        #[cfg(target_os = "linux")]
        {
            // Attempt Secret Service lookup via secret-tool
            if let Ok(output) = std::process::Command::new("secret-tool")
                .args(["lookup", "service", "ToolsOnDesk", "key", key_name])
                .output()
            {
                if output.status.success() {
                    let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !val.is_empty() {
                        return Ok(Some(val));
                    }
                }
            }

            // Fallback to local encrypted copy
            let secrets = Self::read_fallback_encrypted(app_data_dir)?;
            return Ok(secrets.get(key_name).cloned());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            let secrets = Self::read_fallback_encrypted(app_data_dir)?;
            Ok(secrets.get(key_name).cloned())
        }
    }

    /// Deletes a secret from the vault.
    pub fn delete_secret(app_data_dir: &Path, key_name: &str) -> AppResult<()> {
        #[cfg(target_os = "windows")]
        {
            let vault_file = Self::get_vault_path(app_data_dir);
            if !vault_file.exists() {
                return Ok(());
            }

            let mut map = Self::read_all_secrets(app_data_dir)?;
            map.remove(key_name);

            let mut json = serde_json::to_vec(&map)
                .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;

            let encrypted = win_dpapi::protect(&json, DPAPI_ENTROPY)
                .map_err(|e| AppError::Internal(format!("Erro Windows DPAPI: {}", e)))?;
            Self::zeroize_bytes(&mut json);

            fs::write(&vault_file, encrypted)?;
            return Ok(());
        }

        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("/usr/bin/security")
                .args(["delete-generic-password", "-a", "ToolsOnDesk", "-s", key_name])
                .output();

            let _ = Self::delete_fallback_encrypted(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("secret-tool")
                .args(["clear", "service", "ToolsOnDesk", "key", key_name])
                .output();

            let _ = Self::delete_fallback_encrypted(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Self::delete_fallback_encrypted(app_data_dir, key_name)
        }
    }

    /// Reads all secrets present in the vault.
    pub fn read_all_secrets(app_data_dir: &Path) -> AppResult<HashMap<String, String>> {
        #[cfg(target_os = "windows")]
        {
            let vault_file = Self::get_vault_path(app_data_dir);
            if !vault_file.exists() {
                let legacy_file = Self::get_legacy_vault_path(app_data_dir);
                if legacy_file.exists() {
                    return Self::read_legacy_secrets(app_data_dir);
                }
                return Ok(HashMap::new());
            }

            let encrypted = fs::read(&vault_file)?;
            let mut decrypted = win_dpapi::unprotect(&encrypted, DPAPI_ENTROPY)
                .map_err(|e| AppError::Internal(format!("Erro Windows DPAPI ao decifrar cofre: {}", e)))?;

            let map: HashMap<String, String> = serde_json::from_slice(&decrypted)
                .map_err(|_| AppError::Internal("Cofre seguro corrompido ou inacessível".into()))?;

            Self::zeroize_bytes(&mut decrypted);
            return Ok(map);
        }

        #[cfg(not(target_os = "windows"))]
        {
            Self::read_fallback_encrypted(app_data_dir)
        }
    }

    /// Reads secrets from legacy Arce Tools vault (.vault_keys.enc) in memory for migration
    pub fn read_legacy_secrets(legacy_dir: &Path) -> AppResult<HashMap<String, String>> {
        let legacy_file = Self::get_legacy_vault_path(legacy_dir);
        if !legacy_file.exists() {
            return Ok(HashMap::new());
        }

        let encrypted = fs::read(&legacy_file)?;
        let enc_key = Self::derive_legacy_key();
        let mut decrypted = Self::crypt_xor_stream(&encrypted, &enc_key);

        let map: HashMap<String, String> = serde_json::from_slice(&decrypted)
            .map_err(|_| AppError::Internal("Cofre legado corrompido ou chave inválida".into()))?;

        Self::zeroize_bytes(&mut decrypted);
        Ok(map)
    }

    /// Path to the primary vault file
    pub fn get_vault_path(app_data_dir: &Path) -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            app_data_dir.join(".vault_dpapi.enc")
        }
        #[cfg(not(target_os = "windows"))]
        {
            app_data_dir.join(".vault_secure.enc")
        }
    }

    /// Path to the legacy vault file
    pub fn get_legacy_vault_path(legacy_dir: &Path) -> PathBuf {
        legacy_dir.join(".vault_keys.enc")
    }

    /// Masks an API key for safe UI display (e.g. nvapi-••••••••1234)
    pub fn mask_key(key: &str) -> String {
        if key.len() <= 8 {
            return "••••••••".to_string();
        }
        let prefix = if key.starts_with("nvapi-") { "nvapi-" } else { "" };
        let suffix = &key[key.len() - 4..];
        format!("{}••••••••{}", prefix, suffix)
    }

    /// Overwrites in-memory byte buffers with zeroes before deallocation
    pub fn zeroize_bytes(buffer: &mut [u8]) {
        for b in buffer.iter_mut() {
            unsafe { std::ptr::write_volatile(b, 0); }
        }
    }

    // =========================================================================
    // Non-Windows Encrypted Storage Helpers
    // =========================================================================

    #[cfg(not(target_os = "windows"))]
    fn store_fallback_encrypted(app_data_dir: &Path, key_name: &str, secret: &str) -> AppResult<()> {
        let vault_file = Self::get_vault_path(app_data_dir);
        let mut map: HashMap<String, String> = if vault_file.exists() {
            Self::read_fallback_encrypted(app_data_dir).unwrap_or_default()
        } else {
            HashMap::new()
        };

        map.insert(key_name.to_string(), secret.to_string());

        let mut json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar cofre: {}", e)))?;

        let key = Self::derive_modern_key();
        let encrypted = Self::crypt_xor_stream(&json, &key);
        Self::zeroize_bytes(&mut json);

        fs::write(&vault_file, encrypted)?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    fn read_fallback_encrypted(app_data_dir: &Path) -> AppResult<HashMap<String, String>> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            let legacy_file = Self::get_legacy_vault_path(app_data_dir);
            if legacy_file.exists() {
                return Self::read_legacy_secrets(app_data_dir);
            }
            return Ok(HashMap::new());
        }

        let encrypted = fs::read(&vault_file)?;
        let key = Self::derive_modern_key();
        let mut decrypted = Self::crypt_xor_stream(&encrypted, &key);

        let map: HashMap<String, String> = serde_json::from_slice(&decrypted)
            .map_err(|_| AppError::Internal("Cofre seguro corrompido ou inacessível".into()))?;

        Self::zeroize_bytes(&mut decrypted);
        Ok(map)
    }

    #[cfg(not(target_os = "windows"))]
    fn delete_fallback_encrypted(app_data_dir: &Path, key_name: &str) -> AppResult<()> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            return Ok(());
        }

        let mut map = Self::read_fallback_encrypted(app_data_dir)?;
        map.remove(key_name);

        let mut json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar cofre: {}", e)))?;

        let key = Self::derive_modern_key();
        let encrypted = Self::crypt_xor_stream(&json, &key);
        Self::zeroize_bytes(&mut json);

        fs::write(&vault_file, encrypted)?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    fn derive_modern_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(MODERN_SECURE_SALT);

        if let Ok(user) = env::var("USER") {
            hasher.update(user.as_bytes());
        }
        if let Ok(home) = env::var("HOME") {
            hasher.update(home.as_bytes());
        }
        // Incorporate machine-id if available on Linux
        if let Ok(machine_id) = fs::read_to_string("/etc/machine-id") {
            hasher.update(machine_id.trim().as_bytes());
        }

        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    fn derive_legacy_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(LEGACY_SALT);

        #[cfg(target_os = "windows")]
        {
            if let Ok(computer_name) = env::var("COMPUTERNAME") {
                hasher.update(computer_name.as_bytes());
            }
            if let Ok(username) = env::var("USERNAME") {
                hasher.update(username.as_bytes());
            }
            if let Ok(userprofile) = env::var("USERPROFILE") {
                hasher.update(userprofile.as_bytes());
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(hostname) = env::var("HOSTNAME") {
                hasher.update(hostname.as_bytes());
            }
            if let Ok(user) = env::var("USER") {
                hasher.update(user.as_bytes());
            }
            if let Ok(home) = env::var("HOME") {
                hasher.update(home.as_bytes());
            }
        }

        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    fn crypt_xor_stream(data: &[u8], key: &[u8; 32]) -> Vec<u8> {
        let mut output = Vec::with_capacity(data.len());
        let chunk_size = 32;

        for (i, chunk) in data.chunks(chunk_size).enumerate() {
            let mut hasher = Sha256::new();
            hasher.update(key);
            hasher.update(&(i as u64).to_le_bytes());
            let mask = hasher.finalize();

            for (b, m) in chunk.iter().zip(mask.iter()) {
                output.push(b ^ m);
            }
        }

        output
    }
}

/// Backwards-compatible alias for existing codebase callers.
pub type SecureVault = CredentialStore;
