# Auditoria Técnica e Arquitetural — AI Image Studio 2.0 & Agentes por Assinatura
**ToolsOnDesk** (`com.toolsondesk.desktop`) — Missão 09 e Adendo Corretivo
**Data:** 29 de Outubro de 2026
**Ambiente de Desenvolvimento:** Linux x86_64 / Windows 11 host (MSVC)

---

## 1. Resumo Executivo da Auditoria

Esta auditoria estabelece a separação rigorosa entre:
1. **Código Implementado**
2. **Código Compilado**
3. **Testado Localmente (Unitário/Offline)**
4. **Validado com API Real**
5. **Disponível para a Conta / Assinatura do Usuário**
6. **Bloqueado pelo Provedor / Requer Chave**
7. **Não Implementado**

---

## 2. Diagnóstico dos Provedores e Agentes Locais

### 2.1 Agentes por Assinatura (Harness Local — Referência Mausbot / OpenMausBot)

| Agente | Binário Local | Versão Detectada | Estado de Autenticação | Modo de Execução Recomendado | Status de Prontidão |
|---|---|---|---|---|---|
| **OpenAI Codex** | `/home/mateusarcedev/.local/bin/codex` | `codex-cli 0.164.0` | **Autenticado** (Modo: `chatgpt`, tokens ativos, modelo padrão: `gpt-6-sol`) | `codex exec --json --ephemeral [PROMPT]` ou `codex app-server` | **DISPONÍVEL PARA A CONTA & VALIDADO LOCALMENTE** |
| **Google Antigravity** | `/home/mateusarcedev/.local/bin/agy` | `1.4.10` | **Autenticado** (Acesso verificado a `gemini-3.8-flash-high`, `claude-sonnet-4-6`, etc.) | `agy --print [PROMPT]` e `--output-format stream-json` | **DISPONÍVEL PARA A CONTA & VALIDADO LOCALMENTE** |
| **Claude Code** | `/home/mateusarcedev/.local/bin/claude` | `2.1.309` | **Não Autenticado** (`claude auth status` -> `loggedIn: false`) | `claude -p [PROMPT]` após login (`claude login`) | **IMPLEMENTADO / REQUER LOGIN** |
| **OpenCode** | `/home/mateusarcedev/.opencode/bin/opencode` | `v2.2.0` | **Instalado** (Binário presente, orquestrador Rust de fallback ativo) | `opencode run` / ACP | **IMPLEMENTADO & TESTADO LOCALMENTE** |

### 2.2 Provedor NVIDIA NIM (Visual & LLM)

- **Base URLs Oficiais:**
  - Chat/Completions: `https://integrate.api.nvidia.com/v1`
  - GenAI Visual (Image/Video): `https://ai.api.nvidia.com/v1/genai`
- **Armazenamento de Credenciais:**
  - Gerenciado com segurança via `SecureVault` (DPAPI no Windows, Secret Service/Hardware Entropy no Linux, Apple Keychain no macOS).
  - Sanitização obrigatória de logs (`[PROTECTED_NVIDIA_KEY]`).
- **Chave de API NVIDIA Atual:**
  - Nenhuma chave `nvapi-...` está atualmente gravada no vault local do workspace.
  - **Status:** **BLOQUEADO PELO PROVEDOR / REQUER CHAVE**. A aplicação não deve forjar gerações fictícias quando a chave estiver ausente ou sem créditos; ela deve reportar erro amigável orientando o usuário a configurar sua chave ou utilizar o aprimoramento por agentes locais.

---

## 3. Matriz de Capacidades dos Modelos de Imagem (NVIDIA NIM)

