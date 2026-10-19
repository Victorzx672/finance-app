import { arredondar } from "@/lib/calculos";
import { CATEGORIAS, type Categoria } from "@/lib/categorias";

// Leitura da fatura do cartão em CSV (o arquivo que o app do Nubank exporta:
// colunas date, category, title, amount). Tudo aqui é puro, sem tela nem banco.

export interface LinhaFatura {
  /** posição na planilha, usada como chave na tela */
  id: number;
  /** dia do mês da compra */
  dia: number | null;
  nome: string;
  valor: number;
  categoria: Categoria | null;
  /** compra parcelada: parcela deste mês e total */
  parcela: { atual: number; total: number } | null;
  /** já existe uma compra igual neste mês (a tela deixa desmarcada) */
  jaLancada: boolean;
}

export interface ResultadoFatura {
  linhas: LinhaFatura[];
  /** pagamentos, estornos e linhas sem valor que não viram compra */
  ignoradas: number;
  erro?: string;
}

/** minúsculas, sem acento e sem espaços repetidos: "Pão de Açúcar " -> "pao de acucar" */
export const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Divide o texto em linhas e colunas, respeitando aspas. Aceita vírgula ou ponto e vírgula. */
export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, "");
  const primeira = limpo.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];

    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }

  linha.push(campo);
  if (linha.some((x) => x.trim() !== "")) linhas.push(linha);

  return linhas;
}

/** "123.45", "1.234,56", "R$ 12,30" ou "-50" -> número (NaN se não der). */
export function lerValor(texto: string): number {
  let t = texto.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(t)) return NaN;
  const virgula = t.lastIndexOf(",");
  const ponto = t.lastIndexOf(".");

  // o último separador é o decimal; o outro, se houver, é de milhar
  if (virgula > ponto) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");

  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** "2026-10-05" ou "05/10/2026" -> dia do mês */
export function lerDia(texto: string): number | null {
  const iso = texto.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  const dia = iso ? Number(iso[3]) : br ? Number(br[1]) : NaN;

  return dia >= 1 && dia <= 31 ? dia : null;
}

/** "Amazon - Parcela 2/10" -> { nome: "Amazon", atual: 2, total: 10 } */
export function lerParcela(titulo: string): { nome: string; atual: number; total: number } | null {
  const m =
    titulo.match(/^(.*?)\s*[-–—]\s*parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i) ?? titulo.match(/^(.*?)\s+parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i);

  if (!m) return null;

  const atual = Number(m[2]);
  const total = Number(m[3]);

  return m[1].trim() && total >= 2 && total <= 60 && atual >= 1 && atual <= total
    ? { nome: m[1].trim(), atual, total }
    : null;
}

// Palavras-chave do nome da compra -> categoria (a primeira regra que bater vale)
const REGRAS: [Categoria, string[]][] = [
  // casos que as regras mais gerais abaixo errariam ("uber eats" não é transporte, "mercado livre" não é mercado)
  ["Mercado", ["uber eats", "ubereats"]],
  ["Compras", ["mercado livre", "mercadolivre"]],
  ["Assinaturas", ["netflix", "spotify", "prime video", "amazon prime", "disney", "hbo", "youtube", "crunchyroll", "claude", "openai", "chatgpt", "icloud", "apple.com", "google one", "deezer", "globoplay", "paramount"]],
  ["Transporte", ["uber", "99 corrida", "99corrida", "99pop", "99 pop", "cabify", "posto", "gasolina", "combustivel", "shell", "ipiranga", "estacionamento", "pedagio", "sem parar", "metro", "onibus"]],
  ["Mercado", ["ifood", "99 food", "99food", "rappi", "mercado", "supermercado", "padaria", "acougue", "hortifruti", "atacadao", "assai", "carrefour", "pao de acucar", "restaurante", "lanchonete", "pizza", "burger", "mc donald", "subway", "sorvete", "milk moon", "comida"]],
  ["Saúde", ["farmacia", "drogasil", "drogaria", "droga raia", "pacheco", "pague menos", "drogal", "unimed", "hospital", "clinica", "laboratorio", "dentista", "academia", "smart fit", "plano de saude"]],
  ["Educação", ["faculdade", "universidade", "curso", "udemy", "alura", "escola", "colegio", "livraria", "educa mais", "mensalidade"]],
  ["Lazer", ["cinema", "ingresso", "steam", "epic games", "playstation", "xbox", "nintendo", "shopping", "parque", "teatro", "show", "bar ", "cerveja", "hotel", "airbnb", "decolar", "viagem", "movida"]],
  ["Moradia", ["aluguel", "condominio", "enel", "cpfl", "sabesp", "energia", "agua e esgoto"]],
  ["Compras", ["amazon", "mercado livre", "mercadolivre", "shopee", "aliexpress", "magalu", "americanas", "shein", "renner", "zara", "riachuelo", "leroy", "kabum", "casas bahia", "loja"]],
  ["Outros", ["iof", "tarifa", "anuidade", "seguro"]],
];

