import { getUserIdFromSession } from "@/lib/auth";
import { erro, lerJson, naoAutorizado } from "@/lib/api";
import { cartaoValido } from "@/lib/cartoes";
import { MES_REGEX } from "@/lib/parcelas";
import { prisma } from "@/lib/prisma";
import { contaAtiva } from "@/lib/resumo-mes";

/** Marca ou desmarca "pago" para uma conta fixa ou para a fatura do cartão em um mês. */
export async function PUT(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const { chave, mes, pago } = b;

  if (typeof chave !== "string") return erro("chave inválida");
  if (typeof mes !== "string" || !MES_REGEX.test(mes)) return erro("mes inválido (use AAAA-MM)");
  if (typeof pago !== "boolean") return erro("pago deve ser verdadeiro ou falso");

  const [tipo, alvo] = chave.split(":");

  if (tipo === "conta") {
    const conta = await prisma.contaFixa.findFirst({ where: { id: Number(alvo), userId } });
    if (!conta || !contaAtiva(conta, mes)) return erro("Conta não encontrada neste mês.", 404);
  } else if (tipo === "fatura") {
    if (!cartaoValido(alvo)) return erro("Cartão inválido.");
  } else {
    return erro("chave inválida");
  }

  if (pago) {
    await prisma.pagamento.upsert({
      where: { userId_chave_mes: { userId, chave, mes } },
      update: {},
      create: { userId, chave, mes },
    });
  } else {
    await prisma.pagamento.deleteMany({ where: { userId, chave, mes } });
  }

  return Response.json({ success: true });
}
