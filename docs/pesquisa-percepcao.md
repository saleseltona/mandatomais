# Módulo 12 — Pesquisa de Percepção e Avaliação do Mandato

Este módulo adiciona ao **Mandato+** a coleta estruturada, voluntária e consentida da opinião da população sobre a gestão pública municipal, o desempenho do mandato, pontos de acerto, áreas de melhoria e prioridades nos bairros.

## Rotas Criadas

### Pública
- `/pesquisa/[slug]` — Formulário público mobile-first com identidade visual do mandato, barra de progresso, 12 perguntas padrão + perguntas personalizadas opcionais, resposta anônima garantida e consentimento separado para comunicações.

### Painel Administrativo
- `/painel/pesquisas` — Lista de pesquisas do mandato/campanha com status (`Rascunho`, `Ativa`, `Pausada`, `Encerrada`), contagem de respostas (anônimas × identificadas), compartilhamento e controle de status.
- `/painel/pesquisas/nova` — Criação de nova pesquisa com janela de coleta, limite de respostas, segmentação de público e construtor de perguntas complementares.
- `/painel/pesquisas/[id]/resultados` — Painel consolidado com filtros (município, bairro, tipo de identificação e período), gráficos de distribuição, rankings de acertos e melhorias, palavras-chave citadas, resumo copiável para WhatsApp, card de prestação de contas, impressão/PDF e publicação de resumo agregado na Transparência.
- `/painel/pesquisas/[id]/analise` — Leitura e classificação qualitativa de respostas abertas (`elogio`, `critica`, `sugestao`, `demanda`, `observacao`), vínculo com ações do mandato, criação de demanda estruturada em 1 clique, resposta individual oficial via `wa.me` (somente se identificada + consentida) e exclusão LGPD auditada.
- `/painel/pesquisas/[id]/exportar` — Exportação CSV auditada com proteção contra *CSV Formula Injection* e omissão automática de dados pessoais para perfis somente leitura (`viewer`).

## Banco de Dados e Segurança (Migration `0008_perception_surveys.sql`)

- **Tabelas novas:** `public.surveys`, `public.survey_responses`, `public.survey_response_analyses`.
- **RLS ativa em 100% das tabelas** com isolamento por `tenant_id` e zero acesso direto para `anon`.
- **Integridade de anonimato no banco:** constraint `chk_survey_anonymous_no_pii` impede que uma resposta marcada como `is_anonymous = true` armazene nome, WhatsApp, e-mail ou vínculo com contato.
- **RPCs `SECURITY DEFINER`:**
  - `public.get_public_survey(p_slug)` — retorna apenas metadados públicos da pesquisa e identidade visual do mandato.
  - `public.submit_public_survey_response(...)` — valida status ativo, período, limite de respostas, anti-duplicidade de 15 minutos por `device_hash` (HMAC-SHA256) e registra contato + `consent_records` somente quando há consentimento explícito.
- **Auditoria:** criação, alteração de status, análise qualitativa, criação de demanda, publicação na transparência, exportação CSV e exclusão LGPD registradas em `audit_logs`.

## Como Aplicar em Produção

1. Execute `supabase/migrations/0008_perception_surveys.sql` no **SQL Editor** do Supabase (ou utilize o consolidado `supabase/deploy_all_migrations.sql`).
2. Faça push das alterações para o repositório Git conectado à Vercel.
