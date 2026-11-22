# Guia de Deploy — Supabase, Git/GitHub e Vercel

Este guia reúne o passo a passo completo para publicar o **Mandato+** em produção com segurança, LGPD e isolamento multi-tenant.

---

## 1. Supabase (Banco de Dados e Autenticação)

### 1.1 Aplicar migrações SQL
Você tem duas opções (ambas são 100% idempotentes e preservam dados existentes):

- **Opção A — SQL Editor (mais rápida):**
  - Execute o arquivo consolidado [`supabase/deploy_all_migrations.sql`](../supabase/deploy_all_migrations.sql) no **SQL Editor** do Supabase (ou execute individualmente `0001` até `0006` em ordem).
- **Opção B — Supabase CLI:**
  ```bash
  supabase link --project-ref SEU-PROJECT-REF
  supabase db push
  ```

### 1.2 Configurar URLs de Autenticação (obrigatório após subir na Vercel)
No painel do Supabase, acesse **Authentication → URL Configuration**:
- **Site URL:** `https://SEU-DOMINIO.vercel.app` (ou domínio próprio)
- **Redirect URLs:** adicione `https://SEU-DOMINIO.vercel.app/**` e `http://localhost:3000/**`

---

## 2. Git e GitHub

O arquivo `.gitignore` já bloqueia `.env.local`, `node_modules/` e `.next/` para que nenhuma credencial seja enviada ao repositório.

```bash
git add .
git commit -m "feat: Mandato+ MVP completo com LGPD, multi-tenant, importacao e conciliacao"
git remote add origin https://github.com/SEU-USUARIO/mandato-plus.git
git push -u origin main
```

---

## 3. Vercel (Hospedagem em São Paulo — `gru1`)

O arquivo [`vercel.json`](../vercel.json) já está configurado para Next.js na região **`gru1` (São Paulo)** e com cabeçalhos de segurança HTTP.

1. Acesse [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório `mandato-plus` do GitHub.
2. Em **Environment Variables**, cadastre:

| Variável | Valor em Produção |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (`anon` / `publishable`) do Supabase |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-DOMINIO.vercel.app` (usada nos links de descadastro e compartilhamento) |
| `NEXT_PUBLIC_CONSENT_VERSION` | `1.0.0` |
| `IP_HASH_SECRET` | Uma chave aleatória forte (ex.: 32+ caracteres) |

3. Clique em **Deploy**.
4. Após o deploy concluir, atualize `NEXT_PUBLIC_APP_URL` na Vercel (se ainda não soubesse o domínio) e atualize a **Site URL** no Supabase Auth (item 1.2).

---

## 4. Checklist pós-deploy

- [ ] Acessar `/criar-conta` e testar criação de conta + mandato
- [ ] Em `/painel/configuracoes`, testar salvar **Dados do mandato** e **Identidade visual**
- [ ] Em `/painel/links`, criar um link público e abrir `/cadastro/[slug]` (conferir checkbox desmarcado)
- [ ] Testar o link de `/descadastro/[token]` exibido ao final do cadastro
- [ ] Testar `/painel/base` (filtros + ficha completa) e `/painel/configuracoes/importacao`
