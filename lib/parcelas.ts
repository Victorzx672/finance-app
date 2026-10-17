export const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const MAX_PARCELAS = 60;

const indice = (mes: string) => {
  const [ano, m] = mes.split("-").map(Number);
  return ano * 12 + (m - 1);
};

/** Soma (ou subtrai) meses a um "AAAA-MM". */
export function somarMes(mes: string, delta: number) {
  const i = indice(mes) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** Número da parcela (1..total) que cai em `mes`, ou null se não cai nesse mês. */
export function numeroDaParcela(
  p: { mesInicio: string; totalParcelas: number },
  mes: string
) {
  const n = indice(mes) - indice(p.mesInicio) + 1;
  return n >= 1 && n <= p.totalParcelas ? n : null;
}
