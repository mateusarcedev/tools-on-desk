# ARCE TOOLS — Segurança e Integridade de Dependências

Este documento detalha o modelo de segurança, análise de riscos e medidas de mitigação aplicadas no gerenciamento de executáveis e pacotes externos do **Arce Tools** (Missão 05).

---

## 1. Princípios de Segurança

1. **Apenas Canais HTTPS Criptografados com TLS Moderno**:
   - Todas as conexões de download utilizam a crate `reqwest` compilada com a suite `rustls` ou SChannel nativo do Windows.
   - Conexões em texto claro (HTTP) são terminantemente rejeitadas pelo motor de download (`download_file_with_progress`), retornando erro estruturado de segurança.
2. **Imunidade contra Injeção de URLs Arbitrárias**:
   - As URLs de download de binários externos são **fixadas e validadas no backend nativo em Rust** (`dependency_manager.rs`).
   - Nenhuma chamada vinda da interface React (IPC) pode injetar uma URL customizada de executável.
3. **Defesa contra Injeção de Comandos de Shell**:
   - Binários externos são invocados exclusivamente via `tokio::process::Command::new(binary_path).args(arg_vec)`.
   - Nenhuma chamada passa por `cmd.exe /c` ou `powershell -Command`. Não há interpolação de strings em shell.

---

## 2. Mitigação contra Vulnerabilidades Conhecidas

### 2.1 Proteção contra Ataques de Travessia em ZIP (*Zip Slip*)
- **Risco**: Um arquivo ZIP malicioso pode conter caminhos relativos como `../../../../Windows/System32/evil.exe` ou caminhos absolutos, sobrescrevendo binários críticos do sistema ao serem extraídos.
- **Mitigação no Arce Tools**:
  O método `extract_ffmpeg_safe` utiliza o validador nativo `entry.enclosed_name()` da crate `zip`. Se qualquer entrada contiver referências de diretório pai (`..`) ou separadores que escapem do diretório de destino, a extração inteira é abortada com erro fatal de segurança:
  ```rust
  let enclosed = match entry.enclosed_name() {
      Some(p) => p.to_owned(),
      None => {
          return Err(AppError::Dependency(
              "Tentativa de travessia de caminho (Zip Slip) detectada no arquivo compactado. Extração abortada por segurança.".into(),
          ));
      }
  };
  ```
  Este comportamento é verificado por teste unitário automatizado (`test_zip_slip_security_prevention`).

### 2.2 Verificação de Integridade Criptográfica (SHA-256)
- **Risco**: Pacotes alterados durante a transmissão (*Man-in-the-Middle*) ou servidores comprometidos servindo binários adulterados.
- **Mitigação no Arce Tools**:
  - Durante o streaming de download, o buffer de entrada alimenta incrementalmente um hasher `sha2::Sha256`.
  - O hash final calculado é comparado estritamente em tempo constante com a assinatura/hash esperado.
  - Se houver divergência, o arquivo temporário é sumariamente deletado do disco e a ocorrência é gravada na Central de Erros como `DEPENDENCY_HASH_MISMATCH`.

### 2.3 Proteção contra Exaustão de Recursos de Disco (*Zip Bomb* & *Stream Flooding*)
- O motor de download impõe limite rígido de bytes transferidos (`max_bytes`):
  - Limite para executáveis simples (`yt-dlp`): 35 MB.
  - Limite para pacotes compactados (`ffmpeg.zip`): 120 MB.
- Caso o fluxo de entrada ultrapasse o limite estipulado, a conexão é imediatamente terminada e o arquivo parcial deletado.

---

## 3. Modelo de Privilégios e Isolamento

1. **Execução sem Privilégios de Administrador**:
   - Os binários são alocados em `%LOCALAPPDATA%\ArceTools\binaries\`.
   - Nenhuma pasta em `C:\Program Files`, `C:\Windows` ou variáveis de ambiente globais (`HKEY_LOCAL_MACHINE`) é modificada.
   - Elimina a necessidade de telas de confirmação UAC para instalação de ferramentas.
2. **Execução Oculta (`CREATE_NO_WINDOW = 0x08000000`)**:
   - Impede que janelas pretas de terminal do Windows pipoquem na frente do usuário durante conversões, downloads ou testes de versão.
3. **Liquidação Limpa de Processos Filhos (`taskkill /F /T`)**:
   - Evita que subprocessos invocados por terceiros (ex: `ffmpeg` disparado pelo `yt-dlp`) fiquem rodando como órfãos ou consumindo recursos em segundo plano.
