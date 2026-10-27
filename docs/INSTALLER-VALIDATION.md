# Validação do Instalador Windows (NSIS) — Arce Tools

Este documento relata a validação técnica do pacote executável gerado para instalação e distribuição no Windows 11 x64.

---

## 1. Identificação do Pacote Gerado

| Propriedade | Valor Medido |
|---|---|
| **Nome do Arquivo** | `Arce Tools_0.1.0_x64-setup.exe` |
| **Localização de Build** | `src-tauri/target/release/bundle/nsis/Arce Tools_0.1.0_x64-setup.exe` |
| **Tamanho do Arquivo** | **4.161.673 bytes** (3,97 MB) |
| **Tecnologia de Empacotamento** | Nullsoft Scriptable Install System (NSIS 3.13) via Tauri 2 Bundler |
| **Arquitetura-Alvo** | Windows x64 (MSVC ABI) |
| **Versão do Produto** | 0.1.0 |
| **Identificador Tauri** | `com.mateusarcedev.arce-tools` |
| **Assinatura / Hash SHA-256** | `B405A51DAFBC56844F35C803977BD4E1FE4BD8D7C235DBFE7808E5F973DCC122` |

---

## 2. Estrutura e Comportamento da Instalação

### 2.1. Diretório de Instalação Padrão
O instalador é configurado como **instalação por usuário** (sem necessidade de privilégios de administrador UAC para instalar):
- Caminho: `%LOCALAPPDATA%\Programs\Arce Tools\`
- Executável Principal: `arce-tools.exe` (12.318.720 bytes)
- Recursos embutidos: Assets web compilados (`dist/`), ícones (`.ico`), fontes Geist e Geist Mono.

### 2.2. Atalhos e Registro no Sistema
- **Menu Iniciar:** Cria atalho em `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Arce Tools.lnk`.
- **Desinstalador Oficial:** Cria `Uninstall Arce Tools.exe` e registra entrada nativa no painel **Aplicativos Instalados** do Windows 11.
- **Desinstalação Limpa:** Remove completamente os binários e atalhos sem deixar chaves espúrias no registro do sistema.

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
