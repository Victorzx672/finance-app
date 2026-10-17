/** Rendimento mensal usado na projeção de investimentos (1% ao mês). */
export const TAXA_MENSAL = 0.01;

/** Limite do gráfico de projeção, em meses (5 anos). */
export const MAX_MESES_PROJECAO = 60;

/** Teto de gastos, em % da renda do mês. Para mudar o limite, altere só aqui. */
export const LIMITE_GASTOS_PERCENT = 60;

/** O aviso de "chegando perto" começa em 80% do limite (48% da renda, com limite de 60%). */
export const ATENCAO_FRACAO_DO_LIMITE = 0.8;

/** Arredonda para centavos, evitando sobras de ponto flutuante (0,1 + 0,2). */
export const arredondar = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Quanto da renda pode ser gasto no mês (ex.: 60% de R$ 5.000 = R$ 3.000). */
export const limiteDeGastos = (renda: number) =>
  arredondar((Math.max(0, renda) * LIMITE_GASTOS_PERCENT) / 100);

/** Passou do limite? Gastar exatamente o limite ainda é permitido. */
export const passouDoLimite = (renda: number, totalGastos: number) =>
  renda > 0 && arredondar(totalGastos) > limiteDeGastos(renda);

export type StatusLimite = "sem-renda" | "ok" | "atencao" | "excedido";

/** Soma os valores de uma lista (rendas, gastos...), já arredondada para centavos. */
export const somar = (itens: { valor: number }[]) =>
  arredondar(itens.reduce((acc, i) => acc + i.valor, 0));

/** Quanto se acumula aportando `aporte` por mês durante `meses`, com juros compostos. */
export const valorFuturo = (aporte: number, meses: number, taxa = TAXA_MENSAL) =>
  aporte * (((1 + taxa) ** meses - 1) / taxa);

/** Menor número de meses para o aporte mensal atingir a meta. 0 se não houver como. */
export function mesesAteMeta(aporte: number, meta: number, taxa = TAXA_MENSAL) {
  if (aporte <= 0 || meta <= 0) return 0;

  let n = Math.max(1, Math.ceil(Math.log(1 + (meta * taxa) / aporte) / Math.log(1 + taxa)));

  // Guarda contra erro de arredondamento no logaritmo
  while (valorFuturo(aporte, n, taxa) < meta) n++;
  while (n > 1 && valorFuturo(aporte, n - 1, taxa) >= meta) n--;

  return n;
}

export interface EntradaResumo {
  renda: number;
  gastosFixos: number;
  gastosVariaveis: number;
  /** Soma dos gastos detalhados (avulsos, cartão e parcelas do mês). */
  gastosDetalhados: number;
  percentualInvestimento: number;
  meta: number;
}

export function calcularResumo(e: EntradaResumo) {
  const totalGastos = arredondar(e.gastosFixos + e.gastosVariaveis + e.gastosDetalhados);
  const saldo = arredondar(e.renda - totalGastos);

  // Só se investe o que sobrou: saldo negativo não gera "investimento negativo"
  const investimento = arredondar(Math.max(0, saldo) * (e.percentualInvestimento / 100));
  const livre = arredondar(saldo - investimento);

  const percentGastos =
    e.renda > 0 ? Math.min((totalGastos / e.renda) * 100, 100) : totalGastos > 0 ? 100 : 0;

  const limiteGastos = limiteDeGastos(e.renda);
  const folgaLimite = arredondar(limiteGastos - totalGastos); // negativo = passou do limite

  const statusLimite: StatusLimite =
    e.renda <= 0
      ? "sem-renda"
      : passouDoLimite(e.renda, totalGastos)
      ? "excedido"
      : totalGastos >= limiteGastos * ATENCAO_FRACAO_DO_LIMITE
      ? "atencao"
      : "ok";

  return {
    totalGastos,
    saldo,
    investimento,
    livre,
    percentGastos,
    limiteGastos,
    folgaLimite,
    statusLimite,
    mesesParaMeta: mesesAteMeta(investimento, e.meta),
  };
}

/**
 * Junta os gastos por categoria (maior primeiro). Os gastos fixos e variáveis
 * "soltos" entram como linhas próprias; itens sem categoria viram "Sem categoria".
 */
export function agruparPorCategoria(
  itens: { valor: number; categoria?: string | null }[],
  gastosFixos = 0,
  gastosVariaveis = 0
) {
  const soma = new Map<string, number>();

  for (const i of itens) {
    const nome = i.categoria ?? "Sem categoria";
    soma.set(nome, (soma.get(nome) ?? 0) + i.valor);
  }

  return [
    ...(gastosFixos > 0 ? [{ nome: "Gastos fixos", valor: arredondar(gastosFixos) }] : []),
    ...(gastosVariaveis > 0 ? [{ nome: "Gastos variáveis", valor: arredondar(gastosVariaveis) }] : []),
    ...[...soma].map(([nome, valor]) => ({ nome, valor: arredondar(valor) })),
  ]
    .filter((l) => l.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

/** Pontos do gráfico: cobre pelo menos 12 meses e, se couber, o prazo da meta. */
export function serieProjecao(aporte: number, meta: number) {
  const prazo = mesesAteMeta(aporte, meta);
  const meses = Math.min(MAX_MESES_PROJECAO, Math.max(12, prazo));

  return Array.from({ length: meses }, (_, i) => ({
    mes: i + 1,
    valor: arredondar(valorFuturo(aporte, i + 1)),
  }));
}
