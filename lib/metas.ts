import { arredondar } from "@/lib/calculos";

/** Quantos meses de gastos a reserva de emergência deve cobrir. */
export const MESES_RESERVA_IDEAL = 6;

export interface MetaDinheiro {
  id: number;
  nome: string;
  alvo: number;
  guardado: number;
  reserva: boolean;
}

export const progressoMeta = (m: Pick<MetaDinheiro, "alvo" | "guardado">) =>
  m.alvo > 0 ? Math.min(100, (m.guardado / m.alvo) * 100) : 0;

export const faltaParaMeta = (m: Pick<MetaDinheiro, "alvo" | "guardado">) =>
  Math.max(0, arredondar(m.alvo - m.guardado));

export const metaConcluida = (m: Pick<MetaDinheiro, "alvo" | "guardado">) => m.guardado >= m.alvo;

/** A meta que o gráfico de projeção acompanha: a primeira ainda não concluída. */
export const metaPrincipal = <T extends MetaDinheiro>(metas: T[]) =>
  [...metas].sort((a, b) => a.id - b.id).find((m) => !metaConcluida(m)) ?? null;

/** Tudo que já está guardado: o que está em metas + o que está guardado sem meta. */
export const totalGuardado = (metas: Pick<MetaDinheiro, "guardado">[], guardadoGeral: number) =>
  arredondar(guardadoGeral + metas.reduce((acc, m) => acc + m.guardado, 0));

/** Soma um depósito (ou retirada, se negativo) ao valor guardado, sem deixar ficar abaixo de zero. */
export const aplicarAporte = (atual: number, aporte: number) => Math.max(0, arredondar(atual + aporte));

export const totalNaReserva =(metas: MetaDinheiro[]) =>
  arredondar(metas.filter((m) => m.reserva).reduce((acc, m) => acc + m.guardado, 0));

/** Por quantos meses o que está na reserva cobre os gastos mensais. */
export const mesesDeReserva = (metas: MetaDinheiro[], gastosMensais: number) =>
  gastosMensais > 0 ? totalNaReserva(metas) / gastosMensais : 0;

/** Valor sugerido para a meta de reserva: o ideal em meses de gastos. */
export const alvoReservaSugerido = (gastosMensais: number) =>
  arredondar(Math.max(0, gastosMensais) * MESES_RESERVA_IDEAL);
