# Agentes de IA por Assinatura — Arquitetura de Harness Local (ToolsOnDesk)

## 1. Visão Geral e Referência Arquitetural

Com base nos princípios abertos do **Mausbot / OpenMausBot** (arquitetura de harness e supervisão de agentes com contas ativas), o **ToolsOnDesk** integra os motores de CLI oficiais de inteligência artificial já instalados e autenticados no computador do usuário:

- **OpenAI Codex**: `codex-cli` com sessão ativa via assinatura ChatGPT Plus/Pro/Team (`stored auth mode: chatgpt`).
- **Google Antigravity**: CLI `agy` com sessão ativa da conta Google Antigravity e modelos multimodais de alta velocidade.
- **Claude Code**: CLI oficial `claude` da Anthropic (`claude auth status`, `claude -p`).
- **OpenCode**: Orquestrador de código aberto local para tarefas criativas e scaffolding.

Esta integração opera **diretamente no harness do usuário**, sem exigir chaves de API avulsas ou intermediários de nuvem de terceiros para funcionalidades já cobertas pela assinatura oficial do usuário.

---

## 2. Matriz de Estados e Descoberta

| Agente | Binário | Detecção de Versão | Verificação de Autenticação | Modelos Ativos |
| :--- | :--- | :--- | :--- | :--- |
| **OpenAI Codex** | `codex` / `codex.exe` | `codex --version` | `codex doctor` (inspeção de tokens ChatGPT) | `gpt-6-sol`, `o3-mini`, `gpt-5.3-codex` |
| **Google Antigravity** | `agy` | `agy --version` | `agy models` (enumeração de quotas autorizadas) | `gemini-3.8-flash-high`, `claude-sonnet-4.6`, `gemini-3-pro` |
| **Claude Code** | `claude` | `claude --version` | `claude auth status` (verificação JSON de login) | `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-5-haiku` |
| **OpenCode** | `opencode` | `opencode --version` | Presença do binário e workspace isolado | `opencode-default` |

### Tratamento de Falha Fechada e Concorrência POSIX
Todas as invocações de subprocessos nos drivers de agentes:
1. Utilizam `cmd.stdin(Stdio::null())` para evitar paradas por sinal `SIGTTIN` sob sistemas Unix em novos grupos de processos (`cmd.process_group(0)`).
2. Aplicam `tokio::time::timeout(Duration::from_secs(3), ...)` na detecção para impedir bloqueios caso algum CLI aguarde entrada do usuário.
3. Terminam processos filhos e árvores via `ProcessManager::terminate_process_tree` (`taskkill /F /T` no Windows, `SIGTERM -> 300ms -> SIGKILL + wait()` no Linux/macOS).

---

## 3. Direção Artística no AI Image Studio 2.0

O harness expõe a função `enhance_image_prompt` (`AgentManager::enhance_image_prompt`), que submete uma ideia de prompt bruta ao agente ativo selecionado pelo usuário com instruções de direção de arte visual:

```
[ENHANCED_PROMPT]: Versão expandida, hiperdetalhada e fotográfica pronta para FLUX/SD
[REASONING]: Justificativa conceitual e balanceamento de iluminação/textura
[RECOMMENDED_STYLE]: Estilo recomendado (ex: Publicitário, Cinemático, Fotorealista)
[RECOMMENDED_RATIO]: Proporção geométrica recomendada (ex: 1:1, 16:9, 9:16)
```

O frontend do Image Studio (`PromptEnhancerWidget.tsx`) recebe os blocos estruturados e permite aplicar diretamente ao prompt da interface com um único clique.
