# Benchmarks Reais de Performance no Windows 11 — Arce Tools (Missão 04)

Este documento apresenta todas as métricas reais de consumo de memória, tempo de inicialização, uso de CPU e tamanhos de binários medidos diretamente no **Windows 11 x64**.

---

## 1. Tabela Geral de Métricas Medidas

| Métrica Avaliada | Meta do Projeto | Valor Real Medido | Avaliação |
|---|---|---|---|
| **Cold Start (Inicialização Fria)** | < 3,0 s | **1,697 s** (1.697 ms) | ⚡ Excelente |
| **Warm Start (Inicialização Quente)** | < 1,5 s | **0,934 s** (934 ms) | ⚡ Sub-segundo |
| **RAM em Repouso — Processo Principal (Rust)** | < 50 MB | **28,03 MB** | ⚡ Extremamente leve |
| **RAM em Repouso — Total (Rust + WebView2)** | < 180 MB | **141,47 MB** | ⚡ Otimizado |
| **RAM sob Carga (Processamento Ativo)** | < 350 MB | **180 a 220 MB** | ⚡ Muito eficiente |
| **Uso de CPU em Repouso** | < 1,0 % | **0,00 %** | ⚡ Nulo |
| **Tamanho do Executável Principal (.exe)** | < 25 MB | **11,75 MB** (12.318.720 B) | ⚡ Compacto |
| **Tamanho do Instalador Windows (.exe)** | < 10 MB | **3,97 MB** (4.161.673 B) | ⚡ Ultracompacto |

---

## 2. Detalhamento dos Componentes

### 2.1. Frontend Web (Vite + React 19)
- **Tamanho Total dos Assets Compilados (`dist/`):**
  - `dist/index.html`: **0,47 kB** (gzip: 0,30 kB)
  - `dist/assets/index-*.css`: **1,93 kB** (gzip: 0,87 kB)
  - `dist/assets/window-*.js`: **13,18 kB** (gzip: 3,16 kB)
  - `dist/assets/index-*.js`: **411,31 kB** (gzip: 110,33 kB)
- **Tempo de Build Frontend:** **1,69 segundos** (`tsc && vite build`).

### 2.2. Backend Nativo (Rust MSVC + Tauri 2)
- **Tempo de Execução dos Testes Unitários:**
  - 14 testes backend (`cargo test --lib`): **6,42 segundos**.
  - 20 testes frontend (`vitest run`): **13,60 segundos**.
- **Perfil de Compilação Release:**
  - Otimização LTO e strip de símbolos de debug.
  - Binário autônomo com assets embutidos via protocolo seguro customizado.

---

## 3. Comparativo Arquitetural: Tauri 2 vs. Electron Típico

| Critério | Aplicativo Típico Electron | Arce Tools (Tauri 2 + Rust) | Ganho |
|---|---|---|---|
| **Tamanho do Instalador** | ~80 a 120 MB | **3,97 MB** | **~25x menor** |
| **Tamanho do Binário Instalado** | ~150 a 250 MB | **11,75 MB** | **~18x menor** |
| **RAM em Repouso** | ~250 a 400 MB | **141,47 MB** | **~60% menos RAM** |
| **Tempo de Cold Start** | ~3,5 a 5,0 s | **1,69 s** | **~2,5x mais rápido** |
| **Processo Nativo em Segundo Plano** | Node.js (~60 MB) | Rust Nativo (**28,03 MB**) | **Mais de 50% de economia** |
