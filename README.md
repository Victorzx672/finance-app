# FluxoPay

Controle financeiro pessoal. Next.js + Prisma (PostgreSQL) + NextAuth.

## O que faz

**Este mês**
- **Total guardado** em destaque no topo (dinheiro guardado sem meta + o que está nas metas), com botões Guardar/Retirar. No cartão **Para investir**, o botão **"Guardei"** soma o que sobrou do mês ao total (só a diferença, então não conta em dobro; dá para desfazer). Na aba Metas há o gráfico de **evolução do total guardado**.
- **Rendas fixas** (salários): cadastre uma vez e elas entram sozinhas em todos os meses, do mês em que foram criadas em diante; mudar o valor vale dali para frente e não mexe no passado. **Rendas extras** (freelance, 13º) valem só no mês, e uma extra pode virar fixa com "Tornar fixa". O total de renda é calculado. Gastos variáveis e % a investir ficam no mês.
- Contas fixas, compras do cartão e gastos avulsos ficam em um só cartão com abas, em tabelas (data, descrição, categoria, valor), com busca e filtro por categoria.
- **Salvamento manual:** o mês é salvo ao clicar em **Salvar** (ou Ctrl+S). Enquanto houver alterações não salvas aparece um aviso no topo e uma barra fixa embaixo, e o app pergunta antes de sair, trocar de mês ou fechar/recarregar a página. Parcelas, contas fixas, metas, pagamentos e preferências são gravados na hora.
- **Contas fixas** que se repetem todo mês (aluguel, internet...), com dia de vencimento e marcação de "paga". Mudar o valor vale do mês escolhido em diante e não altera o passado. Contas atrasadas ou perto de vencer aparecem num aviso.
- **Cartão (Nubank):** compras à vista e **parceladas** (aparecem nos meses certos, ex.: 4/10, inclusive as já em andamento), limite usado, fechamento e vencimento da fatura.
- **Importar fatura (CSV):** no cartão, escolha o CSV exportado pelo app do Nubank. O app mostra as compras para você conferir (pagamentos e estornos ficam de fora, compras já lançadas vêm desmarcadas), sugere a categoria pelo nome (ou pelo que você já usou) e cadastra as parceladas como parceladas.
- **Quem gastou:** cadastre até 4 nomes em Preferências (ex.: Vitinho, Iele), marque quem fez cada compra e veja no gráfico quanto cada um gastou. Aparece também no CSV.
- **Previsão do mês:** no mês atual, mostra como o mês deve fechar no ritmo de gastos de agora, em que dia o limite de 60% deve estourar e quanto dá para gastar por dia para ficar dentro.
- **Outros gastos**, com categoria, data da compra e edição de cada item; **busca** por nome e categoria.
- **Limite de gastos:** aviso quando passam de **60% da renda** (a partir de 48% já avisa que está perto), com a barra marcando o limite, os meses acima dele sinalizados no histórico e e-mail de alerta (uma vez por mês). Para mudar o percentual, edite `LIMITE_GASTOS_PERCENT` em `lib/calculos.ts`.
- **Orçamento por categoria** e **comparativo com o mês anterior**.
- **Copiar do mês anterior** quando o mês está vazio.
- Gráficos: para onde foi o dinheiro, projeção do investimento (com juros de 1% ao mês) e evolução mensal.

**Metas:** várias metas com progresso, depósitos e retiradas; a **reserva de emergência** mostra quantos meses de gastos ela cobre (ideal: 6). A primeira meta não concluída alimenta o resumo e o gráfico de investimento.

**Ano:** totais, média mensal, mês mais caro e quantos meses passaram do limite.

**Dicas:** onde dá para gastar menos no mês (orçamento estourado, delivery, assinaturas, categorias pesadas, o que mais subiu, gastos fixos e parcelas), com quanto cada corte poderia liberar, e um guia **educativo** para guardar com segurança: ordem de prioridades (dívidas caras, reserva de emergência, metas com prazo) e comparação de opções de renda fixa de baixo risco (Tesouro Selic, CDB com liquidez diária, conta remunerada, LCI/LCA, Tesouro IPCA+/Prefixado, poupança). Não traz taxas nem é recomendação personalizada de investimento.

**Preferências:** avisos por e-mail (limite de gastos e **lembrete diário** de contas e fatura que vencem hoje ou amanhã), pessoas, orçamento por categoria e dados do cartão (limite, fechamento, vencimento).

**Conforto:** ocultar valores (olhinho), modo escuro, exportar tudo em CSV (Excel), enviar o resumo do mês por e-mail e instalar no celular (PWA).

**Interface:** menu lateral no computador e abas embaixo no celular; botão **"+"** (ou tecla **N**) para lançar um gasto de qualquer aba, com categorias e pessoas em botões; números com contagem animada, medidor circular do limite de 60%, gráfico de rosca por categoria (passe o mouse para destacar), controle deslizante do % a investir, confirmações em janela própria, "Descartar" alterações não salvas, confete ao concluir uma meta e tela de carregamento. **Atalhos:** N (novo gasto), Ctrl+S (salvar), ← → (mês), 1 a 5 (abas), O (ocultar valores), T (tema) e ? (lista de atalhos).

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
- **Lembrete de vencimento por e-mail:** o arquivo `vercel.json` agenda uma chamada diária (8h no horário de Brasília) a `/api/cron/lembretes`. Crie na Vercel a variável `CRON_SECRET` (qualquer texto longo e aleatório): a Vercel a envia no cabeçalho da chamada e a rota recusa quem não a tiver. Sem a variável, o lembrete simplesmente não roda.
- Aplique as migrações no banco de produção com `npx prisma migrate deploy`. Se o banco já tiver usuários antigos (sem e-mail), a migração `email_e_tokens` precisa de ajuste, porque a coluna `email` é obrigatória.

## Instalar no iPhone

O app precisa estar publicado em um endereço `https://` (ex.: o da Vercel). Depois:

1. Abra o endereço no **Safari** (tem de ser o Safari, não o Chrome).
2. Toque no botão de compartilhar (quadrado com a seta para cima) e escolha **Adicionar à Tela de Início**.
3. O ícone azul do FluxoPay aparece na tela. Ele abre em tela cheia, sem a barra do Safari.

Observações: o app instalado tem login próprio (separado do Safari), então entre de novo nele; e é preciso internet para usar. O tema escuro e o "ocultar valores" ficam salvos no próprio aparelho.

## Onde mexer

| Para... | Edite |
|---|---|
| Trocar o nome do app | `lib/app.ts` |
| Mudar o limite de gastos (60%) | `LIMITE_GASTOS_PERCENT` em `lib/calculos.ts` |
| Adicionar um cartão | `lib/cartoes.ts` (e uma lista em `app/painel.tsx`) |
| Adicionar uma categoria | `lib/categorias.ts` |
| Mudar as contas do resumo | `lib/calculos.ts` e `lib/resumo-mes.ts` (têm testes em `tests/`) |
| Regras de vencimento | `lib/vencimentos.ts` |
| Cores, fontes e espaçamentos (claro e escuro) | variáveis no topo de `app/app.css` |
| Atalhos do teclado | `app/atalhos.tsx` (lista) e o efeito de teclado em `app/painel.tsx` |

## Testes

```bash
npm test
```

Cobrem os cálculos (saldo, limite, meta com juros), as parcelas, as contas fixas e seus vencimentos, as metas e a reserva, o resumo do ano, a busca e as validações.
