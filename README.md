# FluxoPay

Controle financeiro pessoal. Next.js + Prisma (PostgreSQL) + NextAuth.

## O que faz

**Este mês**
- Várias **fontes de renda** (o total é calculado), gastos variáveis e % a investir. Tudo é salvo automaticamente.
- **Contas fixas** que se repetem todo mês (aluguel, internet...), com dia de vencimento e marcação de "paga". Mudar o valor vale do mês escolhido em diante e não altera o passado. Contas atrasadas ou perto de vencer aparecem num aviso.
- **Cartão (Nubank):** compras à vista e **parceladas** (aparecem nos meses certos, ex.: 4/10, inclusive as já em andamento), limite usado, fechamento e vencimento da fatura.
- **Outros gastos**, com categoria, data da compra e edição de cada item; **busca** por nome e categoria.
- **Limite de gastos:** aviso quando passam de **60% da renda** (a partir de 48% já avisa que está perto), com a barra marcando o limite, os meses acima dele sinalizados no histórico e e-mail de alerta (uma vez por mês). Para mudar o percentual, edite `LIMITE_GASTOS_PERCENT` em `lib/calculos.ts`.
- **Orçamento por categoria** e **comparativo com o mês anterior**.
- **Copiar do mês anterior** quando o mês está vazio.
- Gráficos: para onde foi o dinheiro, projeção do investimento (com juros de 1% ao mês) e evolução mensal.

**Metas:** várias metas com progresso, depósitos e retiradas; a **reserva de emergência** mostra quantos meses de gastos ela cobre (ideal: 6). A primeira meta não concluída alimenta o resumo e o gráfico de investimento.

**Ano:** totais, média mensal, mês mais caro e quantos meses passaram do limite.

**Preferências:** avisos por e-mail, orçamento por categoria e dados do cartão (limite, fechamento, vencimento).

**Conforto:** ocultar valores (olhinho), modo escuro, exportar tudo em CSV (Excel), enviar o resumo do mês por e-mail e instalar no celular (PWA).

**Conta:** cadastro com confirmação por e-mail, login por usuário ou e-mail e recuperação de senha.

## Configuração

Crie `.env` com:

```
DATABASE_URL="postgresql://postgres:SENHA@localhost:5432/finance"
NEXTAUTH_SECRET="uma-chave-longa-e-aleatoria"
NEXTAUTH_URL="http://localhost:3000"
```

Depois:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## E-mail

Para enviar e-mails de verdade, defina no `.env` (qualquer servidor SMTP serve; no Gmail use uma "senha de app"):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=senha_de_app
EMAIL_FROM="FluxoPay <seu_email@gmail.com>"
```

Sem `SMTP_HOST`, em desenvolvimento o e-mail (com o link) é mostrado no terminal onde o `npm run dev` está rodando. Em produção o SMTP é obrigatório.

## Publicando

- `NEXTAUTH_URL` deve ser o endereço público: os links dos e-mails usam essa variável.
- Defina na hospedagem as mesmas variáveis do `.env` (banco, `NEXTAUTH_SECRET` e SMTP).
- Aplique as migrações no banco de produção com `npx prisma migrate deploy`. Se o banco já tiver usuários antigos (sem e-mail), a migração `email_e_tokens` precisa de ajuste, porque a coluna `email` é obrigatória.

## Onde mexer

| Para... | Edite |
|---|---|
| Trocar o nome do app | `lib/app.ts` |
| Mudar o limite de gastos (60%) | `LIMITE_GASTOS_PERCENT` em `lib/calculos.ts` |
| Adicionar um cartão | `lib/cartoes.ts` (e uma lista em `app/painel.tsx`) |
| Adicionar uma categoria | `lib/categorias.ts` |
| Mudar as contas do resumo | `lib/calculos.ts` e `lib/resumo-mes.ts` (têm testes em `tests/`) |
| Regras de vencimento | `lib/vencimentos.ts` |

## Testes

```bash
npm test
```

Cobrem os cálculos (saldo, limite, meta com juros), as parcelas, as contas fixas e seus vencimentos, as metas e a reserva, o resumo do ano, a busca e as validações.
