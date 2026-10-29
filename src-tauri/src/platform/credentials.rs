use crate::error::{AppError, AppResult};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

const DPAPI_ENTROPY: &[u8] = b"TOOLSONDESK_DPAPI_ENTROPY_v1";
const LEGACY_SALT: &[u8] = b"ARCE_TOOLS_SECURE_VAULT_SALT_v1";
const LEGACY_MODERN_SALT: &[u8] = b"TOOLSONDESK_SECURE_VAULT_SALT_v2";

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
/// - macOS: Apple Keychain Services via `/usr/bin/security -i` (stdin execution to avoid argv leakage).
/// - Linux: FreeDesktop Secret Service via `secret-tool` (fail-closed if unavailable; no pseudo-key fallback).
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
            "Fail-Closed Secure Store"
        }
    }

    /// Checks if the native OS credential storage mechanism is accessible.
    pub fn is_available() -> bool {
        #[cfg(target_os = "windows")]
        {
            true
        }
        #[cfg(target_os = "macos")]
        {
            Path::new("/usr/bin/security").is_file()
        }
        #[cfg(target_os = "linux")]
        {
            #[cfg(test)]
            {
                let mode = test_helpers::TEST_KEYRING_MODE.load(std::sync::atomic::Ordering::SeqCst);
                if mode == 1 {
                    return true;
                } else if mode >= 2 {
                    return false;
                }
            }

            let secret_tool_exists = std::process::Command::new("which")
                .arg("secret-tool")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
                || Path::new("/usr/bin/secret-tool").is_file()
                || Path::new("/bin/secret-tool").is_file();

            secret_tool_exists && std::env::var("DBUS_SESSION_BUS_ADDRESS").is_ok()
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            false
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
                .map_err(|e| AppError::Security(format!("Erro Windows DPAPI ao proteger dados: {}", e)))?;
            Self::zeroize_bytes(&mut json);

            fs::write(&vault_file, encrypted)?;
            return Ok(());
        }

        #[cfg(target_os = "macos")]
        {
            // Apple Keychain via /usr/bin/security in interactive mode (-i)
            // Stdin piping ensures the secret never appears in process arguments (argv / ps aux).
            let mut child = std::process::Command::new("/usr/bin/security")
                .arg("-i")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| AppError::Security(format!("Falha ao inicializar Apple Keychain: {}", e)))?;

            if let Some(mut stdin) = child.stdin.take() {
                let mut cmd_line = format!(
                    "add-generic-password -a \"ToolsOnDesk\" -s \"{}\" -w \"{}\" -U\n",
                    key_name.replace('"', "\\\""),
                    secret.replace('"', "\\\"")
                );
                let write_res = stdin.write_all(cmd_line.as_bytes());
                Self::zeroize_bytes(unsafe { cmd_line.as_bytes_mut() });
                drop(stdin);
                if let Err(e) = write_res {
                    return Err(AppError::Security(format!("Falha ao enviar comando ao Apple Keychain: {}", e)));
                }
            }

            let output = child.wait_with_output().map_err(|e| {
                AppError::Security(format!("Falha ao aguardar resposta do Apple Keychain: {}", e))
            })?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let sanitized = Self::sanitize_secret_in_message(&stderr, secret);
                return Err(AppError::Security(format!(
                    "Erro ao persistir credencial no Apple Keychain: {}",
                    sanitized.trim()
                )));
            }

            // Remove from legacy insecure file if present so insecure copy does not persist
            let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            #[cfg(test)]
            {
                let mode = test_helpers::TEST_KEYRING_MODE.load(std::sync::atomic::Ordering::SeqCst);
                match mode {
                    1 => {
                        let mut guard = test_helpers::TEST_MOCK_VAULT.lock().unwrap();
                        if let Some(ref mut map) = *guard {
                            map.insert(key_name.to_string(), secret.to_string());
                            let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
                            return Ok(());
                        }
                    }
                    2 => {
                        return Err(AppError::Security(
                            "O utilitário 'secret-tool' não está instalado no sistema (chaveiro ausente).".into(),
                        ));
                    }
                    3 => {
                        return Err(AppError::Security(
                            "O chaveiro do sistema está bloqueado ou o usuário cancelou o desbloqueio (org.freedesktop.Secret.Error.IsLocked).".into(),
                        ));
                    }
                    4 => {
                        return Err(AppError::Security(
                            "O serviço FreeDesktop Secret Service está indisponível (falha de barramento D-Bus).".into(),
                        ));
                    }
                    _ => {}
                }
            }

            // Real Linux Secret Service execution via secret-tool with stdin piping
            let mut cmd = std::process::Command::new("secret-tool");
            cmd.args(["store", "--label=ToolsOnDesk", "service", "ToolsOnDesk", "key", key_name])
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped());

            let mut child = cmd.spawn().map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    AppError::Security(
                        "O utilitário 'secret-tool' não está instalado no sistema. Instale o pacote 'libsecret-tools' para habilitar o armazenamento seguro de chaves de API.".into(),
                    )
                } else {
                    AppError::Security(format!("Falha ao inicializar o serviço de chaveiro (Secret Service): {}", e))
                }
            })?;

            if let Some(mut stdin) = child.stdin.take() {
                let mut secret_bytes = secret.as_bytes().to_vec();
                let write_res = stdin.write_all(&secret_bytes);
                Self::zeroize_bytes(&mut secret_bytes);
                drop(stdin);
                if let Err(e) = write_res {
                    return Err(AppError::Security(format!("Falha ao enviar credencial ao serviço de chaveiro: {}", e)));
                }
            }

            let output = child.wait_with_output().map_err(|e| {
                AppError::Security(format!("Falha ao aguardar resposta do serviço de chaveiro: {}", e))
            })?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let sanitized = Self::sanitize_secret_in_message(&stderr, secret);
                let err_msg = sanitized.trim();
                if err_msg.contains("IsLocked") || err_msg.contains("locked") || err_msg.contains("bloqueado") {
                    return Err(AppError::Security(
                        "O chaveiro do sistema está bloqueado ou o usuário cancelou o desbloqueio.".into(),
                    ));
                } else if err_msg.contains("Cannot autolaunch D-Bus") || err_msg.contains("org.freedesktop.DBus.Error") {
                    return Err(AppError::Security(
                        "O barramento D-Bus / Secret Service está inacessível no ambiente atual.".into(),
                    ));
                } else {
                    return Err(AppError::Security(format!(
                        "Erro do serviço de chaveiro seguro do sistema: {}",
                        if err_msg.is_empty() { "Chaveiro inacessível ou falha fechada" } else { err_msg }
                    )));
                }
            }

            // Successfully stored in native Secret Service. Remove legacy insecure file entry if present.
            let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Err(AppError::Security(
                "Armazenamento de credenciais não suportado nesta plataforma sem chaveiro seguro.".into(),
            ))
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
            let output = std::process::Command::new("/usr/bin/security")
                .args(["find-generic-password", "-a", "ToolsOnDesk", "-s", key_name, "-w"])
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    let val = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !val.is_empty() {
                        return Ok(Some(val));
                    }
                }
            }

            // Non-destructive legacy migration: check if key exists in legacy files
            if let Some(legacy_val) = Self::read_legacy_migration_secret(app_data_dir, key_name)? {
                let _ = Self::store_secret(app_data_dir, key_name, &legacy_val);
                return Ok(Some(legacy_val));
            }

            return Ok(None);
        }

        #[cfg(target_os = "linux")]
        {
            #[cfg(test)]
            {
                let mode = test_helpers::TEST_KEYRING_MODE.load(std::sync::atomic::Ordering::SeqCst);
                if mode == 1 {
                    let guard = test_helpers::TEST_MOCK_VAULT.lock().unwrap();
                    if let Some(ref map) = *guard {
                        return Ok(map.get(key_name).cloned());
                    }
                }
            }

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

            // Non-destructive legacy migration: check if key exists in legacy files
            if let Some(legacy_val) = Self::read_legacy_migration_secret(app_data_dir, key_name)? {
                if Self::is_available() {
                    let _ = Self::store_secret(app_data_dir, key_name, &legacy_val);
                }
                return Ok(Some(legacy_val));
            }

            return Ok(None);
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Self::read_legacy_migration_secret(app_data_dir, key_name)
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
                .map_err(|e| AppError::Security(format!("Erro Windows DPAPI: {}", e)))?;
            Self::zeroize_bytes(&mut json);

            fs::write(&vault_file, encrypted)?;
            return Ok(());
        }

        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("/usr/bin/security")
                .args(["delete-generic-password", "-a", "ToolsOnDesk", "-s", key_name])
                .output();

            let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(target_os = "linux")]
        {
            #[cfg(test)]
            {
                let mode = test_helpers::TEST_KEYRING_MODE.load(std::sync::atomic::Ordering::SeqCst);
                if mode == 1 {
                    let mut guard = test_helpers::TEST_MOCK_VAULT.lock().unwrap();
                    if let Some(ref mut map) = *guard {
                        map.remove(key_name);
                        let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
                        return Ok(());
                    }
                }
            }

            let _ = std::process::Command::new("secret-tool")
                .args(["clear", "service", "ToolsOnDesk", "key", key_name])
                .output();

            let _ = Self::delete_from_legacy_file(app_data_dir, key_name);
            return Ok(());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Self::delete_from_legacy_file(app_data_dir, key_name)
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
                .map_err(|e| AppError::Security(format!("Erro Windows DPAPI ao decifrar cofre: {}", e)))?;

            let map: HashMap<String, String> = serde_json::from_slice(&decrypted)
                .map_err(|_| AppError::Security("Cofre seguro corrompido ou inacessível".into()))?;

            Self::zeroize_bytes(&mut decrypted);
            return Ok(map);
        }

        #[cfg(not(target_os = "windows"))]
        {
            let mut map = HashMap::new();

            // Query primary key (NVIDIA API Key)
            if let Ok(Some(nvidia_key)) = Self::get_secret(app_data_dir, "nvidia_api_key") {
                map.insert("nvidia_api_key".to_string(), nvidia_key);
            }

            // Also aggregate any unmigrated legacy keys
            let modern_legacy = app_data_dir.join(".vault_secure.enc");
            if modern_legacy.exists() {
                if let Ok(encrypted) = fs::read(&modern_legacy) {
                    let key = Self::derive_legacy_modern_key();
                    let mut decrypted = Self::crypt_xor_stream(&encrypted, &key);
                    if let Ok(legacy_map) = serde_json::from_slice::<HashMap<String, String>>(&decrypted) {
                        for (k, v) in legacy_map {
                            map.entry(k).or_insert(v);
                        }
                    }
                    Self::zeroize_bytes(&mut decrypted);
                }
            }

            let old_legacy = Self::get_legacy_vault_path(app_data_dir);
            if old_legacy.exists() {
                if let Ok(legacy_map) = Self::read_legacy_secrets(app_data_dir) {
                    for (k, v) in legacy_map {
                        map.entry(k).or_insert(v);
                    }
                }
            }

            Ok(map)
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
            .map_err(|_| AppError::Security("Cofre legado corrompido ou chave inválida".into()))?;

        Self::zeroize_bytes(&mut decrypted);
        Ok(map)
    }

    /// Reads a secret from legacy files (.vault_secure.enc or .vault_keys.enc) in memory for migration
    pub fn read_legacy_migration_secret(app_data_dir: &Path, key_name: &str) -> AppResult<Option<String>> {
        let modern_legacy_file = app_data_dir.join(".vault_secure.enc");
        if modern_legacy_file.exists() {
            if let Ok(encrypted) = fs::read(&modern_legacy_file) {
                let key = Self::derive_legacy_modern_key();
                let mut decrypted = Self::crypt_xor_stream(&encrypted, &key);
                if let Ok(map) = serde_json::from_slice::<HashMap<String, String>>(&decrypted) {
                    Self::zeroize_bytes(&mut decrypted);
                    if let Some(val) = map.get(key_name) {
                        return Ok(Some(val.clone()));
                    }
                }
                Self::zeroize_bytes(&mut decrypted);
            }
        }

        let legacy_file = Self::get_legacy_vault_path(app_data_dir);
        if legacy_file.exists() {
            let legacy_secrets = Self::read_legacy_secrets(app_data_dir)?;
            if let Some(val) = legacy_secrets.get(key_name) {
                return Ok(Some(val.clone()));
            }
        }

        Ok(None)
    }

    /// Removes an entry from legacy insecure vault files during migration
    pub fn delete_from_legacy_file(app_data_dir: &Path, key_name: &str) -> AppResult<()> {
        let modern_legacy_file = app_data_dir.join(".vault_secure.enc");
        if modern_legacy_file.exists() {
            if let Ok(encrypted) = fs::read(&modern_legacy_file) {
                let key = Self::derive_legacy_modern_key();
                let mut decrypted = Self::crypt_xor_stream(&encrypted, &key);
                if let Ok(mut map) = serde_json::from_slice::<HashMap<String, String>>(&decrypted) {
                    Self::zeroize_bytes(&mut decrypted);
                    if map.remove(key_name).is_some() {
                        if map.is_empty() {
                            let _ = fs::remove_file(&modern_legacy_file);
                        } else if let Ok(mut json) = serde_json::to_vec(&map) {
                            let reenc = Self::crypt_xor_stream(&json, &key);
                            Self::zeroize_bytes(&mut json);
                            let _ = fs::write(&modern_legacy_file, reenc);
                        }
                    }
                } else {
                    Self::zeroize_bytes(&mut decrypted);
                }
            }
        }
        Ok(())
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

    /// Path to the legacy vault file (.vault_keys.enc)
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

    /// Sanitizes any plain secret or nvapi key pattern in string output/stderr
    pub fn sanitize_secret_in_message(msg: &str, secret: &str) -> String {
        let mut sanitized = msg.to_string();
        if !secret.is_empty() {
            sanitized = sanitized.replace(secret, "[PROTECTED_KEY]");
        }
        if let Ok(re) = regex::Regex::new(r"nvapi-[A-Za-z0-9_\-]+") {
            sanitized = re.replace_all(&sanitized, "[PROTECTED_KEY]").to_string();
        }
        sanitized
    }

    /// Overwrites in-memory byte buffers with zeroes before deallocation
    pub fn zeroize_bytes(buffer: &mut [u8]) {
        for b in buffer.iter_mut() {
            unsafe { std::ptr::write_volatile(b, 0); }
        }
    }

    // =========================================================================
    // Legacy Salt Derivation Helpers (Preserved solely for non-destructive migration)
    // =========================================================================

    fn derive_legacy_modern_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(LEGACY_MODERN_SALT);

        if let Ok(user) = env::var("USER") {
            hasher.update(user.as_bytes());
        }
        if let Ok(home) = env::var("HOME") {
            hasher.update(home.as_bytes());
        }
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

    #[cfg(test)]
    pub fn write_test_legacy_file(file_path: &Path, map: &HashMap<String, String>) -> AppResult<()> {
        let mut json = serde_json::to_vec(map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar mock: {}", e)))?;
        let key = Self::derive_legacy_modern_key();
        let enc = Self::crypt_xor_stream(&json, &key);
        Self::zeroize_bytes(&mut json);
        fs::write(file_path, enc)?;
        Ok(())
    }
}

#[cfg(test)]
pub mod test_helpers {
    use std::collections::HashMap;
    use std::sync::atomic::AtomicU8;
    use std::sync::Mutex;

    // Mutex to synchronize tests so concurrent test threads do not collide
    pub static TEST_LOCK: Mutex<()> = Mutex::new(());
    // 0 = Normal, 1 = Present, 2 = Absent, 3 = Locked, 4 = Unavailable
    pub static TEST_KEYRING_MODE: AtomicU8 = AtomicU8::new(0);
    pub static TEST_MOCK_VAULT: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

    pub fn set_test_mode(mode: u8) {
        TEST_KEYRING_MODE.store(mode, std::sync::atomic::Ordering::SeqCst);
        let mut mock = TEST_MOCK_VAULT.lock().unwrap();
        if mode == 1 {
            *mock = Some(HashMap::new());
        } else {
            *mock = None;
        }
    }

    pub fn reset_test_mode() {
        TEST_KEYRING_MODE.store(0, std::sync::atomic::Ordering::SeqCst);
        let mut mock = TEST_MOCK_VAULT.lock().unwrap();
        *mock = None;
    }
}

/// Backwards-compatible alias for existing codebase callers.
pub type SecureVault = CredentialStore;
