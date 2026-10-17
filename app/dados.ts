import { agruparPorCategoria, somar } from "@/lib/calculos";
import type { ConfigCartao } from "@/lib/cartoes";
import type { MetaDinheiro } from "@/lib/metas";
import type { FonteRenda } from "./fontes-renda";
import type { Gasto } from "./ui";

// Leitura de dados da API, sem estado. Cada função devolve um valor padrão
// seguro se a requisição falhar (exceto buscarFinanca, que devolve null).

export interface HistoricoMes {
  id: number;
  mesReferencia: string;
  renda: number;
  saldo: number;
  totalGastos: number;
}

export interface FinancaDoMes {
  finance: {
    renda: number;
    gastosFixos: number;
    gastosVariaveis: number;
    percentualInvestimento: number;
    meta: number;
  } | null;
  gastos: Gasto[];
  rendas: FonteRenda[];
}

interface ParcelaApi {
  id: string;
  parcelamentoId: number;
  nome: string;
  valor: number;
  cartao: string | null;
  categoria: string | null;
  numero: number;
  total: number;
}

/** Devolve null se a leitura falhar (para o salvamento não gravar zeros por cima). */
export async function buscarFinanca(mes: string): Promise<FinancaDoMes | null> {
  try {
    const res = await fetch(`/api/finance?mes=${mes}`);
    if (!res.ok) return null;

    const data = await res.json();

    return {
      finance: data.finance ?? null,
      gastos: data.gastos ?? [],
      rendas: (data.rendas ?? []).map((r: FonteRenda) => ({ id: r.id, nome: r.nome, valor: r.valor })),
    };
  } catch {
    return null;
  }
}

export async function buscarHistorico(): Promise<HistoricoMes[]> {
  try {
    const res = await fetch("/api/finance/history");
    if (!res.ok) return [];

    const data = await res.json();
    return data.historico ?? [];
  } catch {
    return [];
  }
}

export async function buscarParcelas(mes: string): Promise<Gasto[]> {
  try {
    const res = await fetch(`/api/parcelamentos?mes=${mes}`);
    if (!res.ok) return [];

    const data = await res.json();

    return (data.parcelas ?? []).map((p: ParcelaApi) => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor,
      cartao: p.cartao,
      categoria: p.categoria,
      parcela: { numero: p.numero, total: p.total, parcelamentoId: p.parcelamentoId },
    }));
  } catch {
    return [];
  }
}

// ─── Contas fixas, metas, preferências e comparativo ──────────────────────────

export interface ContaFixaItem {
  id: number;
  nome: string;
  valor: number;
  /** dia do vencimento (1 a 31) */
  dia: number;
  categoria: string | null;
  mesInicio: string;
}

/** Contas fixas que valem no mês + as chaves já pagas ("conta:3", "fatura:Nubank"). */
export async function buscarContas(mes: string): Promise<{ contas: ContaFixaItem[]; pagos: string[] }> {
  try {
    const res = await fetch(`/api/contas-fixas?mes=${mes}`);
    if (!res.ok) return { contas: [], pagos: [] };

    const data = await res.json();
    return { contas: data.contas ?? [], pagos: data.pagos ?? [] };
  } catch {
    return { contas: [], pagos: [] };
  }
}

export async function buscarMetas(): Promise<MetaDinheiro[]> {
  try {
    const res = await fetch("/api/metas");
    if (!res.ok) return [];

    const data = await res.json();
    return data.metas ?? [];
  } catch {
    return [];
  }
}

export interface Preferencias {
  alertaEmail: boolean;
  orcamentos: Record<string, number>;
  cartoes: Record<string, ConfigCartao>;
}

export const PREFERENCIAS_PADRAO: Preferencias = { alertaEmail: true, orcamentos: {}, cartoes: {} };

export async function buscarPreferencias(): Promise<Preferencias> {
  try {
    const res = await fetch("/api/preferencias");
    if (!res.ok) return PREFERENCIAS_PADRAO;

    return { ...PREFERENCIAS_PADRAO, ...(await res.json()) };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export interface GastosDoMes {
  total: number;
  linhas: { nome: string; valor: number }[];
}

/** Total e categorias de um mês (para comparar com o atual). Null se o mês não tem dados. */
export async function buscarGastosDoMes(mes: string): Promise<GastosDoMes | null> {
  const [financa, parcelas, { contas }] = await Promise.all([
    buscarFinanca(mes),
    buscarParcelas(mes),
    buscarContas(mes),
  ]);

  if (!financa?.finance) return null;

  const itens = [...financa.gastos, ...parcelas, ...contas];
  const fixos = financa.finance.gastosFixos;
  const variaveis = financa.finance.gastosVariaveis;

  return {
    total: somar([{ valor: fixos }, { valor: variaveis }, ...itens]),
    linhas: agruparPorCategoria(itens, fixos, variaveis),
  };
}
