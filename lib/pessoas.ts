import { arredondar } from "@/lib/calculos";

/** Quantas pessoas podem dividir as contas e os gastos. */
export const MAX_PESSOAS = 4;
export const MAX_NOME_PESSOA = 30;

/** Rótulo dos gastos em que ninguém foi marcado. */
export const SEM_PESSOA = "Sem pessoa marcada";

/** Limpa a lista de pessoas: tira espaços e repetidos (sem diferenciar maiúsculas) e corta no máximo. */
export function limparPessoas(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [];

  const vistos = new Set<string>();
  const saida: string[] = [];

  for (const item of bruto) {
    if (typeof item !== "string") continue;

    const nome = item.trim();
    const chave = nome.toLocaleLowerCase("pt-BR");

    if (!nome || nome.length > MAX_NOME_PESSOA || vistos.has(chave)) continue;

    vistos.add(chave);
    saida.push(nome);
  }

  return saida.slice(0, MAX_PESSOAS);
}

export interface LinhaPessoa {
  nome: string;
  valor: number;
  /** % do total gasto */
  percentual: number;
}

/**
 * Quanto cada pessoa gastou (compras do cartão e avulsas, parcelas incluídas).
 * Quem não foi marcado entra em "Sem pessoa marcada" só se houver valor.
 */
export function gastosPorPessoa(itens: { valor: number; pessoa?: string | null }[], pessoas: string[]): LinhaPessoa[] {
  const total = itens.reduce((acc, g) => acc + g.valor, 0);

  const soma = (filtro: (p: string | null | undefined) => boolean) =>
    arredondar(itens.filter((g) => filtro(g.pessoa)).reduce((acc, g) => acc + g.valor, 0));

  const linhas = pessoas.map((nome) => ({ nome, valor: soma((p) => p === nome) }));
  const semMarca = soma((p) => !p || !pessoas.includes(p));

  if (semMarca > 0) linhas.push({ nome: SEM_PESSOA, valor: semMarca });

  return linhas.map((l) => ({ ...l, percentual: total > 0 ? (l.valor / total) * 100 : 0 }));
}
