# ARCE TOOLS — Relatório de Testes e Validação (Missão 05)

Este documento registra a execução completa dos testes automatizados, compilações e validações do **Arce Tools** para a Missão 05.

---

## 1. Resumo dos Resultados

| Suíte de Testes | Executados | Aprovados | Falhas | Tempo de Execução | Status |
|---|---|---|---|---|---|
| **Frontend Vitest** | 25 | 25 | 0 | 5,41 s | **100% Aprovado** |
| **Backend Rust MSVC** | 19 | 19 | 0 | 5,47 s | **100% Aprovado** |
| **TypeScript Strict** | 49 módulos | 49 módulos | 0 | 695 ms | **100% Aprovado** |
| **Cargo Clippy (-D warnings)** | 1 crate | 1 crate | 0 | 5,26 s | **100% Aprovado** |
| **Build NSIS Windows** | 1 pacote | 1 pacote | 0 | 11 m 33 s | **100% Aprovado** |

---

## 2. Testes de Frontend (`pnpm test`)

Arquivos testados:
1. `src/tests/poster.test.ts` (3 testes): Cálculos milimétricos, DPI e divisão de folhas.
2. `src/tests/navigation.test.ts` (2 testes): Ciclo de navegação e atalhos.
3. `src/tests/documents.test.tsx` (3 testes): Renderização de abas, troca de ferramentas e detecção de LibreOffice.
4. `src/tests/errors.test.tsx` (5 testes): Central de diagnósticos, KPIs, cópia de erros e exportações TXT/JSON.
5. `src/tests/mediaScreens.test.tsx` (3 testes): Telas de Áudio, Vídeo e Downloads com defesa contra SSRF.
6. `src/tests/App.test.tsx` (4 testes): Application shell, titlebar e barra de navegação.
7. `src/tests/setupCenter.test.tsx` (5 testes — Novos na M05):
   - Renderização da etapa de Boas-vindas com todos os 6 módulos.
   - Navegação para a etapa de Verificação do Sistema com leitura de OS e componentes.
   - Navegação pelas etapas de Ferramentas e Conclusão.
   - Ação de dispensar o assistente via "Configurar depois".
   - Renderização da seção "Ferramentas e Dependências" nas Configurações.

---

## 3. Testes Unitários de Backend (`cargo test --lib`)

Testes executados pelo executável de testes nativo MSVC:
1. `tests::tests::test_download_url_validation_and_ssrf`: Validação de URLs e bloqueio de SSRF.
2. `tests::tests::test_clipboard_copy`: Cópia nativa para o Win32 clipboard via `arboard`.
3. `tests::tests::test_sqlite_tasks_and_history`: Persistência ACID em SQLite.
4. `utils::sanitizer::tests::test_sanitizes_private_keys`: Sanitização de blocos PEM de certificados.
5. `utils::sanitizer::tests::test_sanitizes_credentials_and_paths`: Sanitização de credenciais e caminhos confidenciais.
6. `utils::sanitizer::tests::test_sanitizes_cookies_sessions_and_tokens`: Sanitização de cookies, Bearer tokens e cabeçalhos HTTP.
7. `tests::tests::test_error_logs_persistence_and_queries`: Tabela `error_logs`, filtros e deduplicação temporal.
8. `tests::tests::test_document_engine_pdf_operations`: PDF Inspector, split, merge, organize, compress e PDF $\rightarrow$ DOCX.
9. `tests::tests::test_image_engine_conversion`: Conversão Lanczos3 de PNG/JPEG.
10. `tests::tests::test_poster_engine_calculation_and_pdf`: Cálculo físico milimétrico e PDF multipágina.
11. `tests::tests::test_synthetic_video_operations`: Conversão, compressão e corte sintético de vídeo com FFmpeg.
12. `tests::tests::test_synthetic_audio_conversion_and_probe`: Conversão e inspeção ffprobe de áudio.
13. `tests::tests::test_external_tools_discovery`: Resolução de binários e leitura de versões.
14. `tests::tests::test_mandatory_rasterbator_example_4x3_12_sheets`: Caso clássico 4x3 folhas.
15. `tests::tests::test_managed_binaries_directory_and_write_permission` (Novo M05): Diretório `%LOCALAPPDATA%\ArceTools\binaries` e escrita.
16. `tests::tests::test_first_run_status_lifecycle` (Novo M05): Ciclo de vida de preferências (first run $\rightarrow$ completed $\rightarrow$ dismissed).
17. `tests::tests::test_zip_slip_security_prevention` (Novo M05): Criação de zip com path traversal `../../evil.exe` e bloqueio imediato com `Zip Slip`.
18. `tests::tests::test_extract_valid_ffmpeg_and_ffprobe_zip` (Novo M05): Extração segura de binários em subpastas de release.
19. `tests::tests::test_inspect_tool_with_missing_binary` (Novo M05): Inspeção de executável inexistente retornando `NotInstalled`.

---

## 4. Avaliação do Critério de Teste em Windows Limpo

Conforme estipulado no item 15 da especificação:
> *"Se não houver ambiente Windows limpo disponível, informar expressamente a limitação e não marcar o teste como aprovado."*

- **Situação**: O host de desenvolvimento é uma máquina Windows 11 x64 com Microsoft C++ Build Tools, Node.js e Rust instalados. Não houve provisionamento externo de uma segunda VM Windows 11 completamente limpa e desprovida de SDKs.
- **Medidas Compensatórias Executadas**:
  - Isolamento de caminhos: Os testes de dependências foram executados apontando para pastas temporárias limpas sem interferir nas variáveis de ambiente globais.
  - Testes de extração, falha e substituição atômica validados via fixtures em disco.
- **Declaração Formal**: O teste de instalação física em máquina virtual Windows 11 100% virgem **permanece registrado como pendente de ambiente isolado dedicado**, mantendo total transparência e rigor com as instruções da missão.
