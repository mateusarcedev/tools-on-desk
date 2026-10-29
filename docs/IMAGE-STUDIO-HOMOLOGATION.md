# Relatório de Homologação Funcional — AI Image Studio com Arquivos de Referência Multimodais
**ToolsOnDesk** (`com.toolsondesk.desktop`) — Missão 09
**Data:** 29 de Outubro de 2026
**Ambiente:** Linux x86_64 / Windows 11 host (MSVC)
**Repositório:** `/home/mateusarcedev/projetos/arce-tools`

---

## 1. Visão Geral da Homologação

A Missão 09 concluiu a arquitetura do **AI Image Studio**, integrando suporte completo a **arquivos de referência multimodais** (imagens de produtos, identidades visuais em PDF, briefings em DOCX, especificações em Markdown/TXT e gráficos em SVG seguro).

Todas as capacidades foram homologadas com base em testes unitários e de integração (Rust e Vitest), verificações ao vivo dos binários CLI disponíveis na máquina hospedeira (`codex-cli 0.164.0` e `agy 1.4.10`) e análise contratual estrita das APIs remotas (NVIDIA NIM).

---

## 2. Critérios de Homologação Executados

### A. Upload e Anexo de Referências Multimodais
- **Mecanismos Suportados:**
  - *Drag and Drop* nativo sobre a área "Arquivos de referência".
  - *Seletor de arquivos nativo* com suporte a seleção múltipla (`openDialog` via `@tauri-apps/plugin-dialog`).
  - *Importação de ativos existentes*: Reutilização direta da galeria `creative_assets` via modal da Biblioteca de Assets.
- **Validação de Formatos e Limites:**
  - Limite individual de 50 MB por arquivo para prevenir saturação de memória.
  - Extração de dimensões em pixels e geração de miniaturas base64 para imagens (PNG, JPEG, WebP, BMP, GIF).
  - Sanitização de arquivos SVG rejeitando tags `<script>`, URIs `javascript:` e declarações de entidade externa `<!ENTITY` (mitigação de XXE e XSS).

### B. Extração Estruturada de Documentos
- **PDF (`lopdf`):**
  - Contagem precisa de páginas do documento.
  - Extração da camada de texto vetorial. Se o texto extraído tiver menos de 15 caracteres (PDF digitalizado/rasterizado), a engine atribui honestamente o status `scanned_pdf_ocr_unavailable`, alertando o usuário sobre a ausência de camada OCR.
- **DOCX (ZIP + XML DOM):**
  - Descompressão segura do pacote OpenXML (`word/document.xml`).
  - Varredura de nós `w:p` (parágrafos) e `w:t` (runs de texto), concatenando conteúdo legível com preservação de quebras de linha.
- **Texto Puro e Markdown (TXT / MD / JSON / CSV):**
  - Validação estrita de codificação UTF-8.
  - Limite seguro de extração textual de até 500 KB para evitar exaustão de contexto do modelo.

### C. Gestão de Finalidades e Transparência
- **Finalidades Configuráveis:** Cada anexo possui uma finalidade opcional selecionável:
  - `product` (Referência de produto)
  - `style` (Referência de estilo visual)
  - `composition` (Referência de composição)
  - `lighting` (Referência de iluminação)
  - `character` (Referência de personagem)
  - `brand_identity` (Identidade visual da marca)
  - `instructions` (Instruções detalhadas)
  - `additional_context` (Contexto complementar)
- **Aviso de Orientação Artística:** A interface exibe aviso claro e transparente informando que a finalidade atua como guia semântico para a direção de arte do modelo multimodal, não constituindo uma garantia matemática ou cópia exata de identidade no resultado da síntese.

### D. Refinamento de Prompt com Agentes Multimodais Reais
- **Validação ao Vivo com Modelos:**
  - **OpenAI Codex CLI (`codex exec -i <image>`):** Validado ao vivo com a imagem `./src-tauri/icons/ios/AppIcon-512@2x.png`. O modelo analisou com precisão o monograma "TD", as cores verde-menta e fundo escuro.
  - **Google Antigravity CLI (`agy -p <prompt>`):** Validado ao vivo na mesma imagem, retornando descrição multimodal completa dos elementos de design.
  - **Injeção de Documentos:** Documentos de texto (PDF/DOCX/TXT/MD) têm seu conteúdo textual extraído e envelopado em blocos delimitados `--- DOCUMENTO DE REFERÊNCIA (Nome, Finalidade) ---` inseridos diretamente no prompt context do agente.

