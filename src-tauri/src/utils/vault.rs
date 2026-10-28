use crate::error::{AppError, AppResult};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

pub struct SecureVault;

const DPAPI_ENTROPY: &[u8] = b"TOOLSONDESK_DPAPI_ENTROPY_v1";
const LEGACY_SALT: &[u8] = b"ARCE_TOOLS_SECURE_VAULT_SALT_v1";
const MODERN_FALLBACK_SALT: &[u8] = b"TOOLSONDESK_SECURE_VAULT_SALT_v2";

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

impl SecureVault {
    pub fn get_vault_path(app_data_dir: &Path) -> PathBuf {
        app_data_dir.join(".vault_dpapi.enc")
    }

    pub fn get_legacy_vault_path(legacy_dir: &Path) -> PathBuf {
        legacy_dir.join(".vault_keys.enc")
    }

    /// Stores a secret securely using Windows DPAPI (or cross-platform protected fallback)
    pub fn store_secret(app_data_dir: &Path, key_name: &str, secret: &str) -> AppResult<()> {
        let _ = fs::create_dir_all(app_data_dir);
        let vault_file = Self::get_vault_path(app_data_dir);

        let mut map: HashMap<String, String> = if vault_file.exists() {
            Self::read_all_secrets(app_data_dir).unwrap_or_default()
        } else {
            HashMap::new()
        };

        map.insert(key_name.to_string(), secret.to_string());

        let mut json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;

        let encrypted = Self::encrypt_payload(&json)?;
        Self::zeroize_bytes(&mut json);

        fs::write(&vault_file, encrypted)?;
        Ok(())
    }

    /// Retrieves a secret from the DPAPI vault
    pub fn get_secret(app_data_dir: &Path, key_name: &str) -> AppResult<Option<String>> {
        let secrets = Self::read_all_secrets(app_data_dir)?;
        Ok(secrets.get(key_name).cloned())
    }

