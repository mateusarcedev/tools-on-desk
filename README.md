# Arce Tools

**Arce Tools** é um aplicativo desktop multiferramentas, gratuito, offline-first, de alta performance e visualmente premium, construído com **Tauri 2**, **Rust**, **React 19** e **TypeScript**.

O design foi rigorosamente reproduzido a partir do protótipo oficial do **Claude Design**, mantendo fidelidade estrita às famílias tipográficas **Geist** e **Geist Mono**, tema escuro nativo com destaque em **verde-menta** (`#15F5BA`), tema claro correspondente, atalhos de teclado ágeis e microinterações fluidas.

---

## 🚀 Funcionalidades Implementadas (Missão 01)

### 1. Shell Desktop & Navegação
- Janela desktop nativa Tauri com identificação Arce Tools, dimensões mínimas (1024x720) e controles de janela.
- 9 telas integradas:
  - **Início**: Acesso rápido às ferramentas, arrastar e soltar global, lista de tarefas ativas e histórico recente.
  - **Pôsteres (Poster Studio)**: Ferramenta completa e offline para fatiamento de imagens em pôsteres multipágina para impressão.
  - **Imagens**: Conversão de formato (PNG/JPEG), redimensionamento Lanczos3, ajuste de qualidade e compilação de imagens em PDF.
  - **Histórico**: Registro persistido em SQLite de todas as operações realizadas, com botões para abrir arquivos ou pastas no Windows Explorer.
  - **Configurações**: Gerenciamento de tema (Escuro, Claro, Sistema), limite de concorrência de tarefas simultâneas e visualização de dependências.
  - **Downloads**, **Documentos**, **Áudio**, **Vídeo**: Telas estruturadas com seus respectivos contratos de integração prontos para a Missão 02.
- Menu lateral recolhível (toggle via botão ou `Ctrl+B`).
- Paleta de comandos universal acionada por `Ctrl+K`.
- Gaveta lateral de tarefas ativas acionada por `Ctrl+J`.
- Atalhos rápidos de navegação `Ctrl+1` até `Ctrl+9`.
- Notificações Toast nativas para status e erros.

### 2. Motor Global de Tarefas (Rust + SQLite)
- Fila assíncrona baseada no runtime Tokio (`tokio::sync::mpsc`).
- Limite configurável de tarefas simultâneas controlado por semáforo assíncrono.
- Cancelamento verdadeiro e cooperativo de tarefas via `CancellationToken`.
- Persistência contínua em SQLite em modo WAL (`journal_mode=WAL`).
- Transmissão de progresso em tempo real (0 a 100%) e status via barramento de eventos do Tauri.
- Tratamento automático de interrupções: tarefas que estavam em execução em caso de encerramento do processo são recuperadas com status seguro no próximo início.
- Prevenção automática de sobrescrita de arquivos existentes no disco.

### 3. Poster Studio (Primeira Ferramenta Real)
- Entrada de imagens via diálogo nativo ou drag-and-drop (PNG e JPEG).
- Validação de dimensões e resolução da imagem de entrada.
- Formatos de papel físicos suportados: **A4** ($210 \times 297\text{ mm}$), **A3** ($297 \times 420\text{ mm}$) e personalizável.
- Modos de orientação: Retrato e Paisagem.
- Controle de número de colunas, cálculo automático de linhas e altura total em centímetros.
- Margens configuráveis em milímetros (padrão 10mm).
- Sobreposição entre folhas (overlap) configurável (padrão 5mm) para alinhamento e colagem perfeita.
- **Cálculo dinâmico de DPI efetivo de impressão**:
  - Alerta visual destacado quando a resolução for inferior a 150 DPI.
- Grade interativa de pré-visualização das folhas com dimensões finais.
- Modos de cor: **Original** e **Preto e Branco**.
- **Gerador de PDF Multipágina Vetorial (PDF 1.4)**:
  - Fatiamento de imagem por viewport em alta resolução.
  - Desenho vetorial de marcas de corte nos 4 cantos da área útil de cada folha.
  - Numeração clara da folha e coordenadas no rodapé (`Folha X de Y (Linha R, Coluna C)`).
  - Geração direta em disco via `CountingWriter` com xref indexado, gerando arquivos leves e 100% imprimíveis.

### 4. Conversão e Otimização de Imagens (Segunda Ferramenta Real)
- Seleção individual ou em lote de imagens.
- Conversão entre formatos PNG e JPEG.
- Redimensionamento por amostragem **Lanczos3** de alta fidelidade visual.
- Preservação opcional da proporção original (aspect ratio).
- Ajuste fino de qualidade JPEG (1 a 100).
- Compilação de múltiplas imagens em um único arquivo PDF.
- Destino de salvamento customizável com resolução automática de nomes repetidos.