| Modelo NIM | Endpoint Oficial | Modos Suportados | Resoluções & Aspect Ratio | Steps / Parâmetros | Suporte a Imagem de Referência |
|---|---|---|---|---|---|
| **FLUX.1 [schnell]** (`black-forest-labs/flux.1-schnell`) | `/v1/genai/black-forest-labs/flux.1-schnell` | Text-to-Image ultra-rápido | 1:1 (1024x1024), 16:9 (1344x768), 9:16 (768x1344), 4:3 (1152x864), 3:4 (864x1152) | 1 a 4 steps, seed, guidance scale (1.0-4.0) | **Não suporta** imagem de referência do usuário; somente prompt textual. |
| **FLUX.1 [dev]** (`black-forest-labs/flux.1-dev`) | `/v1/genai/black-forest-labs/flux.1-dev` | Text-to-Image alta fidelidade | 1024x1024 base, múltiplos aspect ratios | 20 a 50 steps, seed, guidance scale | **Não suporta** imagem de referência direta de usuário neste endpoint. |
| **Stable Diffusion 3.5 Large** (`stabilityai/stable-diffusion-3.5-large`) | `/v1/genai/stabilityai/stable-diffusion-3.5-large` | Text-to-Image com composição | 1024x1024 base, 16:9, 9:16 | 20 a 40 steps, cfg_scale (3.0-9.0), negative prompt | **Não suporta** imagem de referência direta de usuário sem endpoint dedicado de inpainting/controlnet. |
| **Modelos com `example_id` (NVIDIA Preview)** | Vários sob `/v1/genai/...` | Demonstrações de catálogo | Fixas conforme catálogo | Limitados à galeria pré-armazenada na nuvem da NVIDIA | **Apenas `example_id` pré-definido da NVIDIA**. Não aceitam upload de binário bruto do usuário. |

> [!IMPORTANT]
> **Contrato de Integridade de Imagem de Referência:**
> Para edição ou variação que necessite de imagem existente do usuário, o ToolsOnDesk divide a operação claramente:
> 1. **Edição Local Não-Destrutiva**: Processada 100% nativa em Rust (recorte, rotação, ajustes de cor, conversão de formato).
> 2. **Variações Gerativas Assistidas**: O prompt e a descrição visual da imagem de referência são analisados pelo agente local (Codex / Antigravity) para construir um prompt derivado rico e coerente, enviado aos geradores disponíveis.

---

## 4. Pipeline de Edição Local de Imagens

O motor `ImageEngine` nativo em Rust (`src-tauri/src/engines/image_engine.rs`) e comandos correspondentes suportam:
1. **Recorte (Crop)**: Dimensões retangulares arbitrárias ou travamento em proporções (1:1, 16:9, 9:16, 4:5, 4:3).
2. **Redimensionamento (Resize)**: Algoritmo Lanczos3 preservando nitidez.
3. **Orientação**: Rotação (90°, 180°, 270°) e espelhamento (horizontal / vertical).
4. **Ajustes de Cor e Luz**:
   - Brilho (`adjust_contrast`, `brighten` com clamp seguro).
   - Contraste.
   - Saturação (conversão HSL/RGB precisa).
5. **Conversão de Formato**: PNG, JPEG (com qualidade configurável 1-100), e geração de cópias derivadas.
6. **Integridade de Versionamento**: O arquivo original nunca é sobrescrito no disco. Uma nova versão com sufixo `_edited_<timestamp>` é gerada em `%LOCALAPPDATA%/ToolsOnDesk/creative_assets/images/` e registrada no banco `creative_assets` como ativo derivado.

---

## 5. Estratégia de Versionamento e Galeria

- **Entidades no Banco SQLite (`db.rs`):**
  - `creative_projects`: Agrupa trabalhos e composições.
  - `creative_assets`: Lista todos os arquivos com metadados (`id`, `project_id`, `name`, `asset_type`, `file_path`, `file_size_bytes`, `width`, `height`, `mime_type`, `created_at`).
  - `creative_generation_history`: Registra histórico de prompts, seeds, tempos de resposta e erros de cada chamada gerativa.
- **Diferenciação de Tipos na Galeria:**
  - `ai_generated`: Gerado via NVIDIA NIM.
  - `edited`: Produzido a partir do editor local de imagem.
  - `imported`: Importado do disco pelo usuário.
  - `motion_export`: Renderizado pelo Motion Studio.
- **Comparador Lado a Lado (`ProposalComparator`):**
  - Permite colocar 2 a 4 imagens lado a lado com zoom sincronizado, inspeção de detalhes e seleção direta para o Motion Studio ou exportação.

---

## 6. Integração Real com Motion Studio

