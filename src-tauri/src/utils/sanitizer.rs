use std::sync::LazyLock;
use regex::Regex;

static SENSITIVE_KEY_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)(password|passwd|secret|api[_-]?key|bearer|token|auth|credentials|access_token|refresh_token|session(_?id)?)\s*[:=]\s*([^\[\s,;]+)"#)
        .unwrap()
});

static AUTH_HEADER_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)(authorization\s*:\s*)([^\[\r\n,;]+)"#).unwrap()
});

static COOKIE_HEADER_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)(cookie|set-cookie)\s*:\s*([^\[\r\n;]+)"#).unwrap()
});

static PRIVATE_KEY_BLOCK_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?s)-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----"#).unwrap()
});

static URL_CREDENTIAL_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"https?://[^:\s]+:[^@\s]+@"#).unwrap()
});

static USER_PATH_WIN_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)[a-zA-Z]:\\Users\\[^\\]+\\"#).unwrap()
});

static USER_PATH_UNIX_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"/home/[^/]+/"#).unwrap()
});

pub fn sanitize_error_text(text: &str) -> String {
    let mut sanitized = text.to_string();

    // 1. Mask Private Key blocks
    sanitized = PRIVATE_KEY_BLOCK_REGEX.replace_all(&sanitized, "[REDACTED_PRIVATE_KEY]").to_string();

    // 2. Mask URL credentials (e.g. https://user:pass@example.com -> https://[REDACTED]@example.com)
    sanitized = URL_CREDENTIAL_REGEX.replace_all(&sanitized, "https://[REDACTED]@").to_string();

    // 3. Mask HTTP Authorization headers
    sanitized = AUTH_HEADER_REGEX.replace_all(&sanitized, "$1[REDACTED]").to_string();

    // 4. Mask Cookie headers
    sanitized = COOKIE_HEADER_REGEX.replace_all(&sanitized, "$1: [REDACTED]").to_string();

    // 5. Mask sensitive keys and values
    sanitized = SENSITIVE_KEY_REGEX.replace_all(&sanitized, "$1=[REDACTED]").to_string();

    // 6. Mask personal user filesystem paths
    sanitized = USER_PATH_WIN_REGEX.replace_all(&sanitized, "C:\\Users\\[USER]\\").to_string();
    sanitized = USER_PATH_UNIX_REGEX.replace_all(&sanitized, "/home/[USER]/").to_string();

    // 7. Limit length to 8192 chars to prevent storage exhaustion
    if sanitized.len() > 8192 {
        sanitized.truncate(8192);
        sanitized.push_str("... [TRUNCATED]");
    }

    sanitized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitizes_credentials_and_paths() {
        let input = "Error at C:\\Users\\john_doe\\file.pdf with password: supersecret123 and url https://admin:pass123@api.com";
        let out = sanitize_error_text(input);
        assert!(!out.contains("supersecret123"));
        assert!(!out.contains("pass123"));
        assert!(!out.contains("john_doe"));
        assert!(out.contains("password=[REDACTED]"));
        assert!(out.contains("https://[REDACTED]@"));
        assert!(out.contains("C:\\Users\\[USER]\\"));
    }

    #[test]
    fn test_sanitizes_cookies_sessions_and_tokens() {
        let input = "Cookie: session_id=abc123xyz\nsession: sess_98765\nAuthorization: Bearer eyJhbGciOiJIUzI1NiJ9";
        let out = sanitize_error_text(input);
        assert!(!out.contains("abc123xyz"));
        assert!(!out.contains("sess_98765"));
        assert!(!out.contains("eyJhbGciOiJIUzI1NiJ9"));
        assert!(out.contains("Cookie: [REDACTED]"));
        assert!(out.contains("session=[REDACTED]"));
        assert!(out.contains("Authorization: [REDACTED]"));
    }

    #[test]
    fn test_sanitizes_private_keys() {
        let input = "Failed key load: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY----- on host";
        let out = sanitize_error_text(input);
        assert!(!out.contains("MIIEowIBAAKCAQEA0"));
        assert!(out.contains("[REDACTED_PRIVATE_KEY]"));
    }
}
