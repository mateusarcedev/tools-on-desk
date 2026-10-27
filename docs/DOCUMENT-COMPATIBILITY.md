# Matriz de Compatibilidade de Documentos — Arce Tools

Este documento define os formatos suportados, limitações técnicas e procedimentos de instalação para o motor de documentos do **Arce Tools**.

---

## 1. Matriz de Formatos e Ferramentas

| Ferramenta | Formato de Entrada | Formato de Saída | Motor Nativo | Requisito Externo | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PDF → Word** | `.pdf` (v1.0 a 2.0) | `.docx` (Word 2016+) | `lopdf` + `docx-rs` | Nenhum (100% nativo) | **Totalmente Funcional** |
| **Word → PDF** | `.docx`, `.doc`, `.odt`, `.rtf`, `.txt` | `.pdf` (v1.5) | LibreOffice Headless | LibreOffice (`soffice.exe`) | **Totalmente Funcional** |
| **Unir PDFs** | Múltiplos `.pdf` | `.pdf` consolidado | `lopdf` (tree renumbering) | Nenhum (100% nativo) | **Totalmente Funcional** |
| **Dividir PDF** | `.pdf` | Múltiplos `.pdf` ou consolidado | `lopdf` | Nenhum (100% nativo) | **Totalmente Funcional** |
| **Organizar Páginas** | `.pdf` | Novo `.pdf` organizado | `lopdf` | Nenhum (100% nativo) | **Totalmente Funcional** |
| **Comprimir PDF** | `.pdf` | `.pdf` otimizado | `lopdf` + Deflate | Nenhum (100% nativo) | **Totalmente Funcional** |
| **Imagens → PDF** | `.jpg`, `.png`, `.webp` | `.pdf` multipágina | `image` + `ImageEngine` | Nenhum (100% nativo) | **Totalmente Funcional** |

---

## 2. Cenários Especiais e Casos de Borda

### 2.1 Documentos Digitalizados / Imagens Escaneadas (Sem Texto Selecionável)
- **Comportamento**: Ao inspecionar o PDF, o sistema detecta ausência de texto vetorial (`has_selectable_text: false`).
- **Aviso na UI**: Um selo visual âmbar alerta: `"Digitalização / Sem texto selecionável"`.
- **Tratamento**: A conversão para DOCX alerta o usuário amigavelmente de que documentos 100% rasterizados requerem uma etapa prévia de OCR (reconhecimento óptico de caracteres).

### 2.2 PDFs Criptografados com Senha
- **Comportamento**: O inspector detecta o bit de criptografia no cabeçalho do PDF (`is_encrypted: true`).
- **Segurança**: O botão de processamento é travado com badge vermelho `"Criptografado com senha"`. O usuário é orientado a remover a senha de proteção antes de efetuar fusão, corte ou conversão.

### 2.3 Preservação do Arquivo Original
- O Arce Tools **nunca substitui nem sobrescreve o arquivo PDF ou Word original** em operações de reorganização, divisão ou compressão.
- Novos arquivos recebem sufixos descritivos (ex: `_organizado.pdf`, `_comprimido.pdf`, `_pag_001.pdf`) e são gravados na pasta de exportação oficial do usuário.

---

## 3. Instalação e Habilitação do LibreOffice

Para a conversão de Word (`.docx`, `.doc`, `.odt`) para PDF com fidelidade visual completa (fontes, estilos, tabelas e cabeçalhos complexos), o Arce Tools utiliza o LibreOffice em modo headless isolado.

### 3.1 Instalação Automática no Windows 11 via Terminal
Abra o PowerShell ou Terminal do Windows e execute:
```powershell
winget install TheDocumentFoundation.LibreOffice
```

### 3.2 Descoberta Automática de Caminhos
O Arce Tools detecta automaticamente o executável `soffice.exe` nos seguintes locais:
1. `C:\Program Files\LibreOffice\program\soffice.exe`
2. `C:\Program Files (x86)\LibreOffice\program\soffice.exe`
3. Chaves de Registro do Windows (`HKLM\Software\LibreOffice` e `HKCU`)
4. Variável de ambiente `PATH` do sistema

A tela de **Configurações** e a aba **Word → PDF** exibem em tempo real o status de detecção do motor.
