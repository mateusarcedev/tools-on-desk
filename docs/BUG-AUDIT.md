# Auditoria Geral de Bugs e Correções — Arce Tools (Missão 04)

Este documento registra detalhadamente todas as auditorias, vulnerabilidades, inconsistências entre módulos e correções realizadas durante a **Missão 04**.

---

## 1. Resumo Executivo da Auditoria

| Módulo / Camada | Itens Auditados | Problemas Detectados | Status Pós-Auditoria |
|---|---|---|---|
| **Central de Erros** | Persistência, filtros, exportação, cópia | 4 inconsistências críticas | **Corrigido e Validado** |
| **Sanitizador** | Regex de credenciais, paths, cookies, chaves | 2 casos de borda | **Corrigido e Validado (3 testes)** |
| **Downloader** | SSRF, cancelamento, metadados, limpeza | 1 bug de arquivos `.part` órfãos | **Corrigido e Validado** |
| **Processos Externos** | Ciclo de vida, FFmpeg, yt-dlp, encerramento | 1 risco de processo zumbi no Windows | **Corrigido e Validado (`taskkill /T`)** |
| **Poster Studio** | Math de proporção, margens, dithering | 0 regressões | **Validado (12 testes backend + UI)** |
| **Documentos** | Merge, split, organize, compressão, Word/PDF | 0 regressões | **Validado (testes unitários lopdf/docx)** |
| **Empacotamento** | Binário nativo MSVC, NSIS Installer | 1 ajuste de configuração de build | **Validado (`Arce Tools_0.1.0_x64-setup.exe`)** |

---

## 2. Detalhamento dos Problemas Encontrados e Correções

### 2.1. Inconsistência de Case-Sensitivity nos Filtros da Central de Erros
- **Localização:** `src-tauri/src/storage/db.rs` e `src/components/screens/HistoryScreen.tsx`.
- **Causa:** No SQLite, a comparação de strings com `=` em colunas sem `COLLATE NOCASE` é estritamente sensível a maiúsculas/minúsculas. O frontend enviava valores em minúsculo (`"critical"`, `"unresolved"`), enquanto os erros eram registrados como `"CRITICAL"` e `"UNRESOLVED"`.
- **Impacto:** Filtrar por severidade ou status retornava 0 registros, ocultando falhas críticas reais do usuário.
- **Correção:**
  - `db.rs`: Atualizado para `UPPER(severity) = UPPER(?)`, `UPPER(status) = UPPER(?)` e `LOWER(module) = LOWER(?)`.
  - `HistoryScreen.tsx`: Adicionada função `getActiveFilterPayload()` que normaliza os parâmetros antes do envio ao IPC.

---

### 2.2. Discrepância de Parâmetros no Filtro de Período Temporal
- **Localização:** `src-tauri/src/storage/db.rs` e `src/components/screens/HistoryScreen.tsx`.
- **Causa:** O `<select>` de período no React emitia strings `"24h"`, `"7d"`, `"30d"`, enquanto o backend aguardava `"TODAY"`, `"WEEK"`, `"MONTH"`.
- **Impacto:** O filtro temporal caía silenciosamente no bloco `_ => {}`, retornando sempre todo o histórico.
- **Correção:**
  - `db.rs`: Suporte unificado para `"today" | "24h"`, `"week" | "7d"` e `"month" | "30d"` utilizando timestamps relativos do SQLite (`datetime('now', '-24 hours')`, etc.).

---

### 2.3. Cópia Restrita ao Buffer Visível (Paginação)
- **Localização:** `src/components/screens/HistoryScreen.tsx`.
- **Causa:** A ação de cópia anterior utilizava o estado local `errorLogs`, limitado pela paginação padrão (200 registros).
- **Impacto:** Não era possível copiar ou exportar a totalidade dos registros persistidos no SQLite quando o histórico acumulava mais de 200 falhas.
- **Correção:**
  - Implementado **"Copiar todos"** chamando `TauriService.getAllErrorLogsForExport(undefined)` (sem limite).
  - Implementado **"Copiar filtrados"** chamando `TauriService.getAllErrorLogsForExport(activeFilter)`.
  - Implementada exportação em arquivo **TXT** e **JSON** direta com streaming/Blob download.
  - Confirmação visual em tempo real no botão individual (`Copiado!` por 2 segundos).

