// O que é enviado ao servidor ao salvar um mês. Também serve para saber se há
// alterações não salvas: compara-se o conteúdo atual com o do último salvamento.

export interface RendaDoMes {
  nome: string;
  valor: number;
}

export interface GastoDoMes {
  nome: string;
  valor: number;
  cartao?: string | null;
  categoria?: string | null;
  dia?: number | null;
}

export interface DadosDoMes {
  mes: string;
  rendas: RendaDoMes[];
  gastosFixos: number;
  gastosVariaveis: number;
  percentualInvestimento: number;
  gastos: GastoDoMes[];
}

/**
 * Normaliza os dados do mês. Linhas de renda em branco ficam de fora, renda sem
 * nome vira "Renda" e campos opcionais ausentes viram null, para que o mesmo
 * conteúdo gere sempre o mesmo resultado (ids e campos extras não contam).
 */
export function montarPayloadMes(d: DadosDoMes) {
  return {
    mes: d.mes,
    rendas: d.rendas
      .filter((r) => r.valor > 0)
      .map((r) => ({ nome: r.nome.trim() || "Renda", valor: r.valor })),
    gastosFixos: d.gastosFixos,
    gastosVariaveis: d.gastosVariaveis,
    percentualInvestimento: d.percentualInvestimento,
    gastos: d.gastos.map((g) => ({
      nome: g.nome,
      valor: g.valor,
      cartao: g.cartao ?? null,
      categoria: g.categoria ?? null,
      dia: g.dia ?? null,
    })),
  };
}

export const serializarMes = (d: DadosDoMes) => JSON.stringify(montarPayloadMes(d));
