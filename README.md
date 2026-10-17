# Controle Financeiro

Next.js + Prisma (PostgreSQL) + NextAuth. Controle de renda, gastos, meta de investimento e histórico mensal.

## Configuração

Crie `.env` com `DATABASE_URL`, `NEXTAUTH_SECRET` e `NEXTAUTH_URL`, depois:

```bash
npm install
npx prisma migrate dev
npm run dev
```
