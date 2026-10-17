/** Quantos dias antes do vencimento a conta passa a pedir atenção. */
export const DIAS_AVISO = 3;

export type SituacaoConta = "paga" | "atrasada" | "hoje" | "em-breve" | "futura";

export const ultimoDiaDoMes = (mes: string) => {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(ano, m, 0).getDate();
};

/** Dia 31 em fevereiro vence no último dia do mês (28 ou 29). */
export const diaEfetivo = (dia: number, mes: string) => Math.min(dia, ultimoDiaDoMes(mes));

/** Dias entre hoje e o vencimento no mês dado. Negativo = já passou. */
export function diasAteVencimento(dia: number, mes: string, hoje = new Date()) {
  const [ano, m] = mes.split("-").map(Number);
  const vencimento = new Date(ano, m - 1, diaEfetivo(dia, mes));
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return Math.round((vencimento.getTime() - base.getTime()) / 86_400_000);
}

export function situacaoConta(args: {
  dia: number;
  mes: string;
  paga: boolean;
  hoje?: Date;
}): SituacaoConta {
  if (args.paga) return "paga";

  const dias = diasAteVencimento(args.dia, args.mes, args.hoje);

  if (dias < 0) return "atrasada";
  if (dias === 0) return "hoje";
  if (dias <= DIAS_AVISO) return "em-breve";
  return "futura";
}

/** "vence hoje", "vence amanhã", "venceu há 2 dias"... */
export function textoVencimento(dias: number) {
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${-dias} dias`;
}

/** Contas que pedem atenção agora: atrasadas, vencendo hoje ou nos próximos dias. */
export const pedeAtencao = (s: SituacaoConta) => s === "atrasada" || s === "hoje" || s === "em-breve";
