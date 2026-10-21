import { adivinharCategoria, categoriasAprendidas, normalizar } from "@/lib/fatura";

// Sugestões ao lançar uma compra, a partir do nome e do que já foi lançado antes.

export interface CompraConhecida {
  nome: string;
  categoria?: string | null;
  pessoa?: string | null;
}

/**
 * Categoria e pessoa sugeridas para o nome digitado: a categoria vem do que já foi usado
 * para esse nome ou das palavras-chave ("ifood" -> Mercado); a pessoa, da última compra
 * com o mesmo nome. Sem pista, null.
 */
export function sugerirPeloNome(nome: string, historico: CompraConhecida[]) {
  const n = normalizar(nome.trim());
  if (!n) return { categoria: null, pessoa: null };

  const anterior = [...historico].reverse().find((h) => h.pessoa && normalizar(h.nome.trim()) === n);

  return {
    categoria: adivinharCategoria(nome, null, categoriasAprendidas(historico)),
    pessoa: anterior?.pessoa ?? null,
  };
}

/** Nomes já usados (sem repetir, os mais recentes primeiro), para o autocompletar. */
export function nomesConhecidos(historico: CompraConhecida[], maximo = 40) {
  const vistos = new Set<string>();
  const nomes: string[] = [];

  for (const h of [...historico].reverse()) {
    const chave = normalizar(h.nome.trim());
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(h.nome.trim());
    if (nomes.length >= maximo) break;
  }

  return nomes;
}
