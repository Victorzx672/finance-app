import { getUserIdFromSession } from "@/lib/auth";
import { erro, naoAutorizado } from "@/lib/api";
import { criarConnectToken, pluggyConfigurada } from "@/lib/pluggy";

/**
 * Token para abrir o widget da Pluggy no navegador. Se o site tiver endereço https e
 * PLUGGY_WEBHOOK_SECRET, a Pluggy avisa o webhook quando chegarem compras novas.
 */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();
  if (!pluggyConfigurada()) return erro("A conexão com bancos não está configurada.", 503);

  const base = process.env.NEXTAUTH_URL ?? "";
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;
  const webhookUrl =
    base.startsWith("https://") && segredo
      ? `${base.replace(/\/$/, "")}/api/banco/webhook?token=${encodeURIComponent(segredo)}`
      : undefined;

  try {
    return Response.json({ accessToken: await criarConnectToken(String(userId), webhookUrl) });
  } catch (e) {
    console.error("ERRO AO CRIAR CONNECT TOKEN:", e);
    return erro("Não foi possível falar com a Pluggy agora.", 502);
  }
}
