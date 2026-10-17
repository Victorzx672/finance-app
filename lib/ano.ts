import { arredondar, passouDoLimite } from "@/lib/calculos";

export interface MesHistorico {
  mesReferencia: string;
  renda: number;
  totalGastos: number;
  saldo: number;
}

/** Anos que têm algum mês salvo (mais recente primeiro), sempre incluindo o atual. */
export function anosDisponiveis(historico: MesHistorico[], anoAtual: number) {
  const anos = new Set(historico.map((h) => Number(h.mesReferencia.slice(0, 4))));
  anos.add(anoAtual);

  return [...anos].sort((a, b) => b - a);
}

export function resumoDoAno(historico: MesHistorico[], ano: number) {
  const meses = historico
    .filter((h) => h.mesReferencia.startsWith(`${ano}-`))
    .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));

  const rendaTotal = arredondar(meses.reduce((acc, m) => acc + m.renda, 0));
  const gastosTotal = arredondar(meses.reduce((acc, m) => acc + m.totalGastos, 0));

  const mesMaisCaro = meses.reduce<MesHistorico | null>(
    (maior, m) => (maior === null || m.totalGastos > maior.totalGastos ? m : maior),
    null
  );

  return {
    meses,
    rendaTotal,
    gastosTotal,
    saldoTotal: arredondar(rendaTotal - gastosTotal),
    mediaGastos: meses.length > 0 ? arredondar(gastosTotal / meses.length) : 0,
    mesMaisCaro,
    mesesAcimaDoLimite: meses.filter((m) => passouDoLimite(m.renda, m.totalGastos)).length,
    percentualMedio: rendaTotal > 0 ? (gastosTotal / rendaTotal) * 100 : 0,
  };
}
