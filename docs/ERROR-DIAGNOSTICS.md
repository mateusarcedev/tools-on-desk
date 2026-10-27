# Central de Erros e Diagnósticos — Arce Tools

A **Central de Erros e Diagnósticos** do Arce Tools é um subsistema nativo e persistente projetado para auditoria técnica, suporte ao usuário e depuração segura de tarefas desktop.

---

## 1. Arquitetura e Princípios

1. **Persistência Confiável**: Todos os erros gerados por tarefas assíncronas do TaskManager, comandos IPC Tauri e exceções unhandled da interface React são capturados e gravados na tabela `error_logs` do SQLite (`rusqlite` em modo WAL).
2. **Sanitização de Dados Privados**: Nenhuma credencial, chave de API, token de autorização ou caminho de perfil confidencial (`C:\Users\[USER]\...`) é persistido em texto claro. Todas as strings passam pelo pipeline de sanitização regex antes de atingir o banco de dados.
3. **Privacidade e Modo Offline**: Nenhum erro é enviado para servidores externos. O histórico permanece 100% sob controle do usuário no computador local.
4. **Resolução e Auditoria**: Cada erro possui um ciclo de vida (`unresolved` → `resolved`), permitindo ao usuário marcar falhas já tratadas e filtrar incidentes pendentes.

---

## 2. Esquema do Banco de Dados SQLite

```sql
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    severity TEXT NOT NULL,        -- 'critical', 'error', 'warning', 'info'
    source TEXT NOT NULL,          -- 'task_manager', 'tauri_command', 'frontend_ui'
    module TEXT NOT NULL,          -- 'documents', 'downloads', 'audio', 'video', 'images', 'posters', 'ui'
    operation TEXT NOT NULL,       -- nome da função ou operação (ex: 'convert_word_to_pdf')
    task_id TEXT,                  -- UUID da tarefa relacionada (se aplicável)
    error_code TEXT NOT NULL,      -- Código estruturado (ex: 'DOC_LIBREOFFICE_NOT_FOUND')
    user_message TEXT NOT NULL,    -- Mensagem clara e compreensível para o usuário final
    technical_details TEXT,        -- Causa raiz e mensagens de stderr / I/O
    sanitized_stack TEXT,          -- Stack trace tratado e truncado a 8192 caracteres
    status TEXT NOT NULL,          -- 'unresolved', 'resolved', 'ignored'
    app_version TEXT NOT NULL,     -- Versão do executável (ex: '0.1.0')
    resolved_at TEXT               -- Timestamp ISO 8601 da resolução
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_module ON error_logs(module);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_task_id ON error_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
```

---

## 3. Pipeline de Sanitização (`sanitizer.rs`)

O módulo `src-tauri/src/utils/sanitizer.rs` aplica expressões regulares compiladas via `lazy_static`/`Regex`:
- **Chaves e Tokens de Autenticação**: `token`, `bearer`, `api[_-]?key`, `auth`, `password`, `secret` → substituídos por `[REDACTED]`.
- **Credenciais em URLs**: `https://user:password@host` → `https://[REDACTED]@host`.
- **Caminhos de Usuário Windows**: `C:\Users\nomedousuario\...` → `C:\Users\[USER]\...`.
- **Caminhos Unix**: `/home/nomedousuario/...` → `/home/[USER]/...`.
- **Limite de Bytes**: Truncamento seguro em 8.192 caracteres com sufixo `\n... [TRUNCADO]` para impedir saturação da memória.

---

## 4. Integração na Interface do Usuário

### 4.1 Aba "Erros e Diagnósticos" na Tela Histórico
- **Cards de Métricas**: Total de Registros, Falhas Críticas, Não Resolvidos, Uso do Banco Local em KB.
- **Filtros Parametrizados**:
  - Busca textual (em código, mensagem, detalhes técnicos e ID da tarefa).
  - Filtro por período (Todo histórico, últimas 24h, 7 dias, 30 dias).
  - Filtro por módulo (Documentos, Downloads, Áudio, Vídeo, Imagens, Pôsteres, Sistema).
  - Filtro por severidade e status.
- **Card Expansível de Erro**:
  - Selo visual de severidade (Vermelho para Crítico, Rosa para Erro, Âmbar para Aviso, Verde para Info).
  - Código estruturado (`DOC_NOT_FOUND`, `DOWNLOAD_SSRF_BLOCKED`).
  - Botão individual "Copiar erro" com formatação completa.
  - Botão de alternância "Marcar como resolvido / Reabrir".
  - Bloco colapsável com detalhes técnicos e stack trace monospaçado.

### 4.2 Atalho Direto na Gaveta de Tarefas (`TaskDrawer`)
- Quando uma tarefa falha (`status: 'failed'`), o card da tarefa exibe:
  - Botão **"Copiar erro"**: Copia a mensagem de erro para a área de transferência.
  - Botão **"Ver detalhes do erro"**: Fecha a gaveta e navega o usuário diretamente para a Central de Diagnósticos com o erro correspondente expandido e destacado em verde menta.

### 4.3 Seção de Diagnósticos nas Configurações
- Informa tamanho em disco do banco SQLite.
- Permite definir a **política de retenção** (limpeza de logs com mais de 7, 30 ou 90 dias).
- Exportação preventiva em lote para arquivo JSON.

### 4.4 Cópia Nativa para a Área de Transferência
- Utiliza a crate `arboard` para interagir diretamente com a API Win32 do Windows (`OpenClipboard`, `SetClipboardData`).
- Elimina restrições e permissões de segurança de WebView2 e iframes.
- Possui fallback transparente para a API `navigator.clipboard`.
