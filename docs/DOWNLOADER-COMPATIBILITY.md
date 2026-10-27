# Arce Tools — Downloader Multiplataforma (Compatibilidade & Segurança)

## 1. Visão Geral

O módulo de **Downloads** do Arce Tools oferece um ecossistema seguro e de alto desempenho para download de vídeos e músicas de fontes autorizadas, integrando o motor nativo **yt-dlp** ao gerenciador assíncrono de tarefas (**TaskManager**) com persistência em SQLite.

---

## 2. Plataformas Suportadas & Reconhecimento Automático

O motor inspeciona a URL fornecida e detecta automaticamente a rede correspondente:

| Plataforma | Padrões de URL Reconhecidos | Modos Suportados |
| :--- | :--- | :--- |
| **YouTube** | `youtube.com/watch`, `youtu.be` | Vídeo, Somente Áudio, Playlists |
| **YouTube Shorts** | `youtube.com/shorts` | Vídeo vertical, Áudio |
| **Instagram** | `instagram.com/p/` | Vídeo, Áudio |
| **Instagram Reels**| `instagram.com/reel/`, `instagram.com/reels/` | Vídeo, Áudio |
| **TikTok** | `tiktok.com/@...`, `vm.tiktok.com` | Vídeo, Áudio |
| **Facebook** | `facebook.com/...`, `fb.watch/...` | Vídeo, Áudio |
| **X / Twitter** | `x.com/...`, `twitter.com/...` | Vídeo, Áudio |
| **Reddit** | `reddit.com/r/...`, `v.redd.it/...` | Vídeo + Áudio mesclados |
| **Pinterest** | `pinterest.com/pin/...`, `pin.it/...` | Vídeo, Pins animados |
| **Vimeo** | `vimeo.com/...` | Alta definição, Áudio |
| **Twitch** | `twitch.tv/videos/...`, `clips.twitch.tv` | Clipes e VODs |
| **SoundCloud** | `soundcloud.com/...` | Somente Áudio (música e podcasts) |
| **Dailymotion** | `dailymotion.com/video/...`, `dai.ly/...` | Vídeo, Áudio |
| **Plataformas Genéricas**| Qualquer URL HTTP/HTTPS pública compatível com yt-dlp | Vídeo, Áudio |

---

## 3. Gestão de Playlists & Downloads em Lote

### Detecção Inteligente de Playlists
- Ao consultar metadados de uma URL contendo parâmetros de playlist (ex: `list=...` no YouTube ou sets no SoundCloud), o backend executa `yt-dlp --dump-single-json --flat-playlist`.
- Essa chamada extrai em milissegundos os títulos, durações e identificadores de cada item sem iniciar o download dos vídeos.
- Na interface, é renderizada uma caixa de seleção permitindo:
  - Botão "Selecionar todos" / "Desmarcar todos".
  - Seleção individual por caixa de checagem.
  - Indicador do total de vídeos/faixas e duração de cada uma.
  - Enfileiramento de cada item selecionado como uma tarefa independente no `TaskManager`.

### Modo de Download em Lote (Multi-URL)
- Chave seletora na interface para "Download em lote".
- Caixa de texto multilinha onde o usuário pode colar dezenas de URLs de fontes distintas (uma por linha).
- O sistema valida todas as linhas em tempo real, descarta linhas vazias ou inválidas, e cria tarefas concorrentes na fila do SQLite ao clicar em "Baixar lote".

---

## 4. Formatos de Saída & Extração de Áudio

### Vídeo
- **Qualidades:** `Melhor disponível`, `1080p`, `720p`, `480p`.
- **Contêineres:** `MP4` ou `MKV`.
- **Fusão de Trilhas:** Utiliza FFmpeg para unir os fluxos de melhor vídeo e melhor áudio em um único contêiner sem perda de qualidade.

### Áudio
- **Formatos:** `MP3`, `M4A`, `WAV`, `FLAC`, `OPUS`.
- **Processamento:** Extração direta da melhor faixa sonora com recodificação de alta qualidade pelo FFmpeg via parâmetros `--extract-audio --audio-format <formato> --audio-quality 0`.

---

## 5. Defesa Estrita contra SSRF (Server-Side Request Forgery)

Para garantir que o Arce Tools não possa ser explorado para escanear portas locais, consultar microserviços internos da máquina do usuário ou acessar provedores de nuvem (ex: instâncias WSL/Docker ou metadados AWS/Azure), é aplicada uma verificação dupla (frontend e backend):

### Regras de Bloqueio Estrito:
1. **Esquema:** Apenas `http://` e `https://` são permitidos. Esquemas como `file://`, `ftp://`, `gopher://`, `data:` são rejeitados.
2. **Hostnames Locais:** Bloqueio de `localhost` e variantes.
3. **Loopbacks IPv4 e IPv6:** Bloqueio de `127.0.0.1`, `0.0.0.0`, `::1`.
4. **Redes Privadas RFC 1918:**
   - `10.0.0.0/8`
   - `172.16.0.0/12` (`172.16.0.0` até `172.31.255.255`)
   - `192.168.0.0/16`
5. **Endereços Link-Local e Metadados Cloud RFC 3927:**
   - `169.254.0.0/16` (bloqueando inclusive `169.254.169.254`).

A validação é testada tanto unitariamente no Rust (`test_download_url_validation_and_ssrf`) quanto na suíte Vitest do React.

---

## 6. Auditoria de Versão & Atualização do yt-dlp

- O comando `get_ytdlp_status` retorna o caminho físico do binário, sua disponibilidade e a versão fixada.
- O card de status na tela exibe um indicador verde de prontidão com a versão em tempo de execução.
- **Diretrizes de Conformidade:** O Arce Tools é estritamente offline-first e opera em conformidade com as leis de direitos autorais e termos de serviço, não incluindo mecanismos para quebra de criptografia ou DRM.
