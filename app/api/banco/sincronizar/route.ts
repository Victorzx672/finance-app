import { getUserIdFromSession } from "@/lib/auth";
import { erro, naoAutorizado } from "@/lib/api";
import { pluggyConfigurada } from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";
import { sincronizarConexao } from "@/lib/servidor-banco";

/** Botão "Atualizar": busca agora as compras novas de todos os bancos do usuário. */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();
  if (!pluggyConfigurada()) return erro("A conexão com bancos não está configurada.", 503);

  const conexoes = await prisma.conexaoBanco.findMany({ where: { userId } });
  let novas = 0;
  let falhas = 0;

  for (const c of conexoes) {
    try {
      novas += (await sincronizarConexao(c)).novas;
    } catch (e) {
      falhas++;
      console.error("ERRO AO SINCRONIZAR BANCO:", c.id, e);
    }
  }

  if (falhas > 0 && falhas === conexoes.length) return erro("Não foi possível falar com o banco agora.", 502);

  return Response.json({ success: true, novas });
}
