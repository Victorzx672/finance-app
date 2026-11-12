import { getUserIdFromSession } from "@/lib/auth";
import { erro, lerJson, naoAutorizado } from "@/lib/api";
import { somar } from "@/lib/calculos";
import { prepararProximoMes, temAlgoParaCopiar } from "@/lib/fechamento";
import { MES_REGEX, somarMes } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { contasDoMes } from "@/lib/resumo-mes";

/**
 * Conclui o mês: ele para de aceitar alterações (até ser reaberto) e o mês seguinte, se
 * ainda não tem nada salvo, já nasce com a renda avulsa, as estimativas e a % para
 * investir deste (veja prepararProximoMes). Concluir de novo não muda a data.
 */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  const mes = b?.mes;
  if (typeof mes !== "string" || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  const proximo = somarMes(mes, 1);
  const rendasFixas = await prisma.rendaFixa.findMany({ where: { userId } });

  const resultado = await prisma.$transaction(async (tx) => {
    // Mês que nunca foi salvo (só contas fixas e parcelas, por exemplo) também pode ser concluído
    const atual = await tx.financeData.upsert({
      where: { userId_mesReferencia: { userId, mesReferencia: mes } },
      update: {},
      create: { userId, mesReferencia: mes },
      include: { rendas: { orderBy: { id: "asc" } } },
    });

    const concluidoEm =
      atual.concluidoEm ??
      (await tx.financeData.update({ where: { id: atual.id }, data: { concluidoEm: new Date() } })).concluidoEm;

    const jaExiste = await tx.financeData.findUnique({
      where: { userId_mesReferencia: { userId, mesReferencia: proximo } },
      select: { id: true },
    });

    if (jaExiste) return { concluidoEm, preparado: false };

    const base = prepararProximoMes(atual, contasDoMes(rendasFixas, proximo).length > 0);
    if (!temAlgoParaCopiar(base)) return { concluidoEm, preparado: false };

    await tx.financeData.create({
      data: {
        userId,
        mesReferencia: proximo,
        renda: somar(base.rendas),
        gastosFixos: base.gastosFixos,
        gastosVariaveis: base.gastosVariaveis,
        percentualInvestimento: base.percentualInvestimento,
        rendas: { create: base.rendas },
      },
    });

    return { concluidoEm, preparado: true };
  });

  return Response.json({ success: true, proximo, ...resultado });
}

/** Reabre o mês para edição. O mês seguinte continua como está. */
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const mes = new URL(req.url).searchParams.get("mes");
  if (!mes || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");

  await prisma.financeData.updateMany({ where: { userId, mesReferencia: mes }, data: { concluidoEm: null } });

  return Response.json({ success: true });
}
