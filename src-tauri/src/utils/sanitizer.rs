use std::sync::LazyLock;
use regex::Regex;

static SENSITIVE_KEY_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)(password|passwd|secret|api[_-]?key|bearer|token|auth|credentials)\s*[:=]\s*([^\s,;]+)"#)
        .unwrap()
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

    // 1. Mask URL credentials (e.g. https://user:pass@example.com -> https://[REDACTED]@example.com)
    sanitized = URL_CREDENTIAL_REGEX.replace_all(&sanitized, "https://[REDACTED]@").to_string();

    // 2. Mask sensitive keys
    sanitized = SENSITIVE_KEY_REGEX.replace_all(&sanitized, "$1=[REDACTED]").to_string();

    // 3. Mask personal paths
    sanitized = USER_PATH_WIN_REGEX.replace_all(&sanitized, "C:\\Users\\[USER]\\").to_string();
    sanitized = USER_PATH_UNIX_REGEX.replace_all(&sanitized, "/home/[USER]/").to_string();

    // 4. Limit length to 8192 chars
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
}
