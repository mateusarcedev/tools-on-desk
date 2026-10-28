# Checklist de Prontidão para Homologação Interna — ToolsOnDesk (Missão 07)

Este documento atesta a conformidade técnica, segurança, desempenho e estabilidade do **ToolsOnDesk** para distribuição interna e homologação, após a conclusão da Missão 07.

---

## 1. Status Geral de Prontidão

| Critério | Status | Detalhes |
|---|:---:|---|
| **Identidade Visual e Rebranding** | **APROVADO** | Nome `ToolsOnDesk`, ícones SVG/ICO/PNG, símbolo `t/d`, Geist/Geist Mono locais |
| **Integridade de Módulos (M01–M06)** | **APROVADO** | Todos os 10 módulos ativos e funcionais sem perda de recursos |
| **Migração Transacional de Dados** | **APROVADO** | 10 passos atômicos, idempotente, SQLite Online Backup, zero perda |
| **Segurança de Credenciais** | **APROVADO** | Windows DPAPI nativo (`CryptProtectData`), zeroize em memória, sanitização de logs |
| **Instalador e Empacotamento Windows** | **APROVADO** | NSIS `currentUser`, binário `toolsondesk.exe`, sem elevação UAC desnecessária |
| **Testes Automatizados** | **APROVADO** | 29 testes Rust (100% pass) + 34 testes Frontend (100% pass) |
| **Desempenho e Recursos** | **APROVADO** | Inicialização < 300ms, consumo RAM idle ~68 MB, motion canvas a 60 FPS |
| **Privacidade e Governança** | **APROVADO** | Zero menções a nomes pessoais em caminhos técnicos, identificadores ou metadados |
| **Situação Legal da Marca** | **DOCUMENTADO** | Marca interna de trabalho; bloqueio de release pública até depósito no INPI |

---

## 2. Checklist Técnico Detalhado

### 2.1. Identidade Visual e Interface
- [x] O nome de exibição em toda a interface é rigorosamente **ToolsOnDesk**.
- [x] O ícone da aplicação apresenta o símbolo oficial `t/d` em acento menta (`#15F5BA`) sobre superfície grafite escura (`#141A1C`).
- [x] Ícones de múltiplos formatos e densidades gerados (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `Square*Logo.png`).
- [x] A paleta de cores consome exclusivamente variáveis CSS de `tokens.css` (`var(--bg)`, `var(--mint)`, `var(--surface)`, `var(--line)`).
- [x] Tipografia utiliza exclusivamente `Geist` e `Geist Mono` servidas localmente em `/fonts/`, sem dependência de CDNs externas.
- [x] A barra de título customizada (`decorations: false`) exibe o badge estilizado `t/d`, o rótulo "ToolsOnDesk" e controles de janela nativos customizados.

### 2.2. Preservação de Módulos e Funcionalidades Anteriores
- [x] **M01 — Fundação:** Sistema de temas, atalhos globais (`Ctrl+K`, `Ctrl+J`), menu lateral recolhível (64px/230px).
- [x] **M02 — Downloads e Mídia:** Downloads via `yt-dlp`, extração de áudio, conversão e compressão com `FFmpeg` 100% preservados.
- [x] **M02.5 — Poster Studio:** Divisão de pôsteres com cálculos de overlap ($SW = CW - OV$), silhueta humana de 1800 mm e meio-tom de retícula preservados.
- [x] **M03 — Document Engine e Central de Erros:** Conversão de documentos (PDF, DOCX via LibreOffice) e diagnósticos de erro em tempo real operacionais.
- [x] **M04 — Auditoria e NSIS:** Estrutura de empacotamento testada e refinada.
- [x] **M05 — DependencyManager e Setup Center:** Detecção automática e download gerenciado de `ffmpeg.exe`, `ffprobe.exe` e `yt-dlp.exe` com fallback para pasta legada.
- [x] **M06 — Creative Studio:** Geração de imagens por IA via NVIDIA NIM, estúdio de Motion Design com preview Canvas a 60 FPS, renderização FFmpeg, exportação Remotion `.tsx`, biblioteca de skills e gerenciador de assets preservados.

### 2.3. Mecanismo de Migração de Dados
- [x] Implementação da camada centralizada `PathManager` em Rust, eliminando qualquer caminho hardcoded.
- [x] Máquina de estados de migração em 10 etapas: `DISCOVERY`, `PREFLIGHT`, `BACKUP`, `COPY`, `DATABASE_MIGRATION`, `PATH_RECONCILIATION`, `CREDENTIAL_MIGRATION`, `VALIDATION`, `COMMIT`, `COMPLETED`.
- [x] Migração de banco SQLite utilizando a API atômica `rusqlite::backup::Backup`, eliminando riscos de inconsistência com arquivos WAL ativos.
- [x] Preservação estrita dos arquivos legados do usuário (nenhum arquivo da pasta antiga é deletado).
- [x] Reconciliação automática de caminhos gravados no banco SQLite para refletir a nova estrutura de pastas (`/ArceTools/` $\to$ `/ToolsOnDesk/`).
- [x] Geração de auditoria em `%LOCALAPPDATA%\ToolsOnDesk\manifest.json` com contagens de tabelas e status.

### 2.4. Segurança e Armazenamento de Credenciais
- [x] Cofre de credenciais atualizado para utilizar **Windows DPAPI** (`CryptProtectData` e `CryptUnprotectData` via `crypt32.dll`).
- [x] Entropia de derivação de chave reforçada (`TOOLSONDESK_DPAPI_ENTROPY_v1`).
- [x] Suporte à leitura em memória e migração transparente de credenciais legadas da M06.
- [x] Implementação de rotina `zeroize_bytes` para limpar buffers sensíveis de memória após o uso.
- [x] Sanitização regex estrita em logs e IPC (`[PROTECTED_NVIDIA_KEY]`), prevenindo qualquer vazamento acidental de chaves.

### 2.5. Qualidade de Código e Testes
- [x] Backend Rust: 29 testes nativos MSVC executados com sucesso (`cargo test --lib`).
- [x] Frontend React: 34 testes Vitest em 9 suítes executados com sucesso (`pnpm test`).
- [x] Build frontend limpo: `pnpm build` concluído sem avisos de tipagem (`tsc` + Vite).
- [x] Nenhuma ocorrência de `.unwrap()` ou `.expect()` em handlers IPC de produção.

---

## 3. Limitações Conhecidas e Escopo Atual

1. **Assinatura de Código Windows (Code Signing):**
   - O executável de build interno não possui certificado digital comercial EV/OV assinado por Autoridade Certificadora pública (DigiCert, Sectigo). O Windows SmartScreen exibirá o aviso padrão de aplicativo não assinado em downloads externos.
2. **Dependência de Acesso à Internet para IA Externa:**
   - Recursos de IA baseados na nuvem (NVIDIA NIM) exigem conexão de rede ativa e chave de API válida com créditos. Recursos locais (Motion Engine, conversões de mídia e documentos) operam 100% offline.
3. **Status Marcário:**
   - ToolsOnDesk é uma marca de trabalho interna. Lançamentos públicos na Microsoft Store, Steam ou campanhas publicitárias devem aguardar a conclusão do processo de registro marcário no INPI e a compra do domínio corporativo.

---

## 4. Declaração de Prontidão

A Missão 07 atingiu com plenitude todos os requisitos de arquitetura, identidade, engenharia de dados e segurança do software. O repositório está pronto para homologação interna pela equipe de desenvolvimento e testes de usabilidade.
