# Relatório de Testes Automatizados e Auditoria — Missão 08.1 (ToolsOnDesk)

**Data da Auditoria e Execução:** 29 de Outubro de 2026  
**Ambiente de Homologação:** Linux x86_64 Ubuntu 22.04 LTS (Docker `toolsondesk-builder` com WebKitGTK 4.1, GTK3, GCC 11, Rustc 1.95.0, Node.js v20.19.0, Vitest 5.0.5)

---

## 1. Resumo Executivo das Suítes de Teste

| Suíte de Testes | Total de Testes | Passaram | Falharam | Taxa de Sucesso | Observações de Auditoria |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Frontend (Vitest)** | 34 | 34 | 0 | **100%** | 9 suítes cobrindo App Shell, Creative Studio, Documentos, Erros, Setup Center, Migração, Pôsteres e Navegação |
| **Backend Rust (`cargo test`)** | 38 | 38 | 0 | **100%** | Testes nativos cobrindo CredentialStore fail-closed, mitigação de argv, migração não-destrutiva, subprocessos, SSRF e motores de mídia |
| **Total Combinado** | **72** | **72** | **0** | **100%** | Zero regressões funcionais; conformidade rigorosa com AGENTS.md |

---

## 2. Detalhamento dos Testes de Backend Rust (38 testes nativos)

### 2.1 Segurança do Cofre de Credenciais e Portabilidade (`CredentialStore`)
1. ✅ `test_credential_store_key_masking`: Valida o mascaramento de chaves de API (`nvapi-••••••••7890`) e proteção de chaves curtas (`••••••••`).
2. ✅ `test_credential_store_zeroize_memory`: Valida a sobrescrita volátil de buffers em memória (`zeroize_bytes`) via `write_volatile`.
3. ✅ `test_credential_store_sanitization_avoids_leakage`: Valida a sanitização regex em strings de log, impedindo vazamento de segredos para arquivos ou frontend.
4. ✅ `test_credential_store_linux_keyring_present`: Valida o salvamento, consulta e exclusão no FreeDesktop Secret Service quando o serviço está ativo.
5. ✅ `test_credential_store_linux_keyring_absent_fails_closed`: Valida a política **fail-closed** quando o utilitário `secret-tool` não está instalado, garantindo que nenhum arquivo inseguro seja gerado no disco.
6. ✅ `test_credential_store_linux_keyring_locked_fails_closed`: Valida a política **fail-closed** quando o chaveiro do sistema está bloqueado ou o usuário cancela a solicitação de desbloqueio.
7. ✅ `test_credential_store_linux_keyring_unavailable_fails_closed`: Valida a política **fail-closed** em falhas de barramento D-Bus no Linux.
8. ✅ `test_credential_store_legacy_migration_recovery`: Valida a migração não-destrutiva de credenciais legadas armazenadas em `.vault_secure.enc` e `.vault_keys.enc`, assegurando recuperação em memória sem perda de chaves.

### 2.2 Camada de Plataforma e Subprocessos (`crate::platform`)
9. ✅ `test_cross_platform_binary_paths`: Verifica a descoberta de diretórios canônicos de executáveis no Linux (`/usr/bin`) e no macOS (`/opt/homebrew/bin`).
10. ✅ `test_platform_system_diagnostics`: Verifica o diagnóstico do sistema operacional, arquitetura de CPU, backend WebKitGTK e permissão de escrita temporária.
11. ✅ `test_process_manager_command_configuration`: Valida a criação de grupos de processos POSIX (`process_group(0)`) no Linux/macOS e `CREATE_NO_WINDOW` no Windows.
12. ✅ `test_path_manager_structure`: Valida a resolução centralizada de caminhos persistentes em conformidade com as diretrizes XDG, Apple Library e Windows LocalAppData.

