# Checklist Jurídico e Controle de Riscos de Marca — ToolsOnDesk
## Missão 07: Conformidade Preliminar de Marca, Domínio e Propriedade Intelectual

> [!WARNING]
> **AVISO DE STATUS DE LIBERAÇÃO COMERCIAL:**
> O nome **ToolsOnDesk** é uma identidade de trabalho interna adotada durante o ciclo de engenharia da Missão 07. A liberação comercial pública depende de verificação definitiva de anterioridade no INPI e aquisição formal de domínio web, ainda em andamento.
> Nenhuma reivindicação de titularidade exclusiva, marca registrada (®) ou domínio ainda não adquirido é feita nesta versão.

---

## 1. Status de Verificação de Marca (INPI e Internacional)

| Âmbito | Órgão / Base | Classes Relevantes | Status Atual | Ação Requerida antes do Lançamento |
|---|---|---|---|---|
| **Brasil** | INPI (Instituto Nacional da Propriedade Industrial) | Classe 09 (Software baixável) e Classe 42 (Serviços de software) | **Pendente de busca oficial definitiva** | Protocolar pedido formal de busca prévia e registro de marca nominativa/mista. |
| **Internacional** | USPTO / EUIPO / WIPO | Nice Class 09 / 42 | **Pendente** | Avaliação de riscos para distribuição global via Microsoft Store / GitHub. |

---

## 2. Disponibilidade e Política de Domínios

1. **Separação entre Identidade e Endereços Web:** O código-fonte do ToolsOnDesk **NÃO contém URLs hardcoded imaginárias** para atualizações, suporte ou downloads de domínios ainda não registrados.
2. **Endpoints Centralizados:** Qualquer comunicação de rede futura é desacoplada e configurável através de parâmetros externos ou variáveis de ambiente.
3. **Nenhum Uso Indevido de Símbolos:** O símbolo de marca registrada `®` é estritamente proibido até a concessão formal do certificado de registro pelo órgão competente. O símbolo não-registrado `™` poderá ser utilizado apenas após parecer jurídico favorável.

---

## 3. Conformidade com Licenças Open Source e Terceiros

| Componente Integrado | Licença Original | Conformidade no ToolsOnDesk |
|---|---|---|
| **Tauri 2** | MIT / Apache 2.0 | Compatível com distribuição comercial ou proprietária. |
| **FFmpeg / ffprobe** | LGPL v2.1 / GPL v3 | Execução estrita como processo filho isolado (`CREATE_NO_WINDOW`, `Command::new`). Sem linkagem estática ou dinâmica no binário. |
| **yt-dlp** | The Unlicense | Domínio público / permissiva. Executado via supervisão de processo sem restrições. |
| **LibreOffice** | MPL v2.0 | Invocado exclusivamente via linha de comando headless isolada (`soffice --headless`). |
| **Fontes Geist & Geist Mono** | SIL Open Font License 1.1 | Empacotadas localmente em `/public/fonts/` preservando os créditos de autoria. |
| **Remotion (Exportador)** | Remotion Company License | O aplicativo exporta código TypeScript/React aberto (`.tsx`) gerado pelo usuário. O motor desktop primário é o **ToolsOnDesk Motion Engine**, 100% nativo e livre de royalties. |
| **Modelos NVIDIA NIM** | Termos de Serviço NVIDIA AI Foundation | As inferências utilizam APIs oficiais com chaves fornecidas pelo próprio usuário. Nenhuma redistribuição não-autorizada de pesos de modelo é realizada. |

---

## 4. Recomendações e Próximos Passos Jurídicos

- [ ] Executar busca de colidência no banco de marcas do INPI com operador booleano para "ToolsOnDesk" e variações fonéticas.
- [ ] Registrar os domínios pretendidos (`.com.br`, `.com`, `.dev`) nas entidades registradoras oficiais (Registro.br / ICANN).
- [ ] Elaborar Termos de Uso e Política de Privacidade de acordo com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018).
- [ ] Obter Certificado Digital de Assinatura de Código (EV ou OV Authenticode) para o instalador NSIS antes da distribuição pública externa, prevenindo alertas do Windows SmartScreen.
