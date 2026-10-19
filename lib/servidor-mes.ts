import { agruparPorCategoria, limiteDeGastos } from "@/lib/calculos";
import { enviarAlertaLimite } from "@/lib/email-resumos";
import { labelMes } from "@/lib/meses";
import { prisma } from "@/lib/prisma";
import { contasDoMes, parcelasDoMes, resumoDoMes, type MesSalvo } from "@/lib/resumo-mes";

/**
 * Carrega e soma tudo de um mês (gastos, parcelas, contas fixas), com a mesma conta da tela.
 * Só roda no servidor (usa o banco).
 */
export async function carregarResumoMes(userId: number, mes: string) {
  const [finance, parcelamentos, contas, rendasFixas] = await Promise.all([
    prisma.financeData.findUnique({
      where: { userId_mesReferencia: { userId, mesReferencia: mes } },
      include: { gastos: true },
    }),
    prisma.parcelamento.findMany({ where: { userId } }),
    prisma.contaFixa.findMany({ where: { userId } }),
    prisma.rendaFixa.findMany({ where: { userId } }),
  ]);

  const base: MesSalvo = finance ?? {
    mesReferencia: mes,
    renda: 0,
    gastosFixos: 0,
    gastosVariaveis: 0,
    percentualInvestimento: 0,
    gastos: [],
  };

  const resumo = resumoDoMes(base, parcelamentos, contas, rendasFixas);

  const itens = [
    ...(finance?.gastos ?? []).map((g) => ({ valor: g.valor, categoria: g.categoria })),
    ...parcelasDoMes(parcelamentos, mes).map((p) => ({ valor: p.valorParcela, categoria: p.categoria })),
    ...contasDoMes(contas, mes).map((c) => ({ valor: c.valor, categoria: c.categoria })),
  ];

  return {
    finance,
    resumo,
    categorias: agruparPorCategoria(itens, base.gastosFixos, base.gastosVariaveis),
  };
}

/**
 * Manda o alerta de "passou do limite" uma vez por mês (se o usuário não desligou).
 * Se voltar a ficar dentro do limite, libera um novo alerta. Nunca lança erro.
 */
export async function verificarAlertaLimite(userId: number, mes: string) {
  try {
    const [user, { finance, resumo }] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, usuario: true, alertaEmail: true },
      }),
      carregarResumoMes(userId, mes),
    ]);

    if (!user || !finance) return;

    const excedido = resumo.statusLimite === "excedido";

    if (excedido && !finance.alertaEnviado && user.alertaEmail) {
      await enviarAlertaLimite(user.email, user.usuario, {
        mesLabel: labelMes(mes),
        renda: resumo.renda,
        totalGastos: resumo.totalGastos,
        limite: limiteDeGastos(resumo.renda),
      });

      await prisma.financeData.update({ where: { id: finance.id }, data: { alertaEnviado: true } });
    } else if (!excedido && finance.alertaEnviado) {
      await prisma.financeData.update({ where: { id: finance.id }, data: { alertaEnviado: false } });
    }
  } catch (e) {
    console.error("ERRO NO ALERTA DE LIMITE:", e);
  }
}
