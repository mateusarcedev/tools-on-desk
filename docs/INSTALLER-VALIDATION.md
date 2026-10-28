# Validação do Instalador Windows (NSIS) — ToolsOnDesk (ex-Arce Tools)

Este documento relata a validação técnica dos pacotes executáveis gerados para instalação e distribuição no Windows 11 x64, abrangendo a evolução da Missão 04 até a **Missão 07 (ToolsOnDesk)**.

> [!NOTE]
> **Evolução de Pacote:** O instalador inicial foi validado na Missão 04 sob o nome `Arce Tools_0.1.0_x64-setup.exe`. Na **Missão 07**, o empacotamento foi migrado para a identidade corporativa `ToolsOnDesk_0.1.0_x64-setup.exe` com identificador `com.toolsondesk.desktop`, garantindo coexistência pacífica e migração de dados automatizada no primeiro boot.

---

## 1. Comparativo de Identificação dos Pacotes

| Propriedade | Versão Legada (M04–M06) | Versão Atual ToolsOnDesk (M07) |
|---|---|---|
| **Nome do Instalador** | `Arce Tools_0.1.0_x64-setup.exe` | `ToolsOnDesk_0.1.0_x64-setup.exe` |
| **Tamanho do Instalador** | 4.911.065 bytes (4,68 MB) | **5.061.863 bytes (4,83 MiB)** |
| **Hash SHA-256 do Instalador** | `609597D7793DC486825523D3C0EF79D8719298312AED731331749E4838F20496` | `A0CE89249AA8BE4DCFC79E602B5513AA060F53BE991279B04B2044D4D90894CE` |
| **Executável Principal** | `arce-tools.exe` (14.142.976 bytes) | `toolsondesk.exe` (**14.662.144 bytes**) |
| **Hash SHA-256 do Executável** | - | `CCE9A3CE1E80EEC8ABCF604BC8A6E573FE40D6EA91B8A44D2E1368FF465CEC68` |
| **Identificador Tauri** | `com.mateusarcedev.arce-tools` | `com.toolsondesk.desktop` |
| **Diretório de Instalação** | `%LOCALAPPDATA%\Programs\Arce Tools\` | `%LOCALAPPDATA%\Programs\ToolsOnDesk\` |
| **Diretório de Dados AppData** | `%LOCALAPPDATA%\ArceTools\` | `%LOCALAPPDATA%\ToolsOnDesk\` |
| **Atalho Menu Iniciar** | `Arce Tools.lnk` | `ToolsOnDesk.lnk` |
| **Modo de Instalação NSIS** | `currentUser` (sem UAC) | `currentUser` (sem UAC) |
| **Chave de Desinstalação** | `HKCU\...\Uninstall\Arce Tools` | `HKCU\...\Uninstall\ToolsOnDesk` |

---

## 2. Estrutura e Comportamento da Instalação ToolsOnDesk

### 2.1. Diretório de Instalação Padrão
O instalador é configurado como **instalação por usuário** (sem necessidade de privilégios de administrador UAC para instalar):
- Caminho: `%LOCALAPPDATA%\Programs\ToolsOnDesk\`
- Executável Principal: `toolsondesk.exe`
- Recursos embutidos: Assets web compilados (`dist/`), novos ícones `t/d`, fontes Geist e Geist Mono.

### 2.2. Atalhos e Registro no Sistema
- **Menu Iniciar:** Cria atalho em `%APPDATA%\Microsoft\Windows\Start Menu\Programs\ToolsOnDesk.lnk`.
- **Desinstalador Oficial:** Cria `Uninstall ToolsOnDesk.exe` e registra entrada nativa no painel **Aplicativos Instalados** do Windows 11.
- **Desinstalação Limpa e Segura:** Remove os binários e atalhos de ToolsOnDesk. O desinstalador da versão antiga do Arce Tools pode ser executado a qualquer momento sem afetar a instalação ou os dados do ToolsOnDesk.

---

## 3. Estratégia de Ferramentas Externas e Licenciamento

### 3.1. Por que não incluir 480 MB de binários no instalador base?
Os executáveis completos do FFmpeg (`ffmpeg.exe` + `ffprobe.exe`) da distribuição Gyan somam **454 MB**, e o `yt-dlp.exe` soma **23,5 MB**. Se fossem incluídos de forma estática dentro do instalador, o download aumentaria de **3,97 MB** para mais de **150 MB** comprimido.

### 3.2. Estratégia Híbrida de Resolução:
1. **Detecção Automática do Sistema:**
   - O Arce Tools verifica automaticamente se o usuário possui FFmpeg e yt-dlp instalados via WinGet, PATH ou na pasta do programa.
2. **Pasta de Binários Portátil:**
   - O usuário ou administrador pode simplesmente colocar `ffmpeg.exe`, `ffprobe.exe` e `yt-dlp.exe` dentro da pasta `binaries/` junto ao executável ou em `%LOCALAPPDATA%\ArceTools\binaries\`. O motor do Arce Tools os detectará instantaneamente.
3. **Instalação Assistida:**
   - Na tela de Configurações, a interface indica com precisão o status de cada ferramenta e disponibiliza instruções de instalação assistida em um clique (`winget install Gyan.FFmpeg yt-dlp`).

### 3.3. Conformidade e Licenciamento
- **FFmpeg:** Licenciado sob **GPL v3 / LGPL v2.1**. A invocação do FFmpeg pelo Arce Tools ocorre como processo externo isolado (`Command::new`), sem vinculação estática ou dinâmica de código, preservando a total conformidade com a licença LGPL/GPL.
- **yt-dlp:** Licenciado sob a **The Unlicense** (domínio público), permitindo redistribuição e invocação irrestrita.
- **LibreOffice:** Licenciado sob **MPL v2.0**, invocado exclusivamente em modo headless (`soffice --headless`) para conversão de documentos.
