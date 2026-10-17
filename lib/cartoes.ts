/** Cartões que podem ser usados nos gastos. Para adicionar outro, inclua o nome aqui. */
export const CARTOES = ["Nubank"] as const;

export type Cartao = (typeof CARTOES)[number];

export const cartaoValido = (v: unknown): v is Cartao =>
  typeof v === "string" && (CARTOES as readonly string[]).includes(v);

/** Dados que o usuário informa de cada cartão (todos opcionais). */
export type ConfigCartao = {
  limite: number | null;
  /** dia do mês em que a fatura fecha */
  fechamento: number | null;
  /** dia do mês em que a fatura vence */
  vencimento: number | null;
};