// Categoria que o próprio arquivo do banco traz (em português ou inglês) -> a do app
const CATEGORIAS_DO_BANCO: Record<string, Categoria> = {
  restaurante: "Mercado",
  supermercado: "Mercado",
  alimentacao: "Mercado",
  transporte: "Transporte",
  saude: "Saúde",
  educacao: "Educação",
  lazer: "Lazer",
  viagem: "Lazer",
  vestuario: "Compras",
  compras: "Compras",
  casa: "Moradia",
  moradia: "Moradia",
  servicos: "Assinaturas",
  assinaturas: "Assinaturas",
  outros: "Outros",
};

/**
 * Escolhe a categoria de uma compra. Ordem: o que o usuário já usou para esse mesmo
 * nome, palavras-chave do nome, categoria do arquivo do banco. Sem pista, fica sem categoria.
 */
export function adivinharCategoria(
  nome: string,
  categoriaDoBanco: string | null,
  aprendidas: Map<string, Categoria>
): Categoria | null {
  const n = normalizar(nome);

  const conhecida = aprendidas.get(n);
  if (conhecida) return conhecida;

  for (const [categoria, palavras] of REGRAS) {
    if (palavras.some((p) => n.includes(p))) return categoria;
  }

  const doBanco = categoriaDoBanco ? CATEGORIAS_DO_BANCO[normalizar(categoriaDoBanco)] : undefined;
  return doBanco ?? null;
}

/** nome (normalizado) -> categoria, a partir do que o usuário já lançou */
export function categoriasAprendidas(itens: { nome: string; categoria?: string | null }[]) {
  const mapa = new Map<string, Categoria>();

  for (const i of itens) {
    if (i.categoria && (CATEGORIAS as readonly string[]).includes(i.categoria)) {
      mapa.set(normalizar(i.nome), i.categoria as Categoria);
    }
  }

  return mapa;
}

const COLUNAS = {
  data: ["date", "data"],
  nome: ["title", "titulo", "description", "descricao", "estabelecimento", "lancamento", "historico"],
  valor: ["amount", "valor", "value"],
  categoria: ["category", "categoria"],
};

const achar = (cabecalho: string[], nomes: string[]) => cabecalho.findIndex((c) => nomes.includes(normalizar(c)));

// Linhas que não são compras (pagamento da fatura, créditos)
const NAO_COMPRA = /pagamento (recebido|em |da fatura)|saldo restante|credito de|estorno/;

/**
 * Transforma o CSV da fatura em compras. Valores negativos (pagamentos e estornos)
 * ficam de fora. `existentes` são as compras que já estão no mês, para marcar repetidas.
 */
export function interpretarFatura(
  texto: string,
  existentes: { nome: string; valor: number }[] = [],
  aprendidas: Map<string, Categoria> = new Map()
): ResultadoFatura {
  const tabela = lerCsv(texto);

  if (tabela.length < 2) return { linhas: [], ignoradas: 0, erro: "O arquivo está vazio ou não parece uma fatura em CSV." };

  const cabecalho = tabela[0];
  const iData = achar(cabecalho, COLUNAS.data);
  const iNome = achar(cabecalho, COLUNAS.nome);
  const iValor = achar(cabecalho, COLUNAS.valor);
  const iCategoria = achar(cabecalho, COLUNAS.categoria);

  if (iNome < 0 || iValor < 0) {
    return {
      linhas: [],
      ignoradas: 0,
      erro: "Não encontrei as colunas de descrição e valor. Use o CSV exportado pelo app do banco (date, category, title, amount).",
    };
  }

  // quantas vezes cada compra já existe: cada uma só "cobre" uma linha do arquivo
  const restantes = new Map<string, number>();
  for (const e of existentes) {
    const chave = `${normalizar(e.nome)}|${arredondar(e.valor).toFixed(2)}`;
    restantes.set(chave, (restantes.get(chave) ?? 0) + 1);
  }

  const linhas: LinhaFatura[] = [];
  let ignoradas = 0;

  tabela.slice(1).forEach((cols, indice) => {
    const titulo = (cols[iNome] ?? "").trim();
    const valor = arredondar(lerValor(cols[iValor] ?? ""));

    if (!titulo || !Number.isFinite(valor) || valor <= 0 || NAO_COMPRA.test(normalizar(titulo))) {
      ignoradas++;
      return;
    }

    const parcela = lerParcela(titulo);
    const nome = (parcela?.nome ?? titulo).slice(0, 80);
    const chave = `${normalizar(nome)}|${valor.toFixed(2)}`;
    const jaLancada = (restantes.get(chave) ?? 0) > 0;

    if (jaLancada) restantes.set(chave, (restantes.get(chave) ?? 0) - 1);

    linhas.push({
      id: indice,
      dia: iData >= 0 ? lerDia(cols[iData] ?? "") : null,
      nome,
      valor,
      categoria: adivinharCategoria(nome, iCategoria >= 0 ? (cols[iCategoria] ?? "").trim() : null, aprendidas),
      parcela: parcela ? { atual: parcela.atual, total: parcela.total } : null,
      jaLancada,
    });
  });

  return { linhas, ignoradas };
}
