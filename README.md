# Coitz Barbearia - Plataforma de Agendamentos SaaS 💈

Um sistema de agendamentos moderno, escalável e de alta performance construído para barbearias. Arquitetado focado em resiliência **Serverless**, segurança defensiva e excelente experiência do usuário.

## 🚀 Arquitetura e Tech Stack

O projeto utiliza uma topologia mista focada em Serverless, separando as responsabilidades de interface e infraestrutura de dados:

**Frontend (SPA)**
* **Framework:** React 19 (Vite) + TypeScript
* **Estilização:** Tailwind CSS v4 + Framer Motion (Animações fluidas)
* **Roteamento:** React Router DOM
* **Estado e Auth:** Context API

**Backend (Serverless)**
* **Infraestrutura:** Vercel Serverless Functions (`/api/`)
* **Autenticação:** JWT (JSON Web Tokens) com Refresh Token Rotation (Cookies HttpOnly)
* **Validação:** Zod + Bcryptjs
* **Proteção e Rate Limit:** Upstash Redis (`@upstash/ratelimit`)

**Banco de Dados & Dados**
* **Database:** PostgreSQL (Hospedado no Supabase com PgBouncer)
* **ORM:** Drizzle ORM
* **Observabilidade:** Sentry (Tratamento de erros no backend com PII Scrubbing) + Vercel Analytics

---

## ✨ Funcionalidades e Engenharia de Destaque

Este MVP foi desenhado para contornar os principais gargalos de ambientes Serverless (como *Cold Starts* e concorrência):

* **Prevenção de Double-Booking:** Utiliza transações com lock no nível do banco de dados e constraints restritivas no PostgreSQL para garantir que dois usuários não reservem o mesmo horário no mesmo milissegundo.
* **Processamento Assíncrono (Non-blocking):** Uso da API nativa `waitUntil` da Vercel para responder imediatamente ao usuário (200 OK) enquanto rotinas secundárias (como notificações via mensageria/WAHA) rodam em background.
* **Segurança de Nível Empresarial:**
  * Proteção Anti-CSRF via validação de cabeçalhos de Origem.
  * Sanitização rigorosa de inputs textuais contra injeções.
  * Autenticação via Cookies HttpOnly com tokens de vida curta (15 minutos) e rotação de Refresh Tokens.
* **Conformidade LGPD (Vercel Cron):** Rotina automatizada executada semanalmente em background que anonimiza dados sensíveis (Nome, Telefone, Email) de agendamentos cancelados/vencidos há mais de 12 meses.
* **Soft Deletes:** Preservação de métricas financeiras. Cancelamentos mudam o status (`CANCELLED`, `NO_SHOW`) em vez de deletar fisicamente o registro.

---

## ⚙️ Variáveis de Ambiente (.env)

Para rodar este projeto, você precisará configurar as seguintes variáveis. No ambiente local, crie um arquivo `.env` na raiz do projeto. Para produção, configure-as no painel da Vercel.

```env
# Banco de Dados (Supabase + PgBouncer)
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Segurança
JWT_SECRET="sua_chave_criptografica_segura_aqui"
CRON_SECRET="chave_para_proteger_a_rota_lgpd"

# URLs (Essencial para bloqueio CSRF e CORS)
APP_URL="http://localhost:3000" # Em prod: [https://seu-dominio.vercel.app](https://seu-dominio.vercel.app)
APP_ORIGIN="http://localhost:3000" # Em prod: [https://seu-dominio.vercel.app](https://seu-dominio.vercel.app)

# Sistema Anti-Spam (Upstash Redis)
UPSTASH_REDIS_REST_URL="url_do_seu_banco_upstash"
UPSTASH_REDIS_REST_TOKEN="token_do_seu_banco_upstash"

# Observabilidade (Opcional no ambiente local)
SENTRY_DSN="seu_dsn_do_sentry"
🛠️ Instalação e Execução Local
1. Instale as dependências:

Bash
npm install
2. Sincronize o Banco de Dados (Drizzle):
Certifique-se de que a DATABASE_URL está correta e empurre o esquema atual para o Supabase:

Bash
npx drizzle-kit push
3. Inicie o servidor de desenvolvimento:

Bash
npm run dev
A aplicação estará disponível em http://localhost:3000.

📦 Deploy (Vercel)
Importe o repositório na Vercel.

Adicione todas as variáveis de ambiente mapeadas acima (certifique-se de que APP_URL e APP_ORIGIN não possuem barra / no final).

Na seção Build & Development Settings, o comando padrão do Vite (npm run build) será detectado automaticamente.

Clique em Deploy.

Aviso de Segurança: O arquivo .env local nunca deve ser "comitado". A pasta drizzle/ deve ser rastreada pelo Git para manter o histórico das migrações do banco de dados.

Desenvolvido por PouskDEV.
