import { calcularResumo, somar } from "@/lib/calculos";
import { numeroDaParcela } from "@/lib/parcelas";

// Soma tudo que compõe os gastos de um mês, igual na tela, no histórico, no e-mail e no CSV.

export interface ContaFixaMes {
  valor: number;
  mesInicio: string;
  mesFim: string | null;
}

export interface ParcelamentoMes {
  valorParcela: number;
  mesInicio: string;
  totalParcelas: number;
}

export interface MesSalvo {
  mesReferencia: string;
  renda: number;
  gastosFixos: number;
  gastosVariaveis: number;
  percentualInvestimento: number;
  gastos: { valor: number }[];
}

/** A conta vale neste mês? ("AAAA-MM" compara certo como texto) */
export const contaAtiva = (c: { mesInicio: string; mesFim: string | null }, mes: string) =>
  c.mesInicio <= mes && (c.mesFim === null || c.mesFim >= mes);

export const contasDoMes = <T extends { mesInicio: string; mesFim: string | null }>(contas: T[], mes: string) =>
  contas.filter((c) => contaAtiva(c, mes));

export const parcelasDoMes = <T extends { mesInicio: string; totalParcelas: number }>(
  parcelamentos: T[],
  mes: string
) => parcelamentos.filter((p) => numeroDaParcela(p, mes));

export function resumoDoMes(
  m: MesSalvo,
  parcelamentos: ParcelamentoMes[],
  contas: ContaFixaMes[]
) {
  const contasFixas = somar(contasDoMes(contas, m.mesReferencia));
  const parcelas = parcelasDoMes(parcelamentos, m.mesReferencia).reduce((acc, p) => acc + p.valorParcela, 0);

  return calcularResumo({
    renda: m.renda,
    gastosFixos: m.gastosFixos + contasFixas,
    gastosVariaveis: m.gastosVariaveis,
    gastosDetalhados: somar(m.gastos) + parcelas,
    percentualInvestimento: m.percentualInvestimento,
    meta: 0,
  });
}
