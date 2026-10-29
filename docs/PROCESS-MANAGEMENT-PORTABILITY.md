# Portabilidade da Supervisão de Processos — ToolsOnDesk (Missão 08)

O ToolsOnDesk executa binários pesados de terceiros (FFmpeg, ffprobe, yt-dlp, LibreOffice) para operações multimídia e de documentos. Este documento detalha como a inicialização, o isolamento e o cancelamento de subprocessos operam em cada sistema operacional.

---

## 1. Desafios de Processos em Ambientes Desktop

1. **Janelas de Console no Windows**: Sem flags apropriadas, o Windows cria janelas de console pretas piscantes (`cmd.exe`) a cada execução do FFmpeg ou ffprobe.
2. **Processos Órfãos no Cancelamento**: Quando o usuário clica em "Cancelar Tarefa", o processo principal em Rust pode matar seu descritor imediato, mas processos netos (ex: instâncias de encoder FFmpeg ou downloaders yt-dlp) continuam rodando em segundo plano.
3. **Processos Zumbis (*Defunct*) no Unix**: No Linux/macOS, processos finalizados cujos status de saída não são recolhidos via `waitpid` ocupam slots na tabela de processos do kernel.

---

## 2. Invocação Headless e Isolamento de Grupos

A configuração inicial é unificada em `ProcessManager::configure_command`:

```rust
pub fn configure_command(cmd: &mut tokio::process::Command) {
    #[cfg(target_os = "windows")]
    {
        // 0x08000000 = CREATE_NO_WINDOW
        cmd.creation_flags(0x08000000);
    }

    #[cfg(unix)]
    {
        // Cria um novo grupo de processos independente (PGID)
        cmd.process_group(0);
    }
}
```

O `process_group(0)` garante que todos os subprocessos criados pelo comando compartilhem o mesmo PGID, permitindo sinalização em lote.

---

## 3. Protocolo de Término Seguro e Árvore de Processos

### Windows: Árvore Forçada
No Windows, o encerramento invoca o utilitário do sistema `taskkill`:
```rust
let mut kill_cmd = std::process::Command::new("taskkill");
kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
kill_cmd.creation_flags(0x08000000);
let _ = kill_cmd.output();
let _ = child.kill().await;
```
- `/F`: Força o encerramento.
- `/T`: Encerra o processo especificado e todos os processos filhos gerados por ele (árvore de processos).

### Unix (Linux & macOS): Encerramento Gracioso e Ceifa (*Reaping*)
No Linux e macOS, a terminação segue um ciclo de 4 etapas:
1. **SIGTERM Gracioso**:
   ```rust
   unsafe { libc::kill(-pgid, libc::SIGTERM); }
   ```
   O sinal negativo `-pgid` atinge todos os membros do grupo de processos, permitindo que encerrem a escrita de buffers de arquivos com segurança.
2. **Polling de 300 ms**: O sistema verifica em intervalos de 50 ms se o processo respondeu ao SIGTERM.
3. **SIGKILL Forçado**: Caso o processo continue ativo após 300 ms, emite `libc::kill(-pgid, libc::SIGKILL)`.
4. **Ceifa com `child.wait().await`**: Garante que o processo seja removido da tabela de processos do kernel, prevenindo vazamento de descritores e processos zumbis.
