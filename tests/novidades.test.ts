import { describe, expect, it } from "vitest";
import { serieGuardado, variacaoGuardado } from "@/lib/evolucao-guardado";
import {
  adivinharCategoria,
  categoriasAprendidas,
  interpretarFatura,
  lerCsv,
  lerDia,
  lerParcela,
  lerValor,
} from "@/lib/fatura";
import { hojeEmBrasilia, lembretesDoDia } from "@/lib/lembretes";
import { gastosPorPessoa, limparPessoas, SEM_PESSOA } from "@/lib/pessoas";
import { preverMes } from "@/lib/previsao";

describe("serieGuardado (evolução do total guardado)", () => {
  it("preenche os meses sem registro com o último valor", () => {
    const serie = serieGuardado(
      [
        { mes: "2026-08", total: 1000 },
        { mes: "2026-10", total: 1500 },
      ],
      "2026-11"
    );

    expect(serie).toEqual([
      { mes: "2026-08", total: 1000 },
      { mes: "2026-09", total: 1000 },
      { mes: "2026-10", total: 1500 },
      { mes: "2026-11", total: 1500 },
    ]);
  });

  it("sem registros, a série é vazia; a variação é do primeiro ao último ponto", () => {
    expect(serieGuardado([], "2026-10")).toEqual([]);
    expect(variacaoGuardado(serieGuardado([{ mes: "2026-09", total: 100 }, { mes: "2026-10", total: 350.5 }], "2026-10"))).toBe(250.5);
  });
});

describe("leitura da fatura (CSV)", () => {
  it("lê aspas, vírgula e ponto e vírgula", () => {
    expect(lerCsv('date,title,amount\n2026-10-05,"Loja, centro",12.5')).toEqual([
      ["date", "title", "amount"],
      ["2026-10-05", "Loja, centro", "12.5"],
    ]);
    expect(lerCsv("data;descricao;valor\n05/10/2026;Padaria;7,30")[1]).toEqual(["05/10/2026", "Padaria", "7,30"]);
  });

  it("entende valores e datas nos formatos comuns", () => {
    expect(lerValor("123.45")).toBe(123.45);
    expect(lerValor("1.234,56")).toBe(1234.56);
    expect(lerValor("R$ 12,30")).toBe(12.3);
    expect(lerValor("-50.00")).toBe(-50);
    expect(lerValor("abc")).toBeNaN();
    expect(lerDia("2026-10-05")).toBe(5);
    expect(lerDia("17/09/2026")).toBe(17);
    expect(lerDia("lixo")).toBeNull();
  });

  it("reconhece compra parcelada no título", () => {
    expect(lerParcela("Amazon - Parcela 2/10")).toEqual({ nome: "Amazon", atual: 2, total: 10 });
    expect(lerParcela("Padaria")).toBeNull();
    expect(lerParcela("Loja - Parcela 5/3")).toBeNull();
  });

  const csv = [
    "date,category,title,amount",
    "2026-10-02,transporte,99 (Corrida),17.21",
    "2026-10-03,restaurante,Ifood,33.78",
    "2026-10-04,serviços,Netflix,39.90",
    "2026-10-05,casa,Educa mais Brasil - Parcela 3/10,76.67",
    "2026-10-06,outros,Pagamento recebido,-500.00",
    "2026-10-07,outros,Estorno de compra,-20.00",
    "2026-10-08,outros,Loja Desconhecida,50.00",
  ].join("\n");

  it("vira compras, ignora pagamentos e estornos e separa as parceladas", () => {
    const r = interpretarFatura(csv);

    expect(r.erro).toBeUndefined();
    expect(r.ignoradas).toBe(2);
    expect(r.linhas.map((l) => l.nome)).toEqual(["99 (Corrida)", "Ifood", "Netflix", "Educa mais Brasil", "Loja Desconhecida"]);
    expect(r.linhas[3].parcela).toEqual({ atual: 3, total: 10 });
    expect(r.linhas[0].dia).toBe(2);
  });

  it("adivinha a categoria pelo nome e, se não souber, pela categoria do banco", () => {
    const r = interpretarFatura(csv);

    expect(r.linhas.map((l) => l.categoria)).toEqual(["Transporte", "Mercado", "Assinaturas", "Educação", "Compras"]);
    expect(adivinharCategoria("Sem pista nenhuma", "casa", new Map())).toBe("Moradia");
    expect(adivinharCategoria("Sem pista nenhuma", null, new Map())).toBeNull();
    expect(adivinharCategoria("Uber Eats", null, new Map())).toBe("Mercado");
    expect(adivinharCategoria("Mercado Livre", null, new Map())).toBe("Compras");
  });

  it("usa a categoria que o usuário já deu para o mesmo nome", () => {
    const aprendidas = categoriasAprendidas([{ nome: "Loja Desconhecida", categoria: "Lazer" }]);

    expect(interpretarFatura(csv, [], aprendidas).linhas[4].categoria).toBe("Lazer");
  });

  it("marca como já lançadas só tantas linhas quantas já existem", () => {
    const dupla = "date,title,amount\n2026-10-02,Uber,10.00\n2026-10-03,Uber,10.00";
    const r = interpretarFatura(dupla, [{ nome: "uber", valor: 10 }]);

    expect(r.linhas.map((l) => l.jaLancada)).toEqual([true, false]);
  });

  it("avisa quando o arquivo não parece uma fatura", () => {
    expect(interpretarFatura("a,b\n1,2").erro).toMatch(/colunas/);
    expect(interpretarFatura("").erro).toBeDefined();
  });
});

