import { arredondar, somar } from "@/lib/calculos";
import { somarMes } from "@/lib/parcelas";
import { ultimoDiaDoMes } from "@/lib/vencimentos";

// Fechamento do mês: concluir um mês trava as alterações nele e faz o app seguir para o
// próximo, que já começa preparado. Aqui fica só a parte sem banco de dados.

/** Mês que o app abre: o do calendário ou, se ele já foi concluído, o primeiro aberto depois dele. */
export function mesEmAndamento(hoje: string, concluidos: ReadonlySet<string>) {
  let mes = hoje;
  while (concluidos.has(mes)) mes = somarMes(mes, 1);
  return mes;
}

/**
 * O mês logo antes do em andamento, se tem dados salvos e ficou aberto (para lembrar de
 * concluí-lo). Meses mais antigos não entram: não faz sentido cobrar o histórico inteiro.
 */
export function mesAnteriorAberto(emAndamento: string, comDados: ReadonlySet<string>, concluidos: ReadonlySet<string>) {
  const anterior = somarMes(emAndamento, -1);
  return comDados.has(anterior) && !concluidos.has(anterior) ? anterior : null;
}

export type SituacaoMes =
  | { tipo: "concluido" }
  | { tipo: "andamento"; diasRestantes: number | null }
  | { tipo: "terminou" }
  | { tipo: "futuro" };

/** Como o mês está: concluído, em andamento (com os dias que faltam), terminado sem concluir ou futuro. */
export function situacaoDoMes(a: {
  mes: string;
  hoje: string;
  diaHoje: number;
  emAndamento: string;
  concluido: boolean;
}): SituacaoMes {
  if (a.concluido) return { tipo: "concluido" };
  if (a.mes < a.emAndamento) return { tipo: "terminou" };
  if (a.mes > a.emAndamento) return { tipo: "futuro" };

  return {
    tipo: "andamento",
    diasRestantes: a.mes === a.hoje ? ultimoDiaDoMes(a.mes) - a.diaHoje + 1 : null,
  };
}

export interface Pendencias {
  /** há alterações não salvas (o fechamento salva antes de concluir) */
  salvar: boolean;
  semRenda: boolean;
  /** contas fixas sem marcar como pagas */
  contas: { quantidade: number; total: number };
  /** valor da fatura do cartão ainda não marcada como paga (0 = nada pendente) */
  fatura: number;
  /** quanto do "para investir" ainda não foi somado ao total guardado */
  investir: number;
}

/** O que vale conferir antes de concluir o mês. Nada aqui impede de concluir. */
export function pendenciasDoFechamento(e: {
  alterado: boolean;
  renda: number;
  contasPendentes: { valor: number }[];
  fatura: number;
  faturaPaga: boolean;
  investimento: number;
  investimentoGuardado: number;
}): Pendencias {
  return {
    salvar: e.alterado,
    semRenda: e.renda <= 0,
    contas: { quantidade: e.contasPendentes.length, total: somar(e.contasPendentes) },
    fatura: e.faturaPaga ? 0 : Math.max(0, arredondar(e.fatura)),
    investir: Math.max(0, arredondar(e.investimento - e.investimentoGuardado)),
  };
}

export const quantasPendencias = (p: Pendencias) =>
  [p.salvar, p.semRenda, p.contas.quantidade > 0, p.fatura > 0, p.investir > 0].filter(Boolean).length;

export interface BaseDoMes {
  /** fontes de renda avulsas do mês, somadas */
  renda: number;
  gastosFixos: number;
  gastosVariaveis: number;
  percentualInvestimento: number;
  rendas: { nome: string; valor: number }[];
}

/**
 * Com o que o mês seguinte começa ao concluir este: as estimativas, a % para investir e a
 * renda avulsa. Com renda fixa valendo no mês seguinte, a renda já vem dela (copiar as
 * fontes contaria o salário duas vezes). Mês antigo sem fontes vira uma fonte com o total.
 * Compras não são copiadas: cada mês tem as suas.
 */
export function prepararProximoMes(anterior: BaseDoMes, temRendasFixas: boolean) {
  const rendas = temRendasFixas
    ? []
    : anterior.rendas.length > 0
    ? anterior.rendas.map(({ nome, valor }) => ({ nome, valor }))
    : anterior.renda > 0
    ? [{ nome: "Renda", valor: anterior.renda }]
    : [];

  return {
    rendas,
    gastosFixos: anterior.gastosFixos,
    gastosVariaveis: anterior.gastosVariaveis,
    percentualInvestimento: anterior.percentualInvestimento,
  };
}

/** O mês preparado tem algo? (Sem nada, não vale criar o mês só com zeros.) */
export const temAlgoParaCopiar = (p: ReturnType<typeof prepararProximoMes>) =>
  p.rendas.length > 0 || p.gastosFixos > 0 || p.gastosVariaveis > 0 || p.percentualInvestimento > 0;
