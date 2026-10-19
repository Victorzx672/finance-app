import { contaAtiva } from "@/lib/resumo-mes";
import { diaEfetivo } from "@/lib/vencimentos";

// Lembrete diário por e-mail: contas fixas e fatura do cartão que vencem hoje ou amanhã
// e ainda não foram marcadas como pagas. Puro: o servidor só busca os dados e manda o e-mail.

export interface ContaLembrete {
  id: number;
  nome: string;
  valor: number;
  dia: number;
  mesInicio: string;
  mesFim: string | null;
}

export interface CartaoLembrete {
  nome: string;
  vencimento: number | null;
  /** total das compras do cartão em cada mês (só os meses de hoje e de amanhã interessam) */
  faturaPorMes: Record<string, number>;
}

export interface ItemLembrete {
  nome: string;
  valor: number;
  quando: "hoje" | "amanhã";
  /** dia do mês do vencimento */
  dia: number;
}

const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** A data de hoje no Brasil (o servidor roda em UTC), como uma data local sem horário. */
export function hojeEmBrasilia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora); // "2026-10-19"

  const [ano, mes, dia] = partes.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function lembretesDoDia(entrada: {
  hoje: Date;
  contas: ContaLembrete[];
  pagamentos: { chave: string; mes: string }[];
  cartoes: CartaoLembrete[];
}): ItemLembrete[] {
  const { hoje, contas, pagamentos, cartoes } = entrada;
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

  const itens: ItemLembrete[] = [];

  for (const [data, quando] of [
    [hoje, "hoje"],
    [amanha, "amanhã"],
  ] as const) {
    const mes = chaveMes(data);
    const paga = (chave: string) => pagamentos.some((p) => p.chave === chave && p.mes === mes);

    for (const c of contas) {
      if (contaAtiva(c, mes) && diaEfetivo(c.dia, mes) === data.getDate() && !paga(`conta:${c.id}`)) {
        itens.push({ nome: c.nome, valor: c.valor, quando, dia: data.getDate() });
      }
    }

    for (const cartao of cartoes) {
      const valor = cartao.faturaPorMes[mes] ?? 0;

      if (
        cartao.vencimento &&
        diaEfetivo(cartao.vencimento, mes) === data.getDate() &&
        valor > 0 &&
        !paga(`fatura:${cartao.nome}`)
      ) {
        itens.push({ nome: `Fatura ${cartao.nome}`, valor, quando, dia: data.getDate() });
      }
    }
  }

  return itens;
}
