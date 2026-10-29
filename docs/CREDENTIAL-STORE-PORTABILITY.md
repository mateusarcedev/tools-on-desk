# Portabilidade do Cofre de Credenciais — ToolsOnDesk (Missão 08)

O cofre de credenciais (`CredentialStore`) é responsável por armazenar chaves secretas de APIs (como chaves NVIDIA NIM API) sem jamais expor segredos em texto puro no disco, no SQLite, no `localStorage` ou nos logs do sistema.

---

## 1. Backends de Segurança Nativos

```
                    ┌─────────────────────────┐
                    │     CredentialStore     │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
  │ Windows 11   │        │ macOS        │        │ Linux        │
  │ Windows      │        │ Apple        │        │ FreeDesktop  │
  │ DPAPI        │        │ Keychain     │        │ Secret Svc / │
  │ crypt32.dll  │        │ /usr/bin/    │        │ Hardware-    │
  │ + Entropy    │        │ security     │        │ Salt Fallback│
  └──────────────┘        └──────────────┘        └──────────────┘
```

### Windows (DPAPI)
- **API**: `CryptProtectData` e `CryptUnprotectData` via FFI dinâmica em `crypt32.dll`.
- **Entropia Adicional**: Buffer fixo de segurança `TOOLSONDESK_DPAPI_ENTROPY_v1`.
- **Arquivo no Disco**: `%LOCALAPPDATA%\ToolsOnDesk\.vault_dpapi.enc`.
- **Características**: Os dados só podem ser descriptografados pelo mesmo usuário logado na mesma máquina Windows.

### macOS (Apple Keychain Services)
- **API**: Chamada segura ao utilitário do sistema `/usr/bin/security`.
- **Entidade**: `service: ToolsOnDesk`, `account: ToolsOnDesk`.
- **Criptografia Local**: Mantém espelho criptografado em `~/Library/Application Support/ToolsOnDesk/.vault_secure.enc`.
- **Características**: Protegido pelas chaves do Keychain do usuário e pelo Secure Enclave em Macs modernos.

### Linux (FreeDesktop Secret Service & Salt de Hardware)
- **API**: D-Bus Secret Service via `secret-tool` quando presente (padrão GNOME Keyring / KWallet).
- **Fallback de Hardware**: Criptografia AES/XOR-stream derivada do `/etc/machine-id` da máquina, ID de usuário e sal fixo `TOOLSONDESK_SECURE_VAULT_SALT_v2`.
- **Arquivo no Disco**: `$XDG_DATA_HOME/ToolsOnDesk/.vault_secure.enc` com permissões restritas.

---

## 2. Higiene de Memória Volátil (`zeroize_bytes`)

Para impedir que segredos permaneçam em páginas de memória ou em arquivos de paginação (*pagefile/swapfile*), o `CredentialStore` implementa sobrescrita forçada:

```rust
pub fn zeroize_bytes(buffer: &mut [u8]) {
    for b in buffer.iter_mut() {
        unsafe { std::ptr::write_volatile(b, 0); }
    }
}
```

O `write_volatile` impede que o compilador Rust elimine a limpeza por otimização de código inativo (*dead code elimination*).

---

## 3. Sanitização nos Logs e na Interface (Anti-Leak)

- **Sanitização de Regex**: O `Sanitizer::sanitize_log` substitui qualquer chave que case com o padrão `nvapi-[A-Za-z0-9_-]{20,}` pela string segura `[PROTECTED_NVIDIA_KEY]`.
- **Mascaramento no Frontend**: O método `CredentialStore::mask_key` retorna uma versão censurada: `nvapi-••••••••1234` preservando apenas os 4 últimos dígitos para identificação pelo usuário.
