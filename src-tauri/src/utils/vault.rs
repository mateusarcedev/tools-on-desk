use crate::error::{AppError, AppResult};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SecureVault;

static VAULT_INITIALIZED: AtomicBool = AtomicBool::new(false);

impl SecureVault {
    fn get_vault_path(app_data_dir: &Path) -> PathBuf {
        app_data_dir.join(".vault_keys.enc")
    }

    /// Derives an encryption key based on machine identity and user context
    fn derive_machine_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(b"ARCE_TOOLS_SECURE_VAULT_SALT_v1");

        // Machine specific entropy
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

    /// Simple XOR + stream cipher using SHA256 counter for encrypted store
    fn crypt_payload(data: &[u8], key: &[u8; 32]) -> Vec<u8> {
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

    pub fn store_secret(app_data_dir: &Path, key_name: &str, secret: &str) -> AppResult<()> {
        let _ = fs::create_dir_all(app_data_dir);
        let vault_file = Self::get_vault_path(app_data_dir);

        let mut map: std::collections::HashMap<String, String> = if vault_file.exists() {
            Self::read_all_secrets(app_data_dir).unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };

        map.insert(key_name.to_string(), secret.to_string());

        let json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;
        
        let enc_key = Self::derive_machine_key();
        let encrypted = Self::crypt_payload(&json, &enc_key);

        fs::write(&vault_file, encrypted)
            .map_err(|e| AppError::Io(e))?;

        VAULT_INITIALIZED.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn get_secret(app_data_dir: &Path, key_name: &str) -> AppResult<Option<String>> {
        let secrets = Self::read_all_secrets(app_data_dir)?;
        Ok(secrets.get(key_name).cloned())
    }

    pub fn delete_secret(app_data_dir: &Path, key_name: &str) -> AppResult<()> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            return Ok(());
        }

        let mut map = Self::read_all_secrets(app_data_dir)?;
        map.remove(key_name);

        let json = serde_json::to_vec(&map)
            .map_err(|e| AppError::Internal(format!("Falha ao serializar vault: {}", e)))?;

        let enc_key = Self::derive_machine_key();
        let encrypted = Self::crypt_payload(&json, &enc_key);

        fs::write(&vault_file, encrypted)
            .map_err(|e| AppError::Io(e))?;

        Ok(())
    }

    fn read_all_secrets(app_data_dir: &Path) -> AppResult<std::collections::HashMap<String, String>> {
        let vault_file = Self::get_vault_path(app_data_dir);
        if !vault_file.exists() {
            return Ok(std::collections::HashMap::new());
        }

        let encrypted = fs::read(&vault_file)
            .map_err(|e| AppError::Io(e))?;

        let enc_key = Self::derive_machine_key();
        let decrypted = Self::crypt_payload(&encrypted, &enc_key);

        let map: std::collections::HashMap<String, String> = serde_json::from_slice(&decrypted)
            .map_err(|_| AppError::Internal("Arquivo seguro corrompido ou chave inválida".into()))?;

        Ok(map)
    }

    /// Masks an API key for safe user display (e.g. nvapi-••••••••1234)
    pub fn mask_key(raw_key: &str) -> String {
        let trimmed = raw_key.trim();
        if trimmed.is_empty() {
            return String::new();
        }

        if trimmed.len() <= 10 {
            return "••••••••".to_string();
        }

        let prefix = if trimmed.starts_with("nvapi-") {
            "nvapi-"
        } else {
            &trimmed[..4]
        };

        let suffix = &trimmed[trimmed.len() - 4..];
        format!("{}••••••••{}", prefix, suffix)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_encryption_and_retrieval() {
        let temp_dir = std::env::temp_dir().join(format!("arce_test_vault_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let secret = "nvapi-test1234567890abcdefghijklmnopqrstuvwxyz";
        SecureVault::store_secret(&temp_dir, "NVIDIA_KEY", secret).unwrap();

        // Check file exists and does NOT contain plaintext
        let vault_file = temp_dir.join(".vault_keys.enc");
        assert!(vault_file.exists());
        let raw_bytes = fs::read(&vault_file).unwrap();
        let raw_str = String::from_utf8_lossy(&raw_bytes);
        assert!(!raw_str.contains("nvapi-test"));

        // Retrieve decrypted
        let retrieved = SecureVault::get_secret(&temp_dir, "NVIDIA_KEY").unwrap();
        assert_eq!(retrieved, Some(secret.to_string()));

        // Masking
        let masked = SecureVault::mask_key(secret);
        assert_eq!(masked, "nvapi-••••••••wxyz");

        // Delete
        SecureVault::delete_secret(&temp_dir, "NVIDIA_KEY").unwrap();
        let after_delete = SecureVault::get_secret(&temp_dir, "NVIDIA_KEY").unwrap();
        assert_eq!(after_delete, None);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