### 2.3 Segurança Cibernética e Proteção Ativa
13. ✅ `test_download_url_validation_and_ssrf`: Valida bloqueio rigoroso contra SSRF para IPs privados (RFC 1918, RFC 3927, loopback, file://, ftp://).
14. ✅ `test_zip_slip_security_prevention`: Impede ataques de travessia de diretório em arquivos compactados (`../../`).
15. ✅ `test_sanitizes_nvidia_keys`: Sanitiza chaves de API por regex com substituição por `[PROTECTED_NVIDIA_KEY]`.
16. ✅ `test_sanitizes_credentials_and_paths`: Mascara senhas e caminhos de diretório de usuários privados.
17. ✅ `test_sanitizes_cookies_sessions_and_tokens`: Mascara tokens sensíveis em logs.
18. ✅ `test_sanitizes_private_keys`: Remove blocos de certificados e chaves privadas.

### 2.4 Motores de Mídia e Creative Studio
19. ✅ `test_all_16_builtin_skills_present`: Valida o catálogo com todas as 16 skills criativas embutidas.
20. ✅ `test_creative_skills_catalog_and_export`: Exporta o catálogo de skills sem corrupção.
21. ✅ `test_creative_projects_and_assets_sqlite`: Persistência transacional de projetos e assets criativos no SQLite.
22. ✅ `test_motion_engine_synthetic_mp4_render`: Renderiza vídeo MP4 sintético com filtros e drawtext FFmpeg.
23. ✅ `test_sanitize_color_and_drawtext`: Sanitiza textos e parâmetros de cor no motor de animação.
24. ✅ `test_image_engine_conversion`: Conversão entre formatos de imagem (PNG, JPEG, WebP).
25. ✅ `test_synthetic_audio_conversion_and_probe`: Inspeção ffprobe e conversão de áudio com cancelamento limpo.
26. ✅ `test_synthetic_video_operations`: Operações de recorte e transcodificação de vídeo.

### 2.5 Documentos e Poster Studio
27. ✅ `test_document_engine_pdf_operations`: Manipulação de arquivos PDF via `lopdf` (contagem de páginas, metadados).
28. ✅ `test_poster_engine_calculation_and_pdf`: Cálculo geométrico de pôster e geração de PDF multipartes.
29. ✅ `test_mandatory_rasterbator_example_4x3_12_sheets`: Teste de referência matemática (grade 4x3 = 12 folhas).

### 2.6 Persistência, Tarefas e Migração M07
30. ✅ `test_sqlite_tasks_and_history`: Operações transacionais na fila única de tarefas e histórico.
31. ✅ `test_error_logs_persistence_and_queries`: Filtros de logs de erro por severidade, busca textual e resolução.
32. ✅ `test_first_run_status_lifecycle`: Ciclo de vida da preferência de primeiro acesso.
33. ✅ `test_migration_manager_idempotence_and_preservation`: Migração de dados legados do Arce Tools sem duplicação e com garantia de integridade.
34. ✅ `test_external_tools_discovery`: Identificação de executáveis multimídia sem dependência de PATH fixo.
35. ✅ `test_inspect_tool_with_missing_binary`: Tratamento seguro para binários ausentes.
36. ✅ `test_managed_binaries_directory_and_write_permission`: Teste de criação e escrita na pasta de binários gerenciados.
37. ✅ `test_extract_valid_ffmpeg_and_ffprobe_zip`: Extração atômica de arquivos zip de dependências.
38. ✅ `test_clipboard_copy`: Cópia segura de dados para o clipboard do sistema.

---

## 3. Detalhamento dos Testes de Frontend (34 testes Vitest)

1. `src/tests/App.test.tsx` (4 testes):
   - ✅ Renderização da TitleBar com marca e controles nativos
   - ✅ Renderização dos 10 itens de navegação lateral
   - ✅ Navegação entre telas do sistema
   - ✅ Paleta de comandos global `Ctrl+K` / `⌘K`
2. `src/tests/creativeStudio.test.tsx` (6 testes):
   - ✅ Header e sub-abas do Creative Studio
   - ✅ Catálogo com as 16 skills criativas
   - ✅ Modal de criação e edição de projetos
   - ✅ Validação de chave NVIDIA NIM e mascaramento
   - ✅ Alternância entre Image Studio, Motion Studio e Video Studio
   - ✅ Modal de exportação Remotion TSX
3. `src/tests/documents.test.tsx` (3 testes):
   - ✅ Inspeção e metadados de PDF
   - ✅ Fluxo de conversão DOCX/PDF
   - ✅ Validação de parâmetros para união e divisão de PDF
4. `src/tests/errors.test.tsx` (5 testes):
   - ✅ Central de erros e histórico
   - ✅ KPIs de saúde do sistema e diagnóstico
   - ✅ Filtros de severidade e busca
   - ✅ Resolução de incidentes
   - ✅ Limpeza de diagnóstico
5. `src/tests/mediaScreens.test.tsx` (3 testes):
   - ✅ Tela de áudio e extração
   - ✅ Tela de vídeo e compressão
   - ✅ Tela de downloads com yt-dlp e badges multiplataforma
6. `src/tests/migration.test.tsx` (3 testes):
   - ✅ Detecção de dados legados M01-M06
   - ✅ Execução do assistente de migração
   - ✅ Conclusão e auditoria de integridade
7. `src/tests/navigation.test.ts` (2 testes):
   - ✅ Mapeamento de atalhos de navegação
   - ✅ Menu lateral recolhível (64px / 230px)
8. `src/tests/poster.test.ts` (3 testes):
   - ✅ Geometria e margem de sobreposição (*overlap*)
   - ✅ Escala proporcional de silhueta humana (1,80 m)
   - ✅ Amostragem halftone e antialiasing
9. `src/tests/setupCenter.test.tsx` (5 testes):
   - ✅ Diagnóstico de dependências do sistema
   - ✅ Detecção de FFmpeg, yt-dlp e LibreOffice
   - ✅ Configuração de caminhos customizados
   - ✅ Relatório do sistema operacional e runtime
   - ✅ Conclusão do assistente inicial
