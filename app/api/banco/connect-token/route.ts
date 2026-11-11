import { getUserIdFromSession } from "@/lib/auth";
import { erro, naoAutorizado } from "@/lib/api";
import { criarConnectToken, pluggyConfigurada } from "@/lib/pluggy";

/**
 * Token para abrir o widget da Pluggy no navegador. Não leva o endereço do webhook: o token
 * chega ao navegador, então o webhook (com o segredo num cabeçalho) é cadastrado uma vez só,
 * direto na Pluggy, pelo scripts/registrar-webhook.mjs.
 */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return naoAutorizado();
  if (!pluggyConfigurada()) return erro("A conexão com bancos não está configurada.", 503);

  try {
    return Response.json({ accessToken: await criarConnectToken(String(userId)) });
  } catch (e) {
    console.error("ERRO AO CRIAR CONNECT TOKEN:", e);
    return erro("Não foi possível falar com a Pluggy agora.", 502);
  }
}
