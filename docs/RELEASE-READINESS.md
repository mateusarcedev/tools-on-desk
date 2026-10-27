# Checklist de Prontidão para Lançamento (Release Readiness) — Arce Tools

Este documento avalia todos os critérios de qualidade, confiabilidade, segurança e experiência do usuário para homologação da versão **0.1.0** do Arce Tools para Windows 11.

---

## 1. Resumo do Status Geral

| Dimensão de Qualidade | Status | Observações |
|---|---|---|
| **Segurança & Privacidade** | ✅ APROVADO | SSRF mitigado, sanitização em 7 camadas, logs sem credenciais |
| **Estabilidade & Durabilidade** | ✅ APROVADO | SQLite com índices, deduplicação de erros, cancelamento limpo |
| **Performance no Windows 11** | ✅ APROVADO | Cold start 1.69s, Warm start 0.93s, 28MB RAM processo principal |
| **Cobertura de Testes** | ✅ APROVADO | 14 testes backend (Rust), 20 testes frontend (Vitest), 0 erros TS |
| **Empacotamento & Distribuição** | ✅ APROVADO | Instalador oficial NSIS gerado (3.97 MB) com desinstalador |
| **Experiência do Usuário (UX)** | ✅ APROVADO | Frameless window com barra única, suporte a 1024x720 a 1920x1080 |

---

## 2. Checklist Detalhado por Área

### 2.1. Segurança Desktop e IPC
- [x] **Proteção contra SSRF:** O módulo de Downloads rejeita domínios locais (`localhost`, `0.0.0.0`, `::1`) e faixas privadas IPv4/IPv6 (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local).
- [x] **Sanitização de Dados Confidenciais:** O módulo `sanitizer.rs` higieniza senhas, tokens de API, cabeçalhos `Authorization: Bearer`, cookies de sessão, chaves privadas e caminhos com nomes de usuário (`C:\Users\[USER]\`).
- [x] **Permissões Tauri 2:** IPC seguro com comandos explicitamente declarados e isolados.
- [x] **Proteção contra Injeção de Comandos:** Comandos externos executados diretamente via `std::process::Command` com vetor de argumentos (`args`), sem concatenação em shell (`cmd.exe /C`).

### 2.2. Confiabilidade e Resiliência
- [x] **Encerramento de Processos em Árvore:** Uso de `taskkill /F /T /PID` no cancelamento de tarefas de mídia, evitando vazamento de executáveis `ffmpeg` ou `yt-dlp`.
- [x] **Limpeza de Arquivos Temporários:** Cancelamento de download expurga arquivos parciais `.part`, `.ytdl` e `.temp`.
- [x] **React ErrorBoundary:** Captura de falhas inesperadas na renderização do React sem fechar o processo desktop, com botão de recuperação e registro em SQLite.
- [x] **SQLite Robusto:** Tabela `error_logs` e `tasks` com índices otimizados (`created_at DESC`, `module`, `severity`, `status`, `task_id`).
- [x] **Deduplicação de Logs:** Janela de 3 segundos impede que erros propagados entre camadas gerem logs duplicados.

### 2.3. Paridade Funcional dos Módulos
- [x] **Poster Studio:** Modo Rasterbator com grade de folhas, margens úteis, sangria, e modos de saída P&B, Halftone Mono/Color e Floyd-Steinberg.
- [x] **Downloader:** Suporte a vídeos, áudios e playlists com metadados prévios e seleção de qualidade.
- [x] **Áudio & Vídeo:** Conversão multiformato, compressão com CRF inteligente, corte com precisão e extração de áudio.
- [x] **Documentos:** Inspeção de PDFs, junção com renomeação de IDs de objetos (`lopdf`), divisão por intervalos, compressão e conversão Word/PDF com aviso de LibreOffice.
- [x] **Central de Erros e Diagnósticos:** Visualização com cards expansíveis, KPIs em tempo real, filtros dinâmicos, cópia individual, cópia total/filtrada e exportação TXT/JSON.

### 2.4. Design, Shell e Usabilidade
- [x] **Barra de Título Única:** Window decorations do sistema desativadas (`decorations: false`), barra customizada integrada com drag region nativa e botões minimizar/maximizar/fechar.
- [x] **Responsividade:** Layout testado em 1024x720, 1366x768 e 1920x1080 sem cortes de texto ou overflow horizontal.
- [x] **Feedback Visual:** Confirmação de cópia com estado `Copiado!` em tempo real no botão e toasts informativos.
- [x] **Padronização em Português (pt-BR):** Termos e orientações consistentes em todas as telas e mensagens de diagnóstico.

---

## 3. Resolução de Dependências Externas (Fresh Windows Machine)

O aplicativo conta com resolução em quatro níveis para ferramentas externas (`ffmpeg`, `ffprobe`, `yt-dlp`):
1. **Pasta de Binários do Aplicativo:** `<app_dir>\binaries\` ou pasta relativa ao executável.
2. **Cache Local do Arce Tools:** `%LOCALAPPDATA%\ArceTools\binaries\`.
3. **Instalações do WinGet:** `%LOCALAPPDATA%\Microsoft\WinGet\Packages\` e `%LOCALAPPDATA%\Microsoft\WinGet\Links\`.
4. **Variável de Ambiente PATH:** Qualquer binário registrado globalmente no sistema operacional.

Caso o usuário instale o software em uma máquina limpa sem dependências, a interface emite alerta amigável e orienta o download ou instalação automática via WinGet (`winget install Gyan.FFmpeg yt-dlp`).
