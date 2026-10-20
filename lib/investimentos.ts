/**
 * Guia EDUCATIVO de opções de renda fixa de baixo risco no Brasil. Não é recomendação
 * personalizada e não traz taxas (mudam o tempo todo): serve para entender as diferenças.
 */

export interface OpcaoInvestimento {
  id: string;
  nome: string;
  /** para que costuma servir */
  paraQue: string;
  liquidez: string;
  risco: string;
  garantia: string;
  imposto: string;
  atencao: string;
}

export const OPCOES: OpcaoInvestimento[] = [
  {
    id: "tesouro-selic",
    nome: "Tesouro Selic",
    paraQue: "Reserva de emergência e objetivos de curto prazo.",
    liquidez: "Pode vender a qualquer dia útil; o dinheiro cai em 1 dia útil.",
    risco: "Baixíssimo: é título do governo federal e quase não oscila.",
    garantia: "Tesouro Nacional (não usa o FGC).",
    imposto: "Imposto de renda regressivo (de 22,5% a 15%) e IOF só nos primeiros 30 dias.",
    atencao: "Confira a taxa de custódia da B3 (há isenção para parte do saldo) e a taxa de administração da corretora.",
  },
  {
    id: "cdb-liquidez-diaria",
    nome: "CDB com liquidez diária",
    paraQue: "Reserva de emergência, principalmente se estiver em um banco que você já usa.",
    liquidez: "Resgate a qualquer momento, sem perder rendimento.",
    risco: "Baixo, ligado à saúde do banco emissor.",
    garantia: "FGC: até R$ 250 mil por CPF em cada instituição.",
    imposto: "Imposto de renda regressivo (de 22,5% a 15%) e IOF nos primeiros 30 dias.",
    atencao: "Compare o percentual do CDI: o que vale é pelo menos 100% do CDI, e muitos bancos pagam menos.",
  },
  {
    id: "conta-remunerada",
    nome: "Conta remunerada / caixinhas",
    paraQue: "Dinheiro de curtíssimo prazo e organização por objetivo.",
    liquidez: "Imediata.",
    risco: "Baixo; na prática costuma ser um CDB com liquidez diária.",
    garantia: "FGC, quando o produto for CDB de uma instituição financeira.",
    imposto: "Imposto de renda regressivo sobre o rendimento.",
    atencao: "Veja quanto do CDI o produto paga de fato; às vezes é menos que 100%.",
  },
  {
    id: "lci-lca",
    nome: "LCI e LCA",
    paraQue: "Objetivos com data certa (ex.: entrada de um imóvel), depois de ter a reserva pronta.",
    liquidez: "Tem carência: o dinheiro fica preso por um prazo mínimo (normalmente de 3 meses a anos).",
    risco: "Baixo, ligado ao banco emissor.",
    garantia: "FGC: até R$ 250 mil por CPF em cada instituição.",
    imposto: "Isentas de imposto de renda para pessoa física.",
    atencao: "Só coloque aqui o dinheiro que não vai precisar durante a carência.",
  },
  {
    id: "tesouro-ipca",
    nome: "Tesouro IPCA+ e Prefixado",
    paraQue: "Objetivos de longo prazo (anos), para proteger contra a inflação ou travar uma taxa.",
    liquidez: "Dá para vender antes, mas o preço pode estar abaixo do que você pagou.",
    risco: "Baixo se segurar até o vencimento; pode dar prejuízo temporário se vender antes.",
    garantia: "Tesouro Nacional.",
    imposto: "Imposto de renda regressivo (de 22,5% a 15%).",
    atencao: "Não serve para a reserva de emergência, justamente pela oscilação de preço.",
  },
  {
    id: "poupanca",
    nome: "Poupança",
    paraQue: "Quem quer o mais simples possível e não se importa em render menos.",
    liquidez: "Imediata.",
    risco: "Baixo.",
    garantia: "FGC: até R$ 250 mil por CPF em cada instituição.",
    imposto: "Isenta de imposto de renda para pessoa física.",
    atencao: "Em geral rende menos que as opções acima; compare antes de deixar valores grandes parados.",
  },
];

export type StatusPasso = "pendente" | "feito" | "info";

export interface Passo {
  id: string;
  titulo: string;
  texto: string;
  status: StatusPasso;
}

/**
 * A ordem de prioridades que educadores financeiros costumam ensinar, marcada com a
 * situação real do usuário (reserva de emergência e sobra do mês).
 */
export function passosParaGuardar(args: {
  mesesDeReserva: number;
  mesesIdeais: number;
  temMetaDeReserva: boolean;
  saldoDoMes: number;
}): Passo[] {
  const reservaCompleta = args.mesesDeReserva >= args.mesesIdeais;

  return [
    {
      id: "dividas",
      titulo: "1. Quitar dívidas caras",
      texto:
        "Rotativo do cartão, cheque especial e empréstimos pessoais cobram juros muito maiores do que qualquer investimento seguro rende. Pagar essas dívidas primeiro costuma ser o melhor 'investimento'.",
      status: "info",
    },
    {
      id: "reserva",
      titulo: `2. Reserva de emergência (${args.mesesIdeais} meses de gastos)`,
      texto: reservaCompleta
        ? `Sua reserva já cobre ${args.mesesDeReserva.toFixed(1).replace(".", ",")} meses. Mantenha-a em uma opção com liquidez diária e baixo risco.`
        : args.temMetaDeReserva
        ? `Sua reserva cobre ${args.mesesDeReserva.toFixed(1).replace(".", ",")} de ${args.mesesIdeais} meses. Esse dinheiro precisa estar disponível a qualquer momento e não pode oscilar: é onde cabem as opções de liquidez diária abaixo.`
        : `Você ainda não tem uma meta de reserva. Crie uma na aba Metas: o objetivo é cobrir ${args.mesesIdeais} meses de gastos em uma opção de liquidez diária e baixo risco.`,
      status: reservaCompleta ? "feito" : "pendente",
    },
    {
      id: "metas",
      titulo: "3. Metas com prazo",
      texto:
        "Para objetivos com data (viagem, entrada da casa), combine o prazo da aplicação com o prazo da meta: quanto mais perto a data, mais liquidez e menos oscilação você precisa.",
      status: "info",
    },
    {
      id: "longo-prazo",
      titulo: "4. Longo prazo",
      texto:
        "Só depois da reserva pronta faz sentido pensar em objetivos de muitos anos. Investimentos de maior risco podem render mais, mas também perder valor; por isso ficam fora desta lista de opções seguras.",
      status: "info",
    },
  ];
}
