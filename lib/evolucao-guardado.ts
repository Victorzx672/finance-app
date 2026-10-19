import { somarMes } from "@/lib/parcelas";

export interface SaldoMes {
  mes: string;
  total: number;
}

/**
 * Série do total guardado mês a mês, do primeiro mês registrado até o mês atual.
 * Os meses sem registro repetem o último valor (o dinheiro continua guardado).
 */
export function serieGuardado(saldos: SaldoMes[], mesAtual: string): SaldoMes[] {
  if (saldos.length === 0) return [];

  const ordenados = [...saldos].sort((a, b) => a.mes.localeCompare(b.mes));
  const porMes = new Map(ordenados.map((s) => [s.mes, s.total]));
  const saida: SaldoMes[] = [];

  let ultimo = ordenados[0].total;
  let mes = ordenados[0].mes;

  // trava de segurança: no máximo 10 anos
  for (let i = 0; i < 120 && mes <= mesAtual; i++) {
    ultimo = porMes.get(mes) ?? ultimo;
    saida.push({ mes, total: ultimo });
    mes = somarMes(mes, 1);
  }

  return saida;
}

/** Quanto o total guardado cresceu (ou caiu) do primeiro ao último ponto da série. */
export const variacaoGuardado = (serie: SaldoMes[]) =>
  serie.length < 2 ? 0 : Math.round((serie[serie.length - 1].total - serie[0].total) * 100) / 100;
