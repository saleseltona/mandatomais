# Mandato+

Plataforma web de **relacionamento político consentido** para políticos, mandatos e assessorias no Brasil.

Projetada com foco em **LGPD**, **consentimento explícito**, **isolamento multi-tenant via Supabase RLS**, **separação entre dados de mandato e campanha eleitoral**, acessibilidade e experiência **mobile-first**.

## Objetivos do MVP

- Criar links públicos de cadastro de apoiadores com consentimento explícito (checkbox sempre desmarcado por padrão).
- Registrar origem, data, hora e versão do termo de consentimento em cada cadastro.
- Organizar a base de apoiadores por cidade, bairro e interesse temático.
- Visualizar aniversariantes do dia com consentimento ativo para envio individual e manual de parabéns via link oficial do WhatsApp.
- Permitir descadastro fácil em toda comunicação.

> **Importante:** O Mandato+ **não realiza disparo em massa** e **não utiliza automação não oficial do WhatsApp**.

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Estilização:** Tailwind CSS v4 (mobile-first, paleta azul escuro, branco e verde)
- **Banco e Autenticação:** Supabase (`@supabase/supabase-js` + `@supabase/ssr`) com Row Level Security (RLS) em todas as tabelas
- **Validação:** Zod
- **Testes:** Vitest

## Estrutura de Pastas

```text
Mandato+/
├── app/                   # Rotas Next.js App Router, layout raiz e página inicial
├── components/
│   ├── landing/           # Seções da página institucional
│   └── ui/                # Componentes base acessíveis
├── docs/                  # Documentação de arquitetura e conformidade LGPD
├── lib/
│   ├── constants/         # Versão e regras de consentimento LGPD
│   ├── supabase/          # Clientes browser, server e middleware SSR
│   ├── types/             # Tipagem do domínio multi-tenant
│   └── utils/             # Utilitários compartilhados
├── supabase/
│   └── migrations/        # Schema SQL inicial com RLS e auditoria
├── tests/                 # Testes automatizados (Vitest)
├── .env.example           # Variáveis de ambiente necessárias
└── middleware.ts          # Atualização de sessão Supabase SSR
```

## Como executar localmente

### 1. Pré-requisitos

- Node.js 20+ e npm
- Uma conta/projeto no [Supabase](https://supabase.com)

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Supabase:

```bash
cp .env.example .env.local
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

Variáveis utilizadas:

- `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública (`anon`) do Supabase
- `NEXT_PUBLIC_APP_URL`: URL base da aplicação (ex.: `http://localhost:3000`)
- `NEXT_PUBLIC_CONSENT_VERSION`: Versão vigente do termo de consentimento (ex.: `1.0.0`)

### 4. Aplique as migrações SQL no Supabase

Execute em ordem os arquivos em `supabase/migrations/` no **SQL Editor** do Supabase (ou via Supabase CLI `supabase db push`):

1. `supabase/migrations/0001_initial_schema.sql` — tabelas multi-tenant, RLS em todas as tabelas e auditoria
2. `supabase/migrations/0002_public_consent_rpcs.sql` — funções RPC seguras para cadastro público consentido e descadastro fácil
3. `supabase/migrations/0003_security_hardening_and_onboarding.sql` — fechamento de policy pública em `public_links`, validação de calendário real, deduplicação com reconsentimento auditado e onboarding do primeiro mandato

### Rotas disponíveis

- `/` — página institucional do Mandato+
- `/entrar` — autenticação de políticos e assessorias via Supabase Auth
- `/painel` — painel do mandato (com onboarding self-service no primeiro acesso), link público principal, panorama geral e aniversariantes do dia
- `/painel/base` — base paginada com filtros SQL por cidade, bairro, interesse e busca
- `/painel/base/[id]` — ficha completa do apoiador com edição auditada, trilha `consent_records` e ações LGPD
- `/painel/links` — gestão de links públicos e temas de interesse
- `/cadastro/[slug]` — formulário público de cadastro com checkbox de consentimento desmarcado por padrão
- `/descadastro/[token]` — revogação imediata de consentimento com registro em auditoria

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## Scripts disponíveis

- `npm run dev` — inicia o servidor de desenvolvimento
- `npm run build` — gera o build de produção
- `npm run start` — executa o build de produção
- `npm run lint` — executa verificação ESLint
- `npm run typecheck` — verifica tipos TypeScript
- `npm run test` — executa a suíte de testes unitários

## Documentação adicional

Consulte [`docs/arquitetura-lgpd.md`](./docs/arquitetura-lgpd.md) para detalhes sobre isolamento multi-tenant, políticas de RLS, minimização de dados e trilha de auditoria.
