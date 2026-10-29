# Porte Nativo Linux — ToolsOnDesk (Missão 08)

O porte nativo do **ToolsOnDesk** para Linux foi desenvolvido visando compatibilidade com as principais distribuições modernas (Ubuntu 22.04 LTS+, Debian 12+, Fedora 38+, Arch Linux), operando com WebKitGTK 4.1 e respeitando rigorosamente as normas XDG.

---

## 1. Requisitos do Sistema e Dependências de Runtime

O ToolsOnDesk utiliza a biblioteca `WebKit2GTK-4.1` (backend padrão do Tauri 2 no Linux).

### Bibliotecas de Runtime Necessárias:
- `libwebkit2gtk-4.1-0` (motor de renderização WebKitGTK)
- `libgtk-3-0` (toolkit GTK3)
- `libayatana-appindicator3-1` (ícone de bandeja do sistema / Tray)
- `librsvg2-2` (renderização vetorial de ícones SVG)
- `libc6` (glibc 2.31+)

> [!NOTE]
> Usuários finais que utilizam pacotes `.deb` recebem as dependências declaradas no cabeçalho do pacote (`Depends: libwebkit2gtk-4.1-0, libgtk-3-0...`), sendo instaladas automaticamente pelo gerenciador de pacotes (`apt`). O formato `.AppImage` inclui as bibliotecas em seu encapsulamento SquashFS montado em tempo de execução.

---

## 2. Conformidade com a Especificação XDG Base Directory

O `PathManager` no Linux adota estritamente os padrões da FreeDesktop.org:

1. **Dados Persistentes (`data_dir`)**:
   - Se `$XDG_DATA_HOME` estiver definido: `$XDG_DATA_HOME/ToolsOnDesk/`
   - Caso contrário: `~/.local/share/ToolsOnDesk/`
   - Armazena: banco de dados SQLite `toolsondesk.db`, binários gerenciados em `binaries/`, e o cofre `.vault_secure.enc`.
2. **Configurações (`config_dir`)**:
   - Se `$XDG_CONFIG_HOME` estiver definido: `$XDG_CONFIG_HOME/ToolsOnDesk/`
   - Caso contrário: `~/.config/ToolsOnDesk/`
3. **Cache Temporário (`cache_dir`)**:
   - Se `$XDG_CACHE_HOME` estiver definido: `$XDG_CACHE_HOME/ToolsOnDesk/`
   - Caso contrário: `~/.cache/ToolsOnDesk/`

---

## 3. Servidores Gráficos: Wayland e X11

O ToolsOnDesk detecta ativamente o protocolo de exibição do sistema via `LinuxPlatform`:

- **Wayland**: Detectado por `WAYLAND_DISPLAY` ou `XDG_SESSION_TYPE=wayland`.
- **X11**: Detectado por `DISPLAY`.

A biblioteca WebKitGTK opera nativamente em Wayland puro com aceleração por hardware EGL ou via XWayland de forma transparente.

---

## 4. Gerenciamento de Processos e Cancelamento Limpo

Para evitar que subprocessos (FFmpeg, yt-dlp) continuem consumindo CPU após cancelamento da tarefa pelo usuário:

1. Todo subprocesso tokio é configurado com `cmd.process_group(0)`. Isso cria um ID de grupo de processos (PGID) idêntico ao PID do processo pai criado.
2. Ao cancelar, o ToolsOnDesk envia `SIGTERM` para o grupo `-pgid` (`libc::kill(-pgid, libc::SIGTERM)`).
3. Aguarda até 300 ms (em 6 verificações com intervalo de 50 ms) para término gracioso.
4. Se o processo não finalizar, emite `SIGKILL` forçado.
5. Invoca `child.wait().await` para recolher o processo filho na tabela do kernel do Linux, evitando a criação de processos zumbis (`defunct`).

---

## 5. Armazenamento Seguro de Credenciais no Linux

O ToolsOnDesk integra com o **FreeDesktop Secret Service API** (GNOME Keyring / KWallet):

- Se o utilitário `secret-tool` estiver instalado, as credenciais são cadastradas sob o serviço `ToolsOnDesk`.
- Caso o daemon DBus ou Secret Service não esteja disponível (ex: ambientes headless ou contêineres mínimos), o aplicativo utiliza o cofre criptografado com entropia local derivada de `/etc/machine-id`, usuário e sal criptográfico único, mantendo o arquivo `.vault_secure.enc` com permissões restritas ao usuário (`chmod 600`).