---

### 2.4. Limpeza de Arquivos Parciais (.part / .ytdl) no Cancelamento
- **Localização:** `src-tauri/src/engines/download_engine.rs`.
- **Causa:** Ao interromper uma tarefa de download via `TaskManager::cancel_task`, o processo `yt-dlp` era finalizado, mas os arquivos temporários `.part` ou `.ytdl` permaneciam gravados no disco.
- **Impacto:** Acúmulo de arquivos corrompidos na pasta de destino do usuário.
- **Correção:**
  - No bloco `Err(AppError::Canceled)`, inserida rotina de expurgo que remove arquivos com extensões `.part`, `.ytdl` e `.temp` gerados durante a sessão abortada.

---

### 2.5. Eliminação de Processos Órfãos na Cancelamento de Tarefas no Windows
- **Localização:** `src-tauri/src/engines/external_tools.rs`.
- **Causa:** No Windows, `child.kill().await` invoca `TerminateProcess` apenas no processo-pai. Processos filhos gerados (como `ffmpeg.exe` chamado pelo `yt-dlp.exe`) podiam continuar executando em background.
- **Impacto:** Desperdício de CPU e travamento de arquivos de mídia por handles abertos.
- **Correção:**
  - Integrado comando nativo `taskkill /F /T /PID <pid>` no Windows antes do `child.kill()`, garantindo o encerramento em árvore de todos os processos derivados.
  - Inserido ramo de verificação periódica de 200ms no loop `tokio::select!` para resposta imediata ao `cancel_token`.

---

### 2.6. Deduplicação de Erros em Camadas Concorrentes
- **Localização:** `src-tauri/src/storage/db.rs`.
- **Causa:** Falhas originadas em tarefas de background podiam ser capturadas simultaneamente pelo worker Rust e por promessas assíncronas do frontend (`unhandledrejection`), gerando dois registros para o mesmo evento.
- **Impacto:** Poluição visual e inflação das métricas de erro.
- **Correção:**
  - Adicionado guardião no SQLite que ignora inserções com o mesmo `error_code`, `module` e detalhes técnicos/mensagem ocorridas nos últimos 3 segundos.

---

### 2.7. Blindagem e Expressividade do Sanitizador
- **Localização:** `src-tauri/src/utils/sanitizer.rs`.
- **Causa:** Regex de cookies podia capturar tokens adjacentes em cabeçalhos HTTP compostos; blocos de chave privada (`-----BEGIN PRIVATE KEY-----`) não possuíam padrão dedicado.
- **Correção:**
  - Adicionados padrões para chaves privadas RSA/EC, cabeçalhos `Authorization: Bearer`, `Cookie: ...`, `Set-Cookie: ...`, chaves de sessão e lookahead `[^\[...]` para não corromper termos já sanitizados.

---

## 3. Matriz de Paridade: Relatórios Anteriores vs. Comportamento Real

| Recurso Declarado | Implementado | Testado Automatizado | Validado no Windows 11 Real | Observações |
|---|---|---|---|---|
| **Poster Studio (Rasterbator)** | Sim | Sim (3 testes) | Sim | Modos Color, Halftone, Floyd-Steinberg e P&B matematicamente fiéis |
| **Downloader Multiplataforma** | Sim | Sim (2 testes) | Sim | SSRF mitigado, playlists suportadas, cancelamento limpo |
| **Audio Converter / Trimmer** | Sim | Sim (1 teste) | Sim | Conversões MP3, WAV, FLAC, AAC, OGG via FFmpeg |
| **Video Converter / Compressor** | Sim | Sim (1 teste) | Sim | CRF configurável, MP4, MKV, WebM, corte preciso |
| **Image Engine** | Sim | Sim (1 teste) | Sim | PNG, JPEG, WebP, BMP, ICO, TIFF via crate `image` |
| **Document Engine** | Sim | Sim (3 testes) | Sim | Merge (renumbering IDs), Split, Organize, Compressão |
| **Central de Erros Persistente** | Sim | Sim (5 testes) | Sim | SQLite dedicado, KPIs, filtros, exportação TXT/JSON |
| **Instalador NSIS Oficial** | Sim | Sim | Sim | `Arce Tools_0.1.0_x64-setup.exe` (3.97 MB) gerado |
