import { arredondar } from "@/lib/calculos";
import { ultimoDiaDoMes } from "@/lib/vencimentos";

/** A previsão só aparece depois de alguns dias de dados; antes disso o ritmo engana. */
export const DIAS_MINIMOS_PREVISAO = 3;

export interface EntradaPrevisao {
  /** mês em andamento ("AAAA-MM") */
  mes: string;
  /** dia do mês de hoje */
  diaAtual: number;
  renda: number;
  /** o que já é certo no mês: contas fixas, outros gastos fixos e parcelas */
  gastosCertos: number;
  /** o que varia com o ritmo: gastos variáveis + compras lançadas (cartão e avulsas) */
  gastosVariaveis: number;
  /** teto de gastos do mês (limite % da renda) */
  limite: number;
}

export interface Previsao {
  /** quanto o mês deve fechar, mantido o ritmo de agora */
  projetado: number;
  /** projetado em % da renda */
  percentual: number;
  passaDoLimite: boolean;
  /** dia do mês em que o limite deve estourar (só se passaDoLimite) */
  diaDoEstouro: number | null;
  /** quanto dá para gastar por dia, de agora até o fim do mês, sem passar do limite (0 = não dá mais) */
  porDiaParaSegurar: number;
}

/**
 * Projeta o fechamento do mês: o que é certo continua igual e o que varia segue o ritmo
 * de gastos dos dias que já passaram. Devolve null quando ainda não dá para estimar.
 */
export function preverMes(e: EntradaPrevisao): Previsao | null {
  if (e.renda <= 0 || e.gastosVariaveis <= 0 || e.diaAtual < DIAS_MINIMOS_PREVISAO) return null;

  const diasNoMes = ultimoDiaDoMes(e.mes);
  const dia = Math.min(e.diaAtual, diasNoMes);
  const ritmo = e.gastosVariaveis / dia; // gasto variável por dia até agora

  const projetado = arredondar(e.gastosCertos + ritmo * diasNoMes);
  const passaDoLimite = projetado > e.limite;

  let diaDoEstouro: number | null = null;

  if (passaDoLimite) {
    const dias = (e.limite - e.gastosCertos) / ritmo;
    diaDoEstouro = Math.min(diasNoMes, Math.max(dia, Math.ceil(dias)));
  }

  const diasRestantes = diasNoMes - dia;
  const folga = e.limite - e.gastosCertos - e.gastosVariaveis;

  return {
    projetado,
    percentual: (projetado / e.renda) * 100,
    passaDoLimite,
    diaDoEstouro,
    porDiaParaSegurar: diasRestantes > 0 && folga > 0 ? arredondar(folga / diasRestantes) : 0,
  };
}