### E. Separação Honesta de Endpoints NVIDIA NIM
- Os endpoints de difusão de imagens disponibilizados pela NVIDIA NIM (`black-forest-labs/flux.1-schnell`, `black-forest-labs/flux.1-dev`, `stabilityai/stable-diffusion-3.5-large`) são APIs puramente **Text-to-Image**.
- O ToolsOnDesk não falsifica compatibilidade direta de img2img nesses endpoints:
  - O backend e o frontend classificam esses modelos como `diffusion_compatible: false` para entrada binária direta de imagem.
  - A imagem anexada orienta o **agente multimodal** (Codex/Antigravity), que gera um prompt textual refinado, o qual é então enviado ao endpoint de difusão.

### F. Rastreabilidade Completa e Histórico SQLite
- Cada geração executada armazena um registro completo na tabela `creative_generation_history` com:
  - Prompt original digitado pelo usuário.
  - Prompt final enriquecido pelo agente.
  - Agente utilizado e modelo.
  - Modelo de difusão NVIDIA, seed, steps, cfg_scale e aspect ratio.
  - Lista completa de referências anexadas com seus nomes, tamanhos, caminhos, miniaturas, contagem de páginas e finalidades.
- O componente `GenerationMetadataModal` permite inspecionar toda a trilha de auditoria para qualquer imagem da galeria, copiar os metadados em JSON formatado e reencaminhar o ativo para o Motion Studio.

### G. Renderização de Vídeo e Integração com Motion Studio
- Imagens geradas ou editadas podem ser adicionadas diretamente à composição de Motion Studio.
- O motor `MotionEngine` renderiza um vídeo MP4 real com codificação `libx264` e composição gráfica via FFmpeg, inspecionado e validado pelo `ffprobe`.

---

## 3. Matrizes de Homologação

### Matriz 1: Status Funcional do Sistema

| Funcionalidade | Implementada | Validada localmente | Validada com modelo real | Bloqueio |
|---|:---:|:---:|:---:|---|
| **Anexo de Referências (Drag & Drop)** | Sim | Sim (Vitest) | Sim (Frontend) | Nenhum |
| **Seletor Nativo de Múltiplos Arquivos** | Sim | Sim (Vitest) | Sim (Tauri Dialog) | Nenhum |
| **Reutilização da Biblioteca de Assets** | Sim | Sim (Vitest) | Sim (SQLite) | Nenhum |
| **Inspeção e Miniaturas de Imagens (PNG/JPG/WebP)** | Sim | Sim (Rust unit tests) | Sim (ImageEngine) | Nenhum |
| **Validação Segura de SVG (Anti-XXE/XSS)** | Sim | Sim (Rust unit tests) | Sim (ReferenceEngine) | Nenhum |
| **Extração de Texto de PDF (`lopdf`)** | Sim | Sim (Rust unit tests) | Sim (PDFs locais) | Nenhum |
| **Detecção Honesta de PDF Escaneado (Sem OCR)** | Sim | Sim (Rust unit tests) | Sim (Status UI) | Nenhum |
| **Extração de Parágrafos DOCX (XML OpenXML)** | Sim | Sim (Rust unit tests) | Sim (DOCX local) | Nenhum |
| **Leitura Segura de TXT, MD, JSON, CSV** | Sim | Sim (Rust unit tests) | Sim (ReferenceEngine) | Nenhum |
| **Seleção de Finalidade das Referências** | Sim | Sim (Vitest) | Sim (UI + IPC) | Nenhum |
| **Visão Multimodal com OpenAI Codex (`-i`)** | Sim | Sim (Testes) | Sim (`codex-cli 0.164.0`) | Nenhum (sessão ativa) |
| **Visão Multimodal com Google Antigravity** | Sim | Sim (Testes) | Sim (`agy 1.4.10`) | Nenhum (sessão ativa) |
| **Direção de Arte com Claude Code** | Sim | Sim (Harness) | Não (Requer Login) | Requer `claude login` |
| **Direção de Arte com OpenCode** | Sim | Sim (Fallback Rust) | Sim (Binário local) | Nenhum |
| **Editor Nativo de Imagem (Crop, Rot, Mirror, Cores)** | Sim | Sim (Rust + Vitest) | Sim (Rust Lanczos3) | Nenhum |
| **Comparador de Propostas Lado a Lado** | Sim | Sim (Vitest) | Sim (UI) | Nenhum |
| **Trilha de Auditoria e Metadados (SQLite + Modal)** | Sim | Sim (Rust + Vitest) | Sim (SQLite WAL) | Nenhum |
| **Chamada Real NVIDIA NIM (Geração Remota)** | Sim | Sim (Contratos e Tipos) | Não (Sem chave no vault) | Requer `NVAPI_KEY` do usuário |
| **Composição e Renderização MP4 no Motion Studio** | Sim | Sim (Rust test 44) | Sim (FFmpeg 8.0.1) | Nenhum |

