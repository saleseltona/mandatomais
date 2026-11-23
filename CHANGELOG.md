# Changelog — Mandato+

Todas as evoluções modulares adicionadas sobre a base validada do Mandato+ são registradas neste arquivo.

## [1.3.0] — Módulo 2: Lembretes Antecipados para a Equipe

### Adicionado
- **Migration idempotente `0009_team_reminders.sql`** (anexada ao final de `supabase/deploy_all_migrations.sql` sem alterar `0001`–`0008`):
  - Tabelas `team_reminder_settings` e `team_notifications` com RLS por `tenant_id`.
- **Central `/painel/notificacoes`:**
  - Lembretes antecipados de aniversariantes com consentimento ativo (horizontes configuráveis: no dia, 1, 3, 7 ou 15 dias antes), demandas prioritárias ou abertas há 7+ dias, lembretes manuais internos da equipe e resumo diário copiável para alinhamento interno.
  - Testes unitários em `tests/team-reminders.test.ts`.

## [1.2.0] — Módulo 1: Calendário de Aniversários + Ajustes Aprovados

### Adicionado
- **Calendário de Aniversários (`/painel/aniversariantes/calendario`):**
  - Grade mensal interativa (domingo a sábado) com visão anual rápida (12 meses), filtro por município, painel lateral do dia selecionado, tratamento de aniversariantes de 29/02 em anos não bissextos e botão individual de parabéns via WhatsApp oficial (`wa.me` com link de descadastro).
  - Exportação auditada de agenda `.ics` (`/painel/aniversariantes/calendario/ics`) contendo apenas contatos com `consent_status = 'granted'` e sem expor telefone ou e-mail.
  - Testes unitários em `tests/birthday-calendar.test.ts`.
- **Menu lateral (`components/panel/panel-shell.tsx` — diff aprovado):** adicionado item **Pesquisas** apontando para `/painel/pesquisas`.

### Corrigido (diff aprovado)
- **Fluxo de criação de conta com confirmação de e-mail (`app/criar-conta/actions.ts` e `lib/supabase/panel-data.ts`):** os dados do mandato preenchidos em `/criar-conta` agora são persistidos em `user_metadata.pending_onboarding` e inicializados automaticamente no primeiro acesso após a confirmação do e-mail, eliminando a repetição do formulário de onboarding.

## [1.1.0] — Módulo 12: Pesquisa de Percepção e Avaliação do Mandato

### Adicionado
- **Migration idempotente `0008_perception_surveys.sql`** (e anexada ao final de `supabase/deploy_all_migrations.sql` sem alterar `0001`–`0007`):
  - Tabelas `surveys`, `survey_responses` (com constraint `chk_survey_anonymous_no_pii`) e `survey_response_analyses`.
  - Políticas RLS por `tenant_id` e funções RPC `get_public_survey` e `submit_public_survey_response`.
- **Página pública `/pesquisa/[slug]`** com barra de progresso, 12 perguntas padrão + perguntas personalizadas, proteção anti-spam (honeypot + rate limit + anti-duplicidade por HMAC), anonimato garantido e consentimento LGPD separado.
- **Gestão no painel:**
  - `/painel/pesquisas` e `/painel/pesquisas/nova`
  - `/painel/pesquisas/[id]/resultados` (distribuições, rankings, palavras-chave, resumo WhatsApp, card social, impressão/PDF e publicação agregada na Transparência)
  - `/painel/pesquisas/[id]/analise` (classificação qualitativa, criação de demanda em 1 clique, resposta oficial via WhatsApp somente com consentimento e exclusão LGPD)
  - `/painel/pesquisas/[id]/exportar` (CSV auditado com sanitização contra Formula Injection e anonimização automática para perfil `viewer`)
- **Testes automatizados:** `tests/perception-survey.test.ts` (validação LGPD, rejeição de campos sensíveis, agregação e segurança de CSV).
- **Documentação:** `docs/pesquisa-percepcao.md`.

### Preservado
- Nenhuma rota, componente, tabela, coluna, política RLS, migração (`0001`–`0007`) ou teste (32 testes anteriores) já existente foi alterado ou removido.