    /// Deletes a secret from the vault
    pub fn delete_secret(app_data_dir: &Path, key_name: &str) -> AppResult<()> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            return Ok(());
        }

        let mut map = Self::read_all_secrets(app_data_dir)?;
        map.remove(key_name);

        let mut json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;

        let encrypted = Self::encrypt_payload(&json)?;
        Self::zeroize_bytes(&mut json);

        fs::write(&vault_file, encrypted)?;
        Ok(())
    }

    /// Reads all secrets currently present in the DPAPI vault
    pub fn read_all_secrets(app_data_dir: &Path) -> AppResult<HashMap<String, String>> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            // Also check legacy in case it's in the same directory and not yet migrated
            let legacy_file = Self::get_legacy_vault_path(app_data_dir);
            if legacy_file.exists() {
                return Self::read_legacy_secrets(app_data_dir);
            }
            return Ok(HashMap::new());
        }

        let encrypted = fs::read(&vault_file)?;
        let mut decrypted = Self::decrypt_payload(&encrypted)?;

        let map: HashMap<String, String> = serde_json::from_slice(&decrypted)
            .map_err(|_| AppError::Internal("Cofre seguro corrompido ou inacessível".into()))?;

        Self::zeroize_bytes(&mut decrypted);
        Ok(map)
    }

    /// Reads secrets from the legacy Arce Tools vault (.vault_keys.enc) in memory for migration
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

    /// Masks an API key for safe UI display (e.g. nvapi-••••••••1234)
    pub fn mask_key(key: &str) -> String {
        if key.len() <= 8 {
            return "••••••••".to_string();
        }
        let prefix = if key.starts_with("nvapi-") { "nvapi-" } else { "" };
        let suffix = &key[key.len() - 4..];
        format!("{}••••••••{}", prefix, suffix)
    }

    // =========================================================================
    // Cryptographic Helpers
    // =========================================================================

    fn encrypt_payload(data: &[u8]) -> AppResult<Vec<u8>> {
        #[cfg(target_os = "windows")]
        {
            win_dpapi::protect(data, DPAPI_ENTROPY)
                .map_err(|e| AppError::Internal(format!("Erro Windows DPAPI ao proteger dados: {}", e)))
        }

        #[cfg(not(target_os = "windows"))]
        {
            let key = Self::derive_modern_fallback_key();
            Ok(Self::crypt_xor_stream(data, &key))
        }
    }

    fn decrypt_payload(data: &[u8]) -> AppResult<Vec<u8>> {
        #[cfg(target_os = "windows")]
        {
            win_dpapi::unprotect(data, DPAPI_ENTROPY)
                .map_err(|e| AppError::Internal(format!("Erro Windows DPAPI ao desproteger dados: {}", e)))
        }

        #[cfg(not(target_os = "windows"))]
        {
            let key = Self::derive_modern_fallback_key();
            Ok(Self::crypt_xor_stream(data, &key))
        }
    }

    /// Derives the legacy key matching Mission 06 algorithm
    fn derive_legacy_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(LEGACY_SALT);

        #[cfg(target_os = "windows")]
        {
            if let Ok(computer_name) = std::env::var("COMPUTERNAME") {
                hasher.update(computer_name.as_bytes());
            }
            if let Ok(username) = std::env::var("USERNAME") {
                hasher.update(username.as_bytes());
            }
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                hasher.update(userprofile.as_bytes());
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(hostname) = std::env::var("HOSTNAME") {
                hasher.update(hostname.as_bytes());
            }
            if let Ok(user) = std::env::var("USER") {
                hasher.update(user.as_bytes());
            }
            if let Ok(home) = std::env::var("HOME") {
                hasher.update(home.as_bytes());
            }
        }

        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    #[cfg(not(target_os = "windows"))]
    fn derive_modern_fallback_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(MODERN_FALLBACK_SALT);

        if let Ok(user) = std::env::var("USER") {
            hasher.update(user.as_bytes());
        }
        if let Ok(home) = std::env::var("HOME") {
            hasher.update(home.as_bytes());
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

    /// Overwrites in-memory byte buffers before deallocation
    pub fn zeroize_bytes(buffer: &mut [u8]) {
        for b in buffer.iter_mut() {
            unsafe { std::ptr::write_volatile(b, 0); }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_encryption_and_retrieval() {
        let temp_dir = std::env::temp_dir().join(format!("toolsondesk_test_vault_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let test_key = "nvapi-test-secret-key-123456789";
        SecureVault::store_secret(&temp_dir, "nvidia_api_key", test_key).unwrap();

        let retrieved = SecureVault::get_secret(&temp_dir, "nvidia_api_key").unwrap();
        assert_eq!(retrieved, Some(test_key.to_string()));

        let vault_file = SecureVault::get_vault_path(&temp_dir);
        assert!(vault_file.exists());
        let raw_bytes = fs::read(&vault_file).unwrap();
        assert!(!String::from_utf8_lossy(&raw_bytes).contains(test_key));

        SecureVault::delete_secret(&temp_dir, "nvidia_api_key").unwrap();
        let deleted = SecureVault::get_secret(&temp_dir, "nvidia_api_key").unwrap();
        assert_eq!(deleted, None);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_legacy_vault_recovery_in_memory() {
        let temp_dir = std::env::temp_dir().join(format!("toolsondesk_test_legacy_vault_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        // Create legacy vault format file
        let mut map = HashMap::new();
        let secret = "nvapi-legacy-migrated-secret-999";
        map.insert("nvidia_api_key".to_string(), secret.to_string());

        let json = serde_json::to_vec(&map).unwrap();
        let legacy_key = SecureVault::derive_legacy_key();
        let encrypted = SecureVault::crypt_xor_stream(&json, &legacy_key);

        let legacy_file = SecureVault::get_legacy_vault_path(&temp_dir);
        fs::write(&legacy_file, encrypted).unwrap();

        // Recover via read_legacy_secrets
        let recovered = SecureVault::read_legacy_secrets(&temp_dir).unwrap();
        assert_eq!(recovered.get("nvidia_api_key"), Some(&secret.to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