---

### Matriz 2: Matriz de Compatibilidade dos Agentes e Modelos

| Agente / Modelo | Texto / Prompt | Imagem Própria (Visão) | Múltiplas Imagens | Documento PDF | Documento DOCX | Edição Local de Imagem |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **OpenAI Codex** (`gpt-4o`, `gpt-6-sol`) | Total | Total (`-i <path>`) | Total (Múltiplas flags `-i`) | Extração textual injetada | Extração textual injetada | Delega ao `ImageEngine` |
| **Google Antigravity** (`gemini-3.8-flash-high`) | Total | Total (Percepção visual direta) | Total (Múltiplos caminhos no contexto) | Extração textual injetada | Extração textual injetada | Delega ao `ImageEngine` |
| **Claude Code** (`claude-3-7-sonnet`) | Total | Suportado após login CLI | Suportado após login CLI | Extração textual injetada | Extração textual injetada | Delega ao `ImageEngine` |
| **OpenCode** (Local / Fallback) | Total | Suportado via ACP | Suportado via ACP | Extração textual injetada | Extração textual injetada | Delega ao `ImageEngine` |
| **FLUX.1 [schnell] (NVIDIA NIM)** | Total (Text-to-Image) | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não aplicável (Endpoint remoto) |
| **FLUX.1 [dev] (NVIDIA NIM)** | Total (Text-to-Image) | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não aplicável (Endpoint remoto) |
| **SD 3.5 Large (NVIDIA NIM)** | Total (Text-to-Image) | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não suportado na API NIM* | Não aplicável (Endpoint remoto) |
| **ToolsOnDesk ImageEngine** | Não aplicável | Total (Carregamento nativo) | Total (Lote em disco) | Renderização PDF via DocumentEngine | Não aplicável | Total (Recorte, rotação, espelho, cor) |

*\*Nota de integridade técnica:* Os endpoints oficiais NVIDIA NIM para FLUX e SD 3.5 Large são puramente geradores Text-to-Image. O ToolsOnDesk realiza o condicionamento estético e semântico através da direção de arte dos agentes multimodais (Codex e Antigravity), sem simular ou fingir capacidades de imagem que a API remota não possui.

---

## 4. Resultados da Suíte Automatizada de Verificação

### Backend Rust:
```bash
cargo test --lib --manifest-path src-tauri/Cargo.toml
test result: ok. 44 passed; 0 failed; 0 ignored; finished in 6.97s
```
- Total de testes Rust: **44 aprovados (100%)**.

### Frontend Vitest:
```bash
pnpm test
Test Files: 10 passed (10)
Tests:      40 passed (40)
Duration:   13.15s
```
- Total de testes Vitest: **40 aprovados (100%)**.

### Build de Produção do Frontend:
```bash
pnpm build
✓ built in 591ms (dist/index.html, dist/assets/index.js, dist/assets/index.css)
Exit code: 0
```
- TypeScript (`tsc`) e empacotamento Vite sem nenhum erro.
