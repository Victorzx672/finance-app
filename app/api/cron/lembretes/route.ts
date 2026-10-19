import { enviarLembreteVencimentos } from "@/lib/email-resumos";
import { chaveMes } from "@/lib/meses";
import { numeroDaParcela } from "@/lib/parcelas";
import { hojeEmBrasilia, lembretesDoDia } from "@/lib/lembretes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Roda todo dia (ver vercel.json) e manda um e-mail a quem tem conta ou fatura vencendo
 * hoje ou amanhã. A Vercel chama com "Authorization: Bearer <CRON_SECRET>"; sem esse
 * segredo configurado, ou com outro valor, a rota recusa.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;

  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const hoje = hojeEmBrasilia();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const meses = [...new Set([chaveMes(hoje), chaveMes(amanha)])];

  const usuarios = await prisma.user.findMany({
    where: { lembreteEmail: true, emailVerificado: { not: null } },
    select: { id: true, email: true, usuario: true, cartoes: true },
  });

  let enviados = 0;
  let falhas = 0;

  for (const user of usuarios) {
    try {
      const [contas, pagamentos, parcelamentos] = await Promise.all([
        prisma.contaFixa.findMany({ where: { userId: user.id } }),
        prisma.pagamento.findMany({ where: { userId: user.id, mes: { in: meses } } }),
        prisma.parcelamento.findMany({ where: { userId: user.id } }),
      ]);

      const config = (user.cartoes ?? {}) as Record<string, { vencimento?: number | null }>;

      // fatura de cada cartão em cada mês = compras salvas no mês + parcelas que caem nele
      const cartoes = Object.entries(config).map(([nome, c]) => {
        const faturaPorMes: Record<string, number> = {};

        for (const mes of meses) {
          const parcelas = parcelamentos
            .filter((p) => p.cartao === nome && numeroDaParcela(p, mes))
            .reduce((acc, p) => acc + p.valorParcela, 0);

          faturaPorMes[mes] = parcelas;
        }

        return { nome, vencimento: c.vencimento ?? null, faturaPorMes };
      });

      // soma as compras salvas em cada mês (por cartão)
      for (const mes of meses) {
        const porMes = await prisma.expense.groupBy({
          by: ["cartao"],
          where: { cartao: { not: null }, finance: { userId: user.id, mesReferencia: mes } },
          _sum: { valor: true },
        });

        for (const linha of porMes) {
          const cartao = cartoes.find((c) => c.nome === linha.cartao);
          if (cartao) cartao.faturaPorMes[mes] += linha._sum.valor ?? 0;
        }
      }

      const itens = lembretesDoDia({ hoje, contas, pagamentos, cartoes });

      if (itens.length > 0) {
        await enviarLembreteVencimentos(user.email, user.usuario, itens);
        enviados++;
      }
    } catch (e) {
      falhas++;
      console.error("ERRO NO LEMBRETE DE VENCIMENTO:", user.id, e);
    }
  }

  return Response.json({ usuarios: usuarios.length, enviados, falhas });
}
