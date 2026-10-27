# ARCE TOOLS — Planejamento para a Missão 03

Este documento orienta os objetivos, contratos e requisitos técnicos para a **Missão 03** e subsequentes do **Arce Tools**.

---

## 1. Módulos Planejados para a Missão 03

### 1.1 Módulo Documentos (Word $\leftrightarrow$ PDF)
- **Word para PDF (.docx $\to$ .pdf)**:
  - Invocar **LibreOffice headless** (`soffice --headless --convert-to pdf`) com detecção automática em:
    - `C:\Program Files\LibreOffice\program\soffice.exe`
    - Chaves do Registro do Windows `HKLM\Software\LibreOffice`.
  - Preservar fontes, tabelas, cabeçalhos, rodapés e paginação idênticos ao documento original.
- **PDF para Word (.pdf $\to$ .docx)**:
  - Extração e reconstrução de layouts através de motor nativo de parsing vetorial de PDFs e geração de XML OOXML (`.docx`).
  - Suporte opcional a **OCR (Reconhecimento Óptico de Caracteres)** via **Tesseract OCR** para PDFs digitalizados (scans ou imagens incorporadas).

### 1.2 Poster Studio — Modo Retícula / Pontilhismo (Halftone & Dithering)
- Implementação de algoritmos de difusão de erro:
  - **Floyd-Steinberg**
  - **Atkinson**
  - **Halftone / Meio-tom com grade angular personalizável (pontos de impressão estilo jornal/arte pop)**.
- Modo de visualização de simulação 3D de pôster impresso em parede.

### 1.3 Pacote Instalador Windows NSIS
- Criação de pacote de distribuição `.exe` ou `.msi` via Tauri CLI:
  - Gerar instalador com suporte a atalhos na Área de Trabalho e Menu Iniciar.
  - Empacotador com opção de incluir ou excluir binários multimídia sidecar.
  - Teste do ciclo de vida: Instalação limpa, inicialização e desinstalação sem resíduos órfãos.

---

## 2. Requisitos de Desempenho e Metas Mantidas

| Métrica | Missão 01 | Missão 02 (Alcançado) | Meta Missão 03 |
|---|:---:|:---:|:---:|
| **Tempo de Inicialização (Cold start)** | < 1,0s | ~1,0s | < 1,2s |
| **Memória em Repouso (RAM)** | ~36 MB | ~36 MB | < 45 MB |
| **Uso de CPU em Repouso** | 0,0% | 0,0% | 0,0% |
| **Tamanho do Binário Principal** | 7,07 MB | ~7,2 MB | < 8,0 MB |
| **Taxa de Quadros da Interface** | 60 fps constantes | 60 fps constantes | 60 fps constantes |
