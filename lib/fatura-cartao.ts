import { arredondar } from "@/lib/calculos";
import { diasAteVencimento, textoVencimento } from "@/lib/vencimentos";

// Contas do painel da fatura do cartão (aba Cartão dos lançamentos).

export interface CompraCartao {
  nome: string;
  valor: number;
  /** presente nas parcelas de compras parceladas */
  parcela?: { numero: number; total: number };
}

/** O que compõe a fatura do mês: à vista, parcelas e a maior compra. */
export function resumoFatura<T extends CompraCartao>(compras: T[]) {
  const aVista = compras.filter((c) => !c.parcela);
  const parcelas = compras.filter((c) => c.parcela);
  const soma = (itens: T[]) => arredondar(itens.reduce((acc, c) => acc + c.valor, 0));

  return {
    total: soma(compras),
    aVista: { valor: soma(aVista), quantidade: aVista.length },
    parcelas: { valor: soma(parcelas), quantidade: parcelas.length },
    maior: compras.reduce<T | null>((maior, c) => (!maior || c.valor > maior.valor ? c : maior), null),
  };
}

/**
 * Quanto das compras parceladas já feitas cai em cada um dos próximos meses
 * (só o que já está comprado; compras novas ainda não entram).
 */
export function parcelasFuturas(compras: CompraCartao[], meses = 3) {
  return Array.from({ length: meses }, (_, i) => {
    const delta = i + 1;
    const itens = compras.filter((c) => c.parcela && c.parcela.numero + delta <= c.parcela.total);

    return {
      delta,
      valor: arredondar(itens.reduce((acc, c) => acc + c.valor, 0)),
      quantidade: itens.length,
    };
  });
}

/** Tudo o que ainda falta pagar das parcelas depois deste mês (o banco reserva esse valor no limite). */
export const restanteParcelas = (compras: CompraCartao[]) =>
  arredondar(compras.reduce((acc, c) => acc + (c.parcela ? c.valor * (c.parcela.total - c.parcela.numero) : 0), 0));

/**
 * Limite livre estimado: o limite menos a fatura em aberto e as parcelas futuras.
 * Fatura paga devolve o limite. Negativo = passou do limite.
 */
export const limiteLivre = (a: { limite: number; fatura: number; paga: boolean; futuras: number }) =>
  arredondar(a.limite - (a.paga ? 0 : a.fatura) - a.futuras);

export type TipoSituacaoFatura = "paga" | "sem-compras" | "atrasada" | "hoje" | "em-breve" | "aberta";

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Situação da fatura do mês, para o selo do painel do cartão. */
export function situacaoFatura(a: {
  total: number;
  paga: boolean;
  vencimento: number | null;
  mes: string;
  /** só no mês em andamento o prazo é comparado com hoje */
  ehMesAtual: boolean;
  hoje?: Date;
}): { tipo: TipoSituacaoFatura; texto: string } {
  if (a.paga) return { tipo: "paga", texto: "Fatura paga" };
  if (a.total <= 0) return { tipo: "sem-compras", texto: "Nenhuma compra neste mês" };
  if (!a.vencimento) return { tipo: "aberta", texto: "Fatura em aberto" };
  if (!a.ehMesAtual) return { tipo: "aberta", texto: `Vence dia ${a.vencimento}` };

  const dias = diasAteVencimento(a.vencimento, a.mes, a.hoje);
  const texto = maiuscula(textoVencimento(dias));

  if (dias < 0) return { tipo: "atrasada", texto };
  if (dias === 0) return { tipo: "hoje", texto };
  if (dias <= 3) return { tipo: "em-breve", texto };
  return { tipo: "aberta", texto };
}