---

## 🛠️ Stack Tecnológica

- **Desktop Framework**: [Tauri 2](https://v2.tauri.app/)
- **Backend**: Rust 2021 (MSVC toolchain no Windows)
- **Frontend**: React 19 + TypeScript (strict mode) + Vite
- **Gerenciador de Pacotes**: pnpm
- **Banco de Dados**: SQLite embutido via `rusqlite` (bundled)
- **Testes**:
  - Frontend: [Vitest](https://vitest.dev/) + React Testing Library
  - Backend: Testes nativos Rust via `cargo test`

---

## 💻 Requisitos e Instalação (Windows 11)

### Pré-requisitos
- **Windows 11 x64**
- **Node.js** (v20+ recomendado) e **pnpm**
- **Rust stable** com a toolchain MSVC (`x86_64-pc-windows-msvc`):
  ```powershell
  winget install Rustlang.Rustup
  rustup default stable-x86_64-pc-windows-msvc
  ```
- **Microsoft C++ Build Tools** (Visual Studio 2022 com a carga de trabalho de C++ para Desktop)
- **Windows 11 SDK**
- **Microsoft Edge WebView2 Runtime** (já incluído nativamente no Windows 11)

### Instalação de Dependências
```bash
# Na raiz do projeto
pnpm install
```

### Executando em Modo Desenvolvimento
```bash
# Inicia o Vite e a janela nativa Tauri
pnpm tauri dev
```

### Executando os Testes Automatizados

```bash
# 1. Testes do Frontend (Vitest)
pnpm test

# 2. Testes do Backend (Rust MSVC no Windows)
cargo test --manifest-path src-tauri/Cargo.toml
```

### Gerando o Build de Produção

```powershell
# Build do Frontend
pnpm build

# Build do Executável Nativo Windows
cargo build --release --manifest-path src-tauri/Cargo.toml
```
O executável otimizado será gerado na pasta de saída `target/release/arce-tools.exe`.

---

## 📂 Estrutura do Projeto

```
arce-tools/
├── docs/                      # Documentação técnica e decisões de arquitetura
│   ├── ARCHITECTURE.md        # Arquitetura do sistema, IPC e fluxo de dados
│   ├── IMPLEMENTATION-STATUS.md # Checklist de conformidade das Fases A, B, C, D
│   ├── DECISIONS.md           # Registros de Decisão de Arquitetura (ADRs)
│   └── NEXT-STEPS.md          # Planejamento detalhado para a Missão 02
├── public/
│   └── fonts/                 # Famílias tipográficas Geist e Geist Mono (offline)
├── src/                       # Frontend React 19 + TypeScript
│   ├── components/
│   │   ├── common/            # Ícones SVG oficiais, botões, switches, dropzones
│   │   ├── screens/           # Telas do aplicativo (Home, Poster, Images, etc.)
│   │   └── shell/             # TitleBar, Sidebar, CommandPalette, TaskDrawer, etc.
│   ├── services/              # Camada tipada de comunicação IPC com Tauri
│   ├── styles/                # Tokens CSS do Design System (dark & light)
│   ├── tests/                 # Suíte de testes unitários do frontend (Vitest)
│   └── types/                 # Interfaces TypeScript estritas
├── src-tauri/                 # Backend nativo em Rust (Tauri 2)
│   ├── Cargo.toml             # Dependências Rust (tokio, rusqlite, image, tauri)
│   ├── tauri.conf.json        # Configuração da janela e permissões do Tauri
│   └── src/
│       ├── commands/          # Comandos IPC expostos ao frontend
│       ├── domain/            # Modelos de domínio (Task, History, Poster, Image)
│       ├── engines/           # Motores nativos (PosterEngine PDF, ImageEngine)
│       ├── storage/           # Gerenciamento SQLite, migrações e persistência
│       ├── tasks/             # Gerenciador assíncrono de tarefas com semáforo
│       ├── error.rs           # Sistema de erro tipado AppError
│       └── tests.rs           # Testes unitários nativos Rust
├── AGENTS.md                  # Diretrizes e regras para agentes e desenvolvedores
└── README.md                  # Este documento
```

---

## ⚖️ Licença e Conformidade

Este projeto é desenvolvido para fins produtivos e respeita as leis de direitos autorais e termos de uso. O módulo de downloads não contém mecanismos de quebra de proteção anticópia ou DRM.
