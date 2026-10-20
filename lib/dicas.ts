import { LIMITE_GASTOS_PERCENT, arredondar } from "@/lib/calculos";
import { normalizar } from "@/lib/fatura";

// Dicas de onde cortar gastos, calculadas só com os números do próprio usuário
// (nada de opinião sobre produtos). Tudo puro, sem tela nem banco.

export type TipoDica = "cortar" | "atencao" | "ok";

export interface Dica {
  id: string;
  tipo: TipoDica;
  titulo: string;
  texto: string;
  /** quanto, por mês, essa dica poderia liberar (0 = só um aviso) */
  economia: number;
}

export interface EntradaDicas {
  renda: number;
  totalGastos: number;
  /** gastos do mês por categoria (inclui "Gastos fixos", "Gastos variáveis" e "Sem categoria") */
  categorias: { nome: string; valor: number }[];
  orcamentos: Record<string, number>;
  /** gastos do mês anterior por categoria, se houver */
  anterior: { total: number; linhas: { nome: string; valor: number }[] } | null;
  /** compras do mês (cartão e avulsas, parcelas incluídas) */
  compras: { nome: string; valor: number }[];
  /** itens da categoria Assinaturas (compras e contas fixas) */
  assinaturas: { nome: string; valor: number }[];
  /** todos os gastos fixos do mês: contas fixas + outros gastos fixos */
  gastosFixos: number;
  /** soma das parcelas que caem neste mês */
  parcelasDoMes: number;
  limiteCartao: number | null;
  usadoCartao: number;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (parte: number, todo: number) => (todo > 0 ? (parte / todo) * 100 : 0);

/** Categorias que dão para apertar sem abrir mão do essencial. */
const DISCRICIONARIAS = ["Lazer", "Compras", "Outros"];

const DELIVERY = /ifood|99 ?food|uber ?eats|rappi|delivery|aiqfome/;

/** Fatia dos gastos discricionários que dá para reduzir como meta realista. */
const META_REDUCAO = 0.2;

export function gerarDicas(e: EntradaDicas): Dica[] {
  const dicas: Dica[] = [];
  const valorDe = (nome: string) => e.categorias.find((c) => c.nome === nome)?.valor ?? 0;

  if (e.renda <= 0 || e.totalGastos <= 0) return dicas;

  // 1. Orçamento por categoria estourado
  for (const [categoria, teto] of Object.entries(e.orcamentos)) {
    const gasto = valorDe(categoria);

    if (teto > 0 && gasto > teto) {
      dicas.push({
        id: `orcamento-${categoria}`,
        tipo: "cortar",
        titulo: `${categoria} passou do orçamento`,
        texto: `Você definiu ${brl(teto)} para ${categoria} e já gastou ${brl(gasto)}. Segurar novas compras nessa categoria até o fim do mês evita estourar ainda mais.`,
        economia: arredondar(gasto - teto),
      });
    }
  }

  // 2. Delivery e apps de comida
  const delivery = e.compras.filter((c) => DELIVERY.test(normalizar(c.nome)));
  const totalDelivery = arredondar(delivery.reduce((acc, c) => acc + c.valor, 0));

  if (delivery.length >= 3 || pct(totalDelivery, e.renda) >= 3) {
    dicas.push({
      id: "delivery",
      tipo: "cortar",
      titulo: "Delivery e apps de comida",
      texto: `${delivery.length} pedidos somaram ${brl(totalDelivery)} (${pct(totalDelivery, e.renda).toFixed(1).replace(".", ",")}% da renda). Cozinhar em casa metade das vezes já libera cerca de ${brl(totalDelivery / 2)} por mês.`,
      economia: arredondar(totalDelivery / 2),
    });
  }

  // 3. Categorias que dão para apertar
  for (const nome of DISCRICIONARIAS) {
    const valor = valorDe(nome);

    if (valor > 0 && (pct(valor, e.totalGastos) >= 15 || pct(valor, e.renda) >= 8)) {
      dicas.push({
        id: `discricionaria-${nome}`,
        tipo: "cortar",
        titulo: `${nome} pesa no mês`,
        texto: `${nome} soma ${brl(valor)}: ${pct(valor, e.totalGastos).toFixed(0)}% dos seus gastos. Reduzir ${META_REDUCAO * 100}% libera cerca de ${brl(valor * META_REDUCAO)} por mês.`,
        economia: arredondar(valor * META_REDUCAO),
      });
    }
  }

  // 4. Assinaturas
  const totalAssinaturas = arredondar(e.assinaturas.reduce((acc, a) => acc + a.valor, 0));

  if (e.assinaturas.length >= 3 || pct(totalAssinaturas, e.renda) >= 2) {
    dicas.push({
      id: "assinaturas",
      tipo: "cortar",
      titulo: "Revise as assinaturas",
      texto: `${e.assinaturas.length} assinaturas somam ${brl(totalAssinaturas)} por mês (${brl(totalAssinaturas * 12)} por ano). Cancele as que você não usou no último mês; cortar uma em cada três libera cerca de ${brl(totalAssinaturas / 3)} por mês.`,
      economia: arredondar(totalAssinaturas / 3),
    });
  }

  // 5. O que mais subiu desde o mês passado
  if (e.anterior) {
    const anterior = e.anterior;

    const subidas = e.categorias
      .map((c) => ({
        nome: c.nome,
        antes: anterior.linhas.find((l) => l.nome === c.nome)?.valor ?? 0,
        agora: c.valor,
      }))
      .filter((s) => s.antes > 0 && s.agora - s.antes >= 50 && s.agora >= s.antes * 1.25)
      .sort((a, b) => b.agora - b.antes - (a.agora - a.antes))
      .slice(0, 2);

    for (const s of subidas) {
      dicas.push({
        id: `subiu-${s.nome}`,
        tipo: "atencao",
        titulo: `${s.nome} subiu desde o mês passado`,
        texto: `Foi de ${brl(s.antes)} para ${brl(s.agora)} (+${(pct(s.agora - s.antes, s.antes)).toFixed(0)}%). Vale entender se foi pontual ou se virou hábito.`,
        economia: arredondar((s.agora - s.antes) / 2),
      });
    }
  }

  // 6. Gastos fixos pesados
  if (pct(e.gastosFixos, e.renda) >= 50) {
    dicas.push({
      id: "fixos",
      tipo: "atencao",
      titulo: "Gastos fixos consomem mais da metade da renda",
      texto: `Contas e gastos fixos somam ${brl(e.gastosFixos)} (${pct(e.gastosFixos, e.renda).toFixed(0)}% da renda). Renegociar internet, plano de celular, seguros e mensalidades costuma dar economia que se repete todo mês.`,
      economia: 0,
    });
  }

  // 7. Parcelas e cartão
  if (pct(e.parcelasDoMes, e.renda) >= 15) {
    dicas.push({
      id: "parcelas",
      tipo: "atencao",
      titulo: "Parcelas já comprometem boa parte da renda",
      texto: `Só as parcelas deste mês somam ${brl(e.parcelasDoMes)} (${pct(e.parcelasDoMes, e.renda).toFixed(0)}% da renda). Evite novas compras parceladas até algumas terminarem.`,
      economia: 0,
    });
  }

  if (e.limiteCartao && pct(e.usadoCartao, e.limiteCartao) >= 70) {
    dicas.push({
      id: "limite-cartao",
      tipo: "atencao",
      titulo: "Cartão perto do limite",
      texto: `A fatura já usa ${pct(e.usadoCartao, e.limiteCartao).toFixed(0)}% do limite de ${brl(e.limiteCartao)}. Manter abaixo de 70% deixa folga para imprevistos e evita pagar a fatura parcial.`,
      economia: 0,
    });
  }

  // 8. Gasto sem categoria
  const semCategoria = valorDe("Sem categoria");

  if (pct(semCategoria, e.totalGastos) >= 10) {
    dicas.push({
      id: "sem-categoria",
      tipo: "atencao",
      titulo: "Muito gasto sem categoria",
      texto: `${brl(semCategoria)} (${pct(semCategoria, e.totalGastos).toFixed(0)}%) estão sem categoria. Classificar mostra para onde o dinheiro realmente vai e destrava as outras dicas.`,
      economia: 0,
    });
  }

  // 9. Mês no vermelho ou dentro do limite
  if (e.totalGastos > e.renda) {
    dicas.push({
      id: "vermelho",
      tipo: "cortar",
      titulo: "O mês está fechando no vermelho",
      texto: `Você gastou ${brl(e.totalGastos - e.renda)} a mais do que ganhou. Comece pelos cortes acima: o primeiro objetivo é parar de usar dinheiro que não existe.`,
      economia: 0,
    });
  } else if (e.totalGastos <= (e.renda * LIMITE_GASTOS_PERCENT) / 100) {
    dicas.push({
      id: "dentro-do-limite",
      tipo: "ok",
      titulo: "Gastos dentro do limite",
      texto: `Você está em ${pct(e.totalGastos, e.renda).toFixed(0)}% da renda, abaixo do limite de ${LIMITE_GASTOS_PERCENT}%. O que sobra pode ir para a reserva e para as metas.`,
      economia: 0,
    });
  }

  const ordem: Record<TipoDica, number> = { cortar: 0, atencao: 1, ok: 2 };

  return dicas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || b.economia - a.economia);
}

/** Soma do que as dicas de corte poderiam liberar por mês (nunca mais do que o total gasto). */
export function economiaPotencial(dicas: Dica[], totalGastos: number) {
  const soma = dicas.filter((d) => d.tipo !== "ok").reduce((acc, d) => acc + d.economia, 0);

  return arredondar(Math.min(soma, totalGastos));
}
