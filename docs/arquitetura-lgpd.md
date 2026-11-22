# Arquitetura, Segurança e Conformidade LGPD — Mandato+

Este documento consolida as decisões arquiteturais do **Mandato+** para garantir conformidade com a LGPD (Lei nº 13.709/2018), isolamento multi-tenant e boas práticas institucionais desde o primeiro commit.

## 1. Isolamento Multi-tenant (Supabase RLS)

- Toda entidade operacional possui `tenant_id` referenciando `public.tenants(id)`.
- **Row Level Security (RLS)** está habilitado em **100% das tabelas** (`tenants`, `tenant_members`, `public_links`, `contacts`, `interests`, `contact_interests`, `consent_records`, `audit_logs`).
- O acesso de usuários autenticados é validado pelas funções `public.is_tenant_member(tenant_id)` e `public.is_tenant_admin(tenant_id)`, garantindo que nenhum gabinete acesse ou altere contatos de outro mandato.

## 2. Separação entre Mandato e Campanha Eleitoral

- Todas as tabelas de relacionamento (`public_links`, `contacts`, `interests`, `consent_records` e `audit_logs`) possuem o campo obrigatório `data_scope` com valores restritos a:
  - `mandate`: relacionamento institucional do exercício do mandato;
  - `campaign`: atividades específicas de campanha eleitoral.
- Essa separação evita a mistura indevida entre bases institucionais e eleitorais.

## 3. Consentimento Explícito e Descadastro Fácil

- Todo formulário público inicia com o checkbox de consentimento **desmarcado** (`CONSENT_CHECKBOX_DEFAULT_CHECKED = false`).
- Cada contato registra obrigatoriamente:
  - **origem** (`consent_source`);
  - **data e hora** (`consented_at`);
  - **versão do termo** (`consent_version`).
- Cada concessão ou revogação gera um registro imutável em `public.consent_records` com snapshot do texto aceito.
- Todo contato recebe um `unsubscribe_token` único para permitir descadastro imediato e sem atrito em qualquer comunicação.

## 4. Minimização de Dados (MVP)

No MVP, coletamos apenas o estritamente necessário para o relacionamento consentido:
- Nome completo, canal de contato (WhatsApp e/ou e-mail), cidade, bairro, interesses temáticos e dia/mês de aniversário (`birth_day` e `birth_month`, evitando inclusive a coleta desnecessária do ano de nascimento).
- **É proibido coletar ou armazenar no MVP:** CPF, religião, etnia, biometria ou opinião política detalhada.

## 5. Auditoria e Comunicações Responsáveis

- Alterações relevantes devem ser registradas em `public.audit_logs` (tabela *append-only* sem política de `UPDATE`/`DELETE`).
- **Não há disparo em massa** nem automação não oficial de WhatsApp.
- O envio futuro de parabéns a aniversariantes será sempre **individual e manual**, abrindo o canal oficial do WhatsApp (`wa.me`) apenas para apoiadores com `consent_status = 'granted'` e incluindo orientação de descadastro.
