import { getUserIdFromSession } from "@/lib/auth";
import { erro, lerJson, naoAutorizado } from "@/lib/api";
import { apagarItem, buscarItem, pluggyConfigurada } from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";
import { sincronizarConexao } from "@/lib/servidor-banco";

/** Bancos conectados e compras do banco que ainda esperam o usuário decidir. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const [conexoes, pendentes] = await Promise.all([
    prisma.conexaoBanco.findMany({
      where: { userId },
      select: { id: true, nomeBanco: true, status: true, ultimaSync: true },
      orderBy: { id: "asc" },
    }),
    prisma.transacaoBanco.findMany({
      where: { userId, estado: "pendente" },
      select: { id: true, descricao: true, valor: true, data: true, cartao: true, categoriaBanco: true },
      orderBy: { data: "desc" },
      take: 300,
    }),
  ]);

  return Response.json({ configurado: pluggyConfigurada(), conexoes, pendentes });
}

/** Registra o banco que o usuário acabou de conectar no widget e já busca as compras. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();
  if (!pluggyConfigurada()) return erro("A conexão com bancos não está configurada.", 503);

  const b = await lerJson(req);
  const itemId = b?.itemId;
  if (typeof itemId !== "string" || !/^[\w-]{1,64}$/.test(itemId)) return erro("itemId inválido");

  // Confere na Pluggy que esse item foi criado por este usuário (o widget manda o id dele)
  const item = await buscarItem(itemId).catch(() => null);
  if (!item || item.clientUserId !== String(userId)) return erro("Conexão não encontrada.", 404);

  const conexao = await prisma.conexaoBanco.upsert({
    where: { itemId },
    update: {},
    create: { itemId, userId, nomeBanco: item.connector.name, status: item.status },
  });

  if (conexao.userId !== userId) return erro("Conexão não encontrada.", 404);

  const r = await sincronizarConexao(conexao).catch((e) => {
    console.error("ERRO AO SINCRONIZAR BANCO:", e);
    return { novas: 0, importando: true };
  });

  return Response.json({ success: true, ...r });
}

/**
 * Desconecta o banco: apaga o item na Pluggy (revoga o acesso) e as compras pendentes dele.
 * As já adicionadas ou ignoradas ficam (sem conexão), para não voltarem se o banco for reconectado.
 */
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return erro("id inválido");

  const conexao = await prisma.conexaoBanco.findFirst({ where: { id, userId } });
  if (!conexao) return erro("Conexão não encontrada.", 404);

  await apagarItem(conexao.itemId).catch((e) => console.error("ERRO AO APAGAR ITEM DA PLUGGY:", e));
  await prisma.$transaction([
    prisma.transacaoBanco.deleteMany({ where: { conexaoId: conexao.id, estado: "pendente" } }),
    prisma.conexaoBanco.delete({ where: { id: conexao.id } }),
  ]);

  return Response.json({ success: true });
}