- **Fluxo do Ativo:**
  1. No AI Image Studio, o usuário seleciona uma imagem gerada ou editada e clica em **"Enviar ao Motion Studio"**.
  2. O backend/frontend insere a imagem como uma nova `MotionLayer` (`layer_type: "image"`, `content: file_path`) na cena ativa da `MotionComposition`.
  3. A cena configura animação (ex: `zoom_in` ou `fade_in`), escala e posicionamento central.
  4. O motor `MotionEngine` renderiza um vídeo real `.mp4` via FFmpeg com `overlay` da imagem em alta resolução.
  5. Teste automatizado valida a criação física do arquivo de vídeo reproduzível.

---

## 7. Classificação por Status das Funcionalidades

| Funcionalidade | Status M08 | Novo Status M09 | Observações |
|---|---|---|---|
| Aprimoramento de Prompt via Codex CLI | NÃO IMPLEMENTADO | **DISPONÍVEL PARA A CONTA & VALIDADO** | Execução real via `codex exec --json` com streaming e thread oficial. |
| Aprimoramento de Prompt via Antigravity CLI | NÃO IMPLEMENTADO | **DISPONÍVEL PARA A CONTA & VALIDADO** | Execução real via `agy --print` / `--output-format stream-json`. |
| Gerenciamento de Login Claude Code | NÃO IMPLEMENTADO | **IMPLEMENTADO / REQUER LOGIN** | Detecção e disparo do fluxo oficial `claude login`. |
| Central de Agentes de IA em Configurações | NÃO IMPLEMENTADO | **IMPLEMENTADO & TESTADO LOCALMENTE** | Painel interativo para verificar status, contas e modelos. |
| Contrato e Validação de Endpoints NVIDIA NIM | PARCIAL | **IMPLEMENTADO & TESTADO LOCALMENTE** | FLUX.1-schnell, FLUX.1-dev, SD 3.5 com contratos estritos. |
| Chamada Real NVIDIA NIM (com chave) | TESTADO MOCK/ESTRUTURAL | **BLOQUEADO PELO PROVEDOR / REQUER CHAVE** | Endpoint pronto; aguarda chave válida no vault. |
| Editor Local de Imagem (Crop, Cor, Rot) | NÃO IMPLEMENTADO | **IMPLEMENTADO & TESTADO LOCALMENTE** | Motor Rust puro (`image` crate Lanczos3). |
| Galeria Reativa com Filtros e Miniaturas | PARCIAL | **IMPLEMENTADO & TESTADO LOCALMENTE** | Filtros, busca, favoritos e metadados detalhados. |
| Comparador de Propostas Lado a Lado | PARCIAL | **IMPLEMENTADO & TESTADO LOCALMENTE** | Zoom, metadados e seleção para composição. |
| Envio Real de Imagem ao Motion Studio + MP4 | PARCIAL | **IMPLEMENTADO & TESTADO LOCALMENTE** | Renderização com FFmpeg validada em arquivo de mídia real. |
| Ingestão Multimodal de Arquivos de Referência | NÃO IMPLEMENTADO | **DISPONÍVEL PARA A CONTA & VALIDADO** | Ingestão de imagens, PDFs (lopdf), DOCX, TXT/MD, SVG seguro com finalidades e inspeção completa. |
| Visão Multimodal com Codex CLI (`-i`) e Antigravity | NÃO IMPLEMENTADO | **DISPONÍVEL PARA A CONTA & VALIDADO** | Testado e verificado ao vivo com imagem real na máquina. |
| Rastreabilidade Completa de Metadados da Geração | NÃO IMPLEMENTADO | **IMPLEMENTADO & TESTADO LOCALMENTE** | Persistência em SQLite WAL (`creative_generation_history`) e modal de auditoria. |

---

## 8. Relatório de Homologação Final

Consulte o documento completo de homologação em [`docs/IMAGE-STUDIO-HOMOLOGATION.md`](file:///home/mateusarcedev/projetos/arce-tools/docs/IMAGE-STUDIO-HOMOLOGATION.md) para detalhes dos testes unitários, matriz de status funcional e matriz de compatibilidade com modelos reais.