describe("pessoas", () => {
  it("limpa a lista: espaços, repetidos e limite de 4", () => {
    expect(limparPessoas([" Vitinho ", "vitinho", "Iele", "", 5, "A", "B", "C"])).toEqual(["Vitinho", "Iele", "A", "B"]);
    expect(limparPessoas("nada")).toEqual([]);
  });

  it("soma o que cada um gastou e separa quem não foi marcado", () => {
    const linhas = gastosPorPessoa(
      [
        { valor: 100, pessoa: "Vitinho" },
        { valor: 50, pessoa: "Iele" },
        { valor: 50, pessoa: "Vitinho" },
        { valor: 100, pessoa: null },
      ],
      ["Vitinho", "Iele"]
    );

    expect(linhas.map((l) => [l.nome, l.valor])).toEqual([
      ["Vitinho", 150],
      ["Iele", 50],
      [SEM_PESSOA, 100],
    ]);
    expect(linhas[0].percentual).toBe(50);
  });

  it("sem ninguém sem marca, não cria a linha extra", () => {
    expect(gastosPorPessoa([{ valor: 10, pessoa: "A" }], ["A"]).map((l) => l.nome)).toEqual(["A"]);
  });
});

describe("previsão do mês", () => {
  const base = { mes: "2026-10", renda: 5000, gastosCertos: 1000, limite: 3000 };

  it("não prevê com poucos dias de dados ou sem gasto variável", () => {
    expect(preverMes({ ...base, diaAtual: 2, gastosVariaveis: 300 })).toBeNull();
    expect(preverMes({ ...base, diaAtual: 10, gastosVariaveis: 0 })).toBeNull();
    expect(preverMes({ ...base, diaAtual: 10, gastosVariaveis: 300, renda: 0 })).toBeNull();
  });

  it("projeta o fechamento no ritmo atual (dentro do limite)", () => {
    // 600 em 10 dias = 60/dia; 31 dias = 1860; + 1000 certos = 2860
    const p = preverMes({ ...base, diaAtual: 10, gastosVariaveis: 600 })!;

    expect(p.projetado).toBe(2860);
    expect(p.passaDoLimite).toBe(false);
    expect(p.diaDoEstouro).toBeNull();
    expect(p.percentual).toBeCloseTo(57.2, 1);
  });

  it("avisa o dia em que o limite estoura e quanto dá para gastar por dia", () => {
    // 1000 em 10 dias = 100/dia; projetado = 1000 + 3100 = 4100 > 3000
    const p = preverMes({ ...base, diaAtual: 10, gastosVariaveis: 1000 })!;

    expect(p.passaDoLimite).toBe(true);
    // limite 3000 - certos 1000 = 2000 de variável => no dia 20
    expect(p.diaDoEstouro).toBe(20);
    // folga = 3000 - 1000 - 1000 = 1000 em 21 dias restantes
    expect(p.porDiaParaSegurar).toBeCloseTo(47.62, 2);
  });
});

describe("lembretes de vencimento", () => {
  const hoje = new Date(2026, 9, 19); // 19/10/2026
  const aluguel = { id: 1, nome: "Aluguel", valor: 900, dia: 19, mesInicio: "2026-01", mesFim: null };
  const internet = { id: 2, nome: "Internet", valor: 100, dia: 20, mesInicio: "2026-01", mesFim: null };
  const longe = { id: 3, nome: "Academia", valor: 130, dia: 25, mesInicio: "2026-01", mesFim: null };

  it("lista o que vence hoje e amanhã e ignora o resto", () => {
    const itens = lembretesDoDia({ hoje, contas: [aluguel, internet, longe], pagamentos: [], cartoes: [] });

    expect(itens.map((i) => [i.nome, i.quando])).toEqual([
      ["Aluguel", "hoje"],
      ["Internet", "amanhã"],
    ]);
  });

  it("não lembra o que já foi pago, só do mês certo", () => {
    const itens = lembretesDoDia({
      hoje,
      contas: [aluguel, internet],
      pagamentos: [
        { chave: "conta:1", mes: "2026-10" },
        { chave: "conta:2", mes: "2026-09" }, // pago em outro mês não vale
      ],
      cartoes: [],
    });

    expect(itens.map((i) => i.nome)).toEqual(["Internet"]);
  });

  it("inclui a fatura do cartão quando vence e tem valor", () => {
    const cartoes = [{ nome: "Nubank", vencimento: 20, faturaPorMes: { "2026-10": 2227.76 } }];

    expect(lembretesDoDia({ hoje, contas: [], pagamentos: [], cartoes })).toEqual([
      { nome: "Fatura Nubank", valor: 2227.76, quando: "amanhã", dia: 20 },
    ]);
    expect(lembretesDoDia({ hoje, contas: [], pagamentos: [{ chave: "fatura:Nubank", mes: "2026-10" }], cartoes })).toEqual([]);
  });

  it("vira o mês: no dia 31, o vencimento do dia 1 conta como amanhã", () => {
    const dia1 = { id: 9, nome: "Escola", valor: 500, dia: 1, mesInicio: "2026-01", mesFim: null };
    const itens = lembretesDoDia({ hoje: new Date(2026, 9, 31), contas: [dia1], pagamentos: [], cartoes: [] });

    expect(itens).toEqual([{ nome: "Escola", valor: 500, quando: "amanhã", dia: 1 }]);
  });

  it("hoje em Brasília: 01:00 UTC ainda é o dia anterior", () => {
    const d = hojeEmBrasilia(new Date("2026-10-20T01:00:00Z"));

    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 19]);
  });
});
