# Portabilidade do Cofre de Credenciais — ToolsOnDesk (Missão 08.1)

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
  │ DPAPI        │        │ Keychain     │        │ Secret Svc   │
  │ crypt32.dll  │        │ /usr/bin/    │        │ secret-tool  │
  │ + Entropy    │        │ security -i  │        │ (Fail-Closed)│
  └──────────────┘        └──────────────┘        └──────────────┘
```

### Windows (DPAPI)
- **API**: `CryptProtectData` e `CryptUnprotectData` via FFI dinâmica em `crypt32.dll`.
- **Entropia Adicional**: Buffer fixo de segurança `TOOLSONDESK_DPAPI_ENTROPY_v1`.
- **Arquivo no Disco**: `%LOCALAPPDATA%\ToolsOnDesk\.vault_dpapi.enc`.
- **Características**: Os dados só podem ser descriptografados pelo mesmo usuário logado na mesma máquina Windows.

### macOS (Apple Keychain Services)
- **API**: Invocação interativa ao utilitário `/usr/bin/security -i`.
- **Prevenção de Vazamento em `argv`**: O comando `add-generic-password` e o segredo são injetados exclusivamente via **`stdin` (pipe)**. A tabela de processos do macOS (`ps aux`, `sysctl`) enxerga estritamente os argumentos `["/usr/bin/security", "-i"]`, impedindo completamente que credenciais sejam capturadas por outros processos ou ferramentas de monitoramento.
- **Leitura Segura**: `find-generic-password -a ToolsOnDesk -s <key> -w` retorna a chave via stdout.
- **Entidade**: `service: ToolsOnDesk`, `account: ToolsOnDesk`.
- **Características**: Protegido pelas chaves do Keychain do usuário e pelo Secure Enclave em Macs modernos.

### Linux (FreeDesktop Secret Service & Arquitetura Fail-Closed)
- **API**: D-Bus Secret Service via utilitário `secret-tool` (padrão GNOME Keyring, KSecretsService, KeePassXC).
- **Injeção Segura**: O segredo é transmitido ao `secret-tool store` via **`stdin`**.
- **Princípio Fail-Closed**: Se o `secret-tool` não estiver instalado, ou se o chaveiro estiver bloqueado/cancelado pelo usuário, ou se o barramento D-Bus estiver indisponível, a operação **FALHA IMEDIATAMENTE** retornando `AppError::Security`.
- **Proibição de Pseudo-Chaves no Disco**: Nenhum arquivo cifrado com identificadores públicos ou previsíveis da máquina (`/etc/machine-id`, `$USER`, `$HOME`) é gerado para salvar novas credenciais.
- **Migração Não-Destrutiva**: Para usuários que já possuíam credenciais em versões anteriores nos arquivos `.vault_secure.enc` ou `.vault_keys.enc`, o método `get_secret` realiza a leitura em memória para evitar perda de dados. Se o Secret Service estiver ativo, o dado é migrado automaticamente para o chaveiro nativo e o arquivo legado inseguro é sanitizado/removido.

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

O `write_volatile` impede que o compilador Rust elimine a limpeza por otimização de código inativo (*dead code elimination*). Todos os buffers contendo o segredo, comandos formatados ou bytes intermediários são zerados imediatamente após o envio aos processos de destino.

---

## 3. Sanitização nos Logs e na Interface (Anti-Leak)

- **Sanitização de Regex**: `CredentialStore::sanitize_secret_in_message` substitui ocorrências da chave do usuário e qualquer padrão `nvapi-[A-Za-z0-9_-]+` pela string segura `[PROTECTED_KEY]`.
- **Mascaramento no Frontend**: O método `CredentialStore::mask_key` retorna uma versão censurada: `nvapi-••••••••1234` preservando apenas os 4 últimos dígitos para identificação pelo usuário.
