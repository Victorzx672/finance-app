import { chaveCompra, inicioDaBusca, transacaoParaCompra } from "@/lib/banco";
import { buscarContas, buscarItem, buscarTransacoes } from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";

/**
 * Busca na Pluggy as transações novas de uma conexão e guarda as compras como pendentes.
 * As repetidas são ignoradas pelo id da Pluggy e, quando o banco foi reconectado (ids novos),
 * pelo dia + valor + descrição das compras que o usuário já tinha decidido.
 * Devolve quantas compras novas entraram e se o banco ainda está enviando dados.
 */
export async function sincronizarConexao(conexao: { id: number; itemId: string; userId: number; ultimaSync: Date | null }) {
  const agora = new Date();
  const [item, contas] = await Promise.all([buscarItem(conexao.itemId), buscarContas(conexao.itemId)]);
  const desde = inicioDaBusca(conexao.ultimaSync, agora);

  const decididas = await prisma.transacaoBanco.findMany({
    where: {
      userId: conexao.userId,
      OR: [{ conexaoId: null }, { conexaoId: { not: conexao.id } }],
      data: { gte: new Date(`${desde}T00:00:00Z`) },
    },
    select: { data: true, valor: true, descricao: true },
  });
  const jaVistas = new Set(decididas.map(chaveCompra));

  let novas = 0;

  for (const conta of contas) {
    const compras = (await buscarTransacoes(conta.id, desde))
      .map((t) => transacaoParaCompra(t, conta.type === "CREDIT"))
      .filter((c) => c !== null && !jaVistas.has(chaveCompra(c)));

    if (compras.length === 0) continue;

    const r = await prisma.transacaoBanco.createMany({
      data: compras.map((c) => ({ ...c!, conexaoId: conexao.id, userId: conexao.userId })),
      skipDuplicates: true,
    });

    novas += r.count;
  }

  await prisma.conexaoBanco.update({
    where: { id: conexao.id },
    data: { status: item.status, nomeBanco: item.connector.name, ultimaSync: agora },
  });

  return { novas, importando: item.status === "UPDATING" };
}
