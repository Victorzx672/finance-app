// Cliente da API da Pluggy (Open Finance). Só roda no servidor: usa PLUGGY_CLIENT_ID e
// PLUGGY_CLIENT_SECRET, que nunca podem ir para o navegador.

const API = "https://api.pluggy.ai";

export interface ItemPluggy {
  id: string;
  status: string;
  clientUserId: string | null;
  connector: { name: string };
}

export interface ContaPluggy {
  id: string;
  type: "BANK" | "CREDIT";
  name: string;
}

export interface TransacaoPluggy {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "DEBIT" | "CREDIT";
  status?: "PENDING" | "POSTED";
  category: string | null;
}

export const pluggyConfigurada = () => !!process.env.PLUGGY_CLIENT_ID && !!process.env.PLUGGY_CLIENT_SECRET;

// A API key da Pluggy vale 2 horas; guardamos por 1h50 para não pedir uma a cada chamada.
let cache: { chave: string; expira: number } | null = null;

async function apiKey() {
  if (cache && cache.expira > Date.now()) return cache.chave;

  const res = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: process.env.PLUGGY_CLIENT_ID, clientSecret: process.env.PLUGGY_CLIENT_SECRET }),
  });

  if (!res.ok) throw new Error(`Pluggy /auth respondeu ${res.status}`);

  const { apiKey: chave } = (await res.json()) as { apiKey: string };
  cache = { chave, expira: Date.now() + 110 * 60_000 };
  return chave;
}

async function pluggy<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${caminho}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-KEY": await apiKey(), ...init.headers },
  });

  if (!res.ok) throw new Error(`Pluggy ${caminho} respondeu ${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Token de uso único que o widget (Pluggy Connect) usa no navegador. */
export async function criarConnectToken(clientUserId: string, webhookUrl?: string) {
  const r = await pluggy<{ accessToken: string }>("/connect_token", {
    method: "POST",
    body: JSON.stringify({ options: { clientUserId, ...(webhookUrl && { webhookUrl }) } }),
  });

  return r.accessToken;
}

export const buscarItem = (itemId: string) => pluggy<ItemPluggy>(`/items/${encodeURIComponent(itemId)}`);

export const apagarItem = (itemId: string) => pluggy<void>(`/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });

export async function buscarContas(itemId: string) {
  const r = await pluggy<{ results: ContaPluggy[] }>(`/accounts?itemId=${encodeURIComponent(itemId)}`);
  return r.results;
}

/** Todas as transações da conta a partir de uma data ("AAAA-MM-DD"), página por página. */
export async function buscarTransacoes(accountId: string, desde: string) {
  const todas: TransacaoPluggy[] = [];

  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await pluggy<{ results: TransacaoPluggy[]; totalPages: number }>(
      `/transactions?accountId=${encodeURIComponent(accountId)}&from=${desde}&pageSize=500&page=${pagina}`
    );

    todas.push(...r.results);
    if (pagina >= r.totalPages) break;
  }

  return todas;
}
