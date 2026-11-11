import { getUserIdFromSession } from "@/lib/auth";
import { erro, lerJson, naoAutorizado } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Marca compras do banco como adicionadas ao mês ("importada") ou descartadas ("ignorada"). */
export async function PUT(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const b = await lerJson(req);
  if (!b) return erro("JSON inválido");

  const { ids, estado } = b;

  if (estado !== "importada" && estado !== "ignorada") return erro("estado inválido");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 300 || !ids.every(Number.isInteger)) {
    return erro("ids inválidos");
  }

  await prisma.transacaoBanco.updateMany({ where: { id: { in: ids }, userId }, data: { estado } });

  return Response.json({ success: true });
}
