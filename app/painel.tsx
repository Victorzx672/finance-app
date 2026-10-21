"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  LIMITE_GASTOS_PERCENT,
  agruparPorCategoria,
  calcularResumo,
  passouDoLimite,
  somar,
} from "@/lib/calculos";
import { serieGuardado, type SaldoMes } from "@/lib/evolucao-guardado";
import { FILTRO_VAZIO, type FiltroGastos } from "@/lib/filtro";
import { gastosPorPessoa } from "@/lib/pessoas";
import { anoDe, chaveMes, faixaDeAnos, labelCurto, labelMes } from "@/lib/meses";
import { gerarDicas } from "@/lib/dicas";
import { passosParaGuardar } from "@/lib/investimentos";
import {
  MESES_RESERVA_IDEAL,
  faltaParaMeta,
  mesesDeReserva,
  metaPrincipal,
  progressoMeta,
  totalGuardado,
  type MetaDinheiro,
} from "@/lib/metas";
import { somarMes } from "@/lib/parcelas";
import { serializarMes, type DadosDoMes } from "@/lib/payload-mes";
import { preverMes } from "@/lib/previsao";
import { diasAteVencimento, pedeAtencao, situacaoConta, ultimoDiaDoMes } from "@/lib/vencimentos";
import { reduzMovimento } from "./animacao";
import { JanelaAtalhos, digitando } from "./atalhos";
import { AvisoLimite } from "./aviso-limite";
import { PrevisaoMes } from "./previsao-mes";
import { AvisoVencimentos, type ItemVencimento } from "./aviso-vencimentos";
import { CartaoInfo } from "./cartao-info";
import { PainelComparacao } from "./comparacao";
import { PainelContasFixas, type EdicaoConta } from "./contas-fixas";
import {
  PREFERENCIAS_PADRAO,
  buscarContas,
  buscarFinanca,
  buscarGastosDoMes,
  buscarGuardado,
  buscarHistorico,
  buscarMetas,
  buscarParcelas,
  buscarPreferencias,
  buscarRendasFixas,
  type ContaFixaItem,
  type FinancaDoMes,
  type GastosDoMes,
  type HistoricoMes,
  type Preferencias,
  type RendaFixaItem,
} from "./dados";
import { FontesRenda, novaFonte, type FonteRenda } from "./fontes-renda";
import { PainelCategorias, PainelEvolucao, PainelEvolucaoGuardado, PainelPessoas, PainelProjecao } from "./graficos";
import { PainelDicas } from "./dicas";
import { AcaoGuardar, CartaoGuardado } from "./guardado";
import {
  IconeAlerta,
  IconeAlvo,
  IconeCalendario,
  IconeCarteira,
  IconeCheck,
  IconeLua,
  IconeMais,
  IconeOlho,
  IconeRelogio,
  IconeSol,
  IconeTendencia,
  IconeX,
} from "./icones";
import { ImportarFatura, type ItemImportado } from "./importar-fatura";
import { Kpi } from "./kpi";
import { Lancamentos } from "./lancamentos";
import { ListaGastos, type EdicaoGasto } from "./lista-gastos";
import { CartaoLimite } from "./medidor";
import { Modal, useConfirmacao } from "./modal";
import { PainelMetas, type DadosMeta } from "./metas";
import { ABAS, BarraInferior, BarraLateral, Marca, MenuUsuario, type Aba } from "./navegacao";
import { NovoGasto, type NovoGastoDados } from "./novo-gasto";
import { PainelPreferencias } from "./preferencias";
import { RendasFixas, type EdicaoRendaFixa } from "./rendas-fixas";
import { PainelAno } from "./resumo-ano";
import { SeletorMes } from "./seletor-mes";
import { InputField, fmt, numero, type Gasto } from "./ui";

const MES_ATUAL = chaveMes(new Date());
const ANO_ATUAL = new Date().getFullYear();
const CARTAO = "Nubank";

/** Atalhos de porcentagem a investir. */
const PERCENTUAIS_RAPIDOS = [10, 20, 30, 50];

const SUBTITULO_ABA: Record<Exclude<Aba, "mes">, string> = {
  metas: "Quanto você já guardou e o que falta para cada objetivo.",
  ano: "Como foi o ano, mês a mês.",
  dicas: "Onde dá para gastar menos e como guardar com segurança.",
  prefs: "Avisos, pessoas, orçamentos e dados do cartão.",
};

const saudacao = () => {
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

const lerArmazenado = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};

const gravarArmazenado = (chave: string, valor: string) => {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento (modo privado): a preferência só vale nesta sessão
  }
};

function BotaoTopo({
  titulo,
  onClick,
  ativo,
  classe = "",
  children,
}: {
  titulo: string;
  onClick: () => void;
  ativo?: boolean;
  classe?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`btn-topo ${ativo ? "btn-topo--ativo" : ""} ${classe}`}
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function Painel({ nomeUsuario, onSair }: { nomeUsuario?: string | null; onSair: () => void }) {
  // Dados do mês
  const [rendas, setRendas] = useState<FonteRenda[]>([]); // rendas extras, só deste mês
  const [rendasFixas, setRendasFixas] = useState<RendaFixaItem[]>([]); // se repetem todo mês
  const [gastosFixos, setGastosFixos] = useState(0);
  const [gastosVariaveis, setGastosVariaveis] = useState(0);
  const [percentualInvestimento, setPercentualInvestimento] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelas, setParcelas] = useState<Gasto[]>([]);
  const [contas, setContas] = useState<ContaFixaItem[]>([]);
  const [pagos, setPagos] = useState<string[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(MES_ATUAL);
  const [mesCarregado, setMesCarregado] = useState<string | null>(null);
  // Conteúdo do mês como estava no último salvamento (ou ao abrir). Diferente do
  // conteúdo atual = há alterações não salvas.
  const [salvoJson, setSalvoJson] = useState<string | null>(null);
  // Ação adiada porque há alterações não salvas (sair, trocar de mês...)
  const [pendente, setPendente] = useState<{ rotulo: string; acao: () => void } | null>(null);

  // Dados gerais
  const [historico, setHistorico] = useState<HistoricoMes[]>([]);
  const [metas, setMetas] = useState<MetaDinheiro[]>([]);
  const [guardadoGeral, setGuardadoGeral] = useState(0);
  const [saldos, setSaldos] = useState<SaldoMes[]>([]);
  const [investGuardado, setInvestGuardado] = useState(0); // do "para investir" deste mês, quanto já foi guardado
  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_PADRAO);
  const [prefsCarregadas, setPrefsCarregadas] = useState(false);

  // Tela
  const [aba, setAba] = useState<Aba>("mes");
  const [filtro, setFiltro] = useState<FiltroGastos>(FILTRO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ id: number; tipo: "ok" | "error"; texto: string } | null>(null);
  const [anterior, setAnterior] = useState<{ mes: string; dados: FinancaDoMes } | null>(null);
  const [comparativo, setComparativo] = useState<{ mes: string; dados: GastosDoMes | null } | null>(null);
  const [novoGasto, setNovoGasto] = useState(false);
  const [atalhos, setAtalhos] = useState(false);
  const [ocultar, setOcultar] = useState(() => lerArmazenado("fluxopay-ocultar") === "1");
  const [escuro, setEscuro] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.tema === "escuro"
  );

  const { confirmar, dialogo } = useConfirmacao();

  const ehMesAtual = mesSelecionado === MES_ATUAL;

  // ── Valores calculados ──────────────────────────────────────────────────────

  const renda = somar([...rendasFixas, ...rendas]);
  const totalContas = somar(contas);

  // Parcelas vêm da API (não entram no salvamento do mês) e se juntam aos gastos do mês
  const todosGastos = [...gastos, ...parcelas];
  const gastosAvulsos = todosGastos.filter((g) => !g.cartao);
  const gastosNubank = todosGastos.filter((g) => g.cartao === CARTAO);
  const totalNubank = somar(gastosNubank);

  const principal = metaPrincipal(metas);
  const faltaMeta = principal ? faltaParaMeta(principal) : 0;

  const resumo = calcularResumo({
    renda,
    gastosFixos: gastosFixos + totalContas,
    gastosVariaveis,
    gastosDetalhados: somar(todosGastos),
    percentualInvestimento,
    meta: faltaMeta,
  });

  const { saldo, investimento, livre, percentGastos, mesesParaMeta, totalGastos, limiteGastos, folgaLimite, statusLimite } =
    resumo;

  // Previsão: só no mês em andamento e enquanto o limite ainda não estourou (aí o aviso de limite já fala)
  const previsao =
    ehMesAtual && statusLimite !== "excedido"
      ? preverMes({
          mes: mesSelecionado,
          diaAtual: new Date().getDate(),
          renda,
          gastosCertos: gastosFixos + totalContas + somar(parcelas),
          gastosVariaveis: gastosVariaveis + somar(todosGastos.filter((g) => !g.parcela)),
          limite: limiteGastos,
        })
      : null;

  const linhasPessoa = gastosPorPessoa(todosGastos, prefs.pessoas);
  const linhasCategoria = agruparPorCategoria([...todosGastos, ...contas], gastosFixos, gastosVariaveis);

  const contasPendentes = contas.filter((c) => !pagos.includes(`conta:${c.id}`));
  const totalAPagar = somar(contasPendentes);

  const configCartao = prefs.cartoes[CARTAO];
  const faturaPaga = pagos.includes(`fatura:${CARTAO}`);

  /** Contas atrasadas ou perto de vencer (só no mês atual). */
  const vencimentos: ItemVencimento[] = ehMesAtual
    ? [
        ...contasPendentes.map((c) => ({ nome: c.nome, dia: c.dia })),
        ...(configCartao?.vencimento && totalNubank > 0 && !faturaPaga
          ? [{ nome: `Fatura ${CARTAO}`, dia: configCartao.vencimento }]
          : []),
      ]
        .map((i) => ({
          nome: i.nome,
          dias: diasAteVencimento(i.dia, mesSelecionado),
          situacao: situacaoConta({ dia: i.dia, mes: mesSelecionado, paga: false }),
        }))
        .filter((i) => pedeAtencao(i.situacao))
        .sort((a, b) => a.dias - b.dias)
    : [];

  // Seletor de mês: quais meses já têm dados e até onde vai a escolha de ano
  const mesesComDados = new Set(historico.map((h) => h.mesReferencia));
  const faixaAnos = faixaDeAnos(ANO_ATUAL, mesesComDados);

  // Só salva depois que os dados do mês selecionado foram lidos do servidor
  const carregado = mesCarregado === mesSelecionado;

  // Alterações não salvas: o que está na tela difere do último salvamento
  const payloadJson = serializarMes({
    mes: mesSelecionado,
    rendas,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    gastos,
  });
  const alterado = carregado && salvoJson !== null && payloadJson !== salvoJson;

  // Mês sem nada preenchido: oferece copiar do mês anterior
  const mesVazio =
    carregado &&
    somar(rendas) === 0 &&
    gastosFixos === 0 &&
    gastosVariaveis === 0 &&
    gastos.length === 0 &&
    parcelas.length === 0 &&
    contas.length === 0;

  const sugestao = mesVazio && anterior?.mes === mesSelecionado ? anterior.dados : null;
  const dadosComparativo = comparativo?.mes === mesSelecionado ? comparativo.dados : undefined;

  // Aba Dicas: onde cortar (com os números do mês) e o guia de guardar com segurança
  const dicas = gerarDicas({
    renda,
    totalGastos,
    categorias: agruparPorCategoria([...todosGastos, ...contas], gastosFixos, gastosVariaveis),
    orcamentos: prefs.orcamentos,
    anterior: dadosComparativo ?? null,
    compras: todosGastos,
    assinaturas: [...todosGastos, ...contas].filter((i) => i.categoria === "Assinaturas"),
    gastosFixos: gastosFixos + totalContas,
    parcelasDoMes: somar(parcelas),
    limiteCartao: configCartao?.limite ?? null,
    usadoCartao: totalNubank,
  });

  const passos = passosParaGuardar({
    mesesDeReserva: mesesDeReserva(metas, totalGastos),
    mesesIdeais: MESES_RESERVA_IDEAL,
    temMetaDeReserva: metas.some((m) => m.reserva),
    saldoDoMes: saldo,
  });

  // "Livre para gastar" dividido pelos dias que faltam (só no mês em andamento)
  const diasRestantes = ehMesAtual ? ultimoDiaDoMes(mesSelecionado) - new Date().getDate() + 1 : 0;
  const livrePorDia = diasRestantes > 0 && livre > 0 ? livre / diasRestantes : 0;

  const serieTotalGuardado = serieGuardado(saldos, MES_ATUAL);

  // ── Carregamento ────────────────────────────────────────────────────────────
  // Os fetches são puros (ver dados.ts). O resultado só é aplicado depois do
  // await, e é ignorado se o mês mudou no meio do caminho.

  const carregarHistorico = async () => setHistorico(await buscarHistorico());
  const carregarParcelas = async (mes: string) => setParcelas(await buscarParcelas(mes));

  const carregarContas = async (mes: string) => {
    const dados = await buscarContas(mes);
    setContas(dados.contas);
    setPagos(dados.pagos);
  };

  const carregarRendasFixas = async (mes: string) => setRendasFixas(await buscarRendasFixas(mes));

  useEffect(() => {
    let cancelado = false;

    Promise.all([buscarHistorico(), buscarMetas(), buscarGuardado(), buscarPreferencias()]).then(
      ([h, m, g, p]) => {
        if (cancelado) return;
        setHistorico(h);
        setMetas(m);
        setGuardadoGeral(g.geral);
        setSaldos(g.saldos);
        setPrefs(p);
        setPrefsCarregadas(true);
      }
    );

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    buscarParcelas(mesSelecionado).then((dados) => {
      if (!cancelado) setParcelas(dados);
    });

    buscarContas(mesSelecionado).then((dados) => {
      if (cancelado) return;
      setContas(dados.contas);
      setPagos(dados.pagos);
    });

    buscarRendasFixas(mesSelecionado).then((dados) => {
      if (!cancelado) setRendasFixas(dados);
    });

    buscarGastosDoMes(somarMes(mesSelecionado, -1)).then((dados) => {
      if (!cancelado) setComparativo({ mes: mesSelecionado, dados });
    });

    return () => {
      cancelado = true;
    };
  }, [mesSelecionado]);

  useEffect(() => {
    let cancelado = false;

    buscarFinanca(mesSelecionado).then((dados) => {
      // Se falhar, "carregado" continua falso: sem leitura não dá para salvar, e
      // assim nunca se grava zero por cima de dados reais.
      if (cancelado || !dados) return;

      const rendasCarregadas = dados.rendas;
      const fixos = dados.finance?.gastosFixos ?? 0;
      const variaveis = dados.finance?.gastosVariaveis ?? 0;
      const percentual = dados.finance?.percentualInvestimento ?? 0;

      setRendas(rendasCarregadas);
      setGastosFixos(fixos);
      setGastosVariaveis(variaveis);
      setPercentualInvestimento(percentual);
      setGastos(dados.gastos);
      setInvestGuardado(dados.finance?.investimentoGuardado ?? 0);

      // O que veio do servidor é o ponto de partida: ainda não há nada a salvar
      setSalvoJson(
        serializarMes({
          mes: mesSelecionado,
          rendas: rendasCarregadas,
          gastosFixos: fixos,
          gastosVariaveis: variaveis,
          percentualInvestimento: percentual,
          gastos: dados.gastos,
        })
      );
      setMesCarregado(mesSelecionado);
    });

    return () => {
      cancelado = true;
    };
  }, [mesSelecionado]);

  // Busca o mês anterior só quando o mês atual está vazio
  useEffect(() => {
    if (!mesVazio) return;

    let cancelado = false;

    buscarFinanca(somarMes(mesSelecionado, -1)).then((dados) => {
      const f = dados?.finance;

      if (!cancelado && dados && f && (f.renda > 0 || f.gastosFixos > 0)) {
        setAnterior({ mes: mesSelecionado, dados });
      }
    });

    return () => {
      cancelado = true;
    };
  }, [mesVazio, mesSelecionado]);

  // Tema escuro: aplica na página e lembra a escolha
  useEffect(() => {
    document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
    gravarArmazenado("fluxopay-tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  // ── Ações ───────────────────────────────────────────────────────────────────

  const mostrarAviso = (tipo: "ok" | "error", texto: string, duracaoMs = 6000) => {
    const id = Date.now();
    setAviso({ id, tipo, texto });
    // só some se ainda for o mesmo aviso (um novo aviso não é apagado pelo timer do anterior)
    setTimeout(() => setAviso((atual) => (atual?.id === id ? null : atual)), duracaoMs);
  };

  // ── Salvar (manual) ─────────────────────────────────────────────────────────
  // Nada é gravado sozinho: o mês só vai para o servidor quando o usuário clica em
  // "Salvar" (ou aperta Ctrl+S). Parcelas, contas fixas, metas e pagamentos são
  // ações próprias (têm seus botões) e continuam valendo na hora.

  const salvar = async () => {
    if (!carregado || salvando) return false;

    setSalvando(true);
    const enviado = payloadJson;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: enviado,
      });

      if (!res.ok) {
        mostrarAviso("error", "Não foi possível salvar. Suas alterações continuam aqui; tente de novo.");
        return false;
      }

      // Se o usuário continuou digitando durante o envio, o que sobrou ainda conta como alteração
      setSalvoJson(enviado);
      await carregarHistorico();
      mostrarAviso("ok", "Alterações salvas.", 2500);
      return true;
    } catch {
      mostrarAviso("error", "Sem conexão. Suas alterações continuam aqui; tente salvar de novo.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  /** Volta o mês para como estava no último salvamento. */
  const descartar = async () => {
    if (!salvoJson) return;

    const ok = await confirmar({
      titulo: "Descartar as alterações?",
      texto: `Os dados de ${labelMes(mesSelecionado)} voltam a ficar como estavam no último salvamento.`,
      botao: "Descartar",
      perigo: true,
    });
    if (!ok) return;

    const salvo = JSON.parse(salvoJson) as DadosDoMes;
    // uma extra que virou fixa ("Tornar fixa") não volta, senão contaria duas vezes
    const extras = salvo.rendas.filter((r) => !rendasFixas.some((f) => f.nome === r.nome && f.valor === r.valor));
    setRendas(extras.map((r) => ({ ...r, id: crypto.randomUUID() })));
    setGastosFixos(salvo.gastosFixos);
    setGastosVariaveis(salvo.gastosVariaveis);
    setPercentualInvestimento(salvo.percentualInvestimento);
    setGastos(salvo.gastos.map((g) => ({ ...g, id: crypto.randomUUID() })));
    mostrarAviso("ok", "Alterações descartadas.", 2500);
  };

  // Fechar a aba, recarregar ou voltar com alterações não salvas: o navegador avisa
  useEffect(() => {
    if (!alterado) return;

    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  /** Executa a ação já, ou pergunta antes se há alterações não salvas. */
  const protegerSaida = (rotulo: string, acao: () => void) => {
    if (alterado) setPendente({ rotulo, acao });
    else acao();
  };

  const mudarMes = (novo: string) => {
    if (novo !== mesSelecionado) protegerSaida("trocar de mês", () => setMesSelecionado(novo));
  };

  const pedirSaida = () => protegerSaida("sair", onSair);

  const irParaAba = (nova: Aba) => {
    setAba(nova);
    window.scrollTo({ top: 0, behavior: reduzMovimento() ? "auto" : "smooth" });
  };

  const salvarEContinuar = async () => {
    if (!pendente) return;

    if (await salvar()) {
      const { acao } = pendente;
      setPendente(null);
      acao();
    }
  };

  const continuarSemSalvar = () => {
    if (!pendente) return;

    const { acao } = pendente;
    setPendente(null);
    acao();
  };

  const alternarOcultar = () => {
    gravarArmazenado("fluxopay-ocultar", ocultar ? "0" : "1");
    setOcultar(!ocultar);
  };

  /** Troca o tema com uma transição suave (onde o navegador permite). */
  const alternarTema = () => {
    const trocar = () =>
      flushSync(() => {
        document.documentElement.dataset.tema = escuro ? "claro" : "escuro";
        setEscuro(!escuro);
      });

    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };

    if (doc.startViewTransition && !reduzMovimento()) doc.startViewTransition(trocar);
    else trocar();
  };

  const abrirNovoGasto = () => {
    if (carregado) setNovoGasto(true);
  };

  // Atalhos do teclado (veja atalhos.tsx). Ctrl+S salva mesmo dentro de um campo.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (alterado) salvar();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || digitando(e.target) || document.querySelector(".modal-fundo")) return;

      const tecla = e.key.toLowerCase();

      if (tecla === "n") {
        e.preventDefault();
        abrirNovoGasto();
      } else if (e.key === "?") {
        setAtalhos(true);
      } else if (tecla === "o") {
        alternarOcultar();
      } else if (tecla === "t") {
        alternarTema();
      } else if (/^[1-5]$/.test(e.key)) {
        irParaAba(ABAS[Number(e.key) - 1].id);
      } else if (aba === "mes" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const novo = somarMes(mesSelecionado, e.key === "ArrowLeft" ? -1 : 1);
        if (anoDe(novo) >= faixaAnos.min && anoDe(novo) <= faixaAnos.max) mudarMes(novo);
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  const enviarResumo = async () => {
    try {
      const res = await fetch("/api/resumo-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: mesSelecionado }),
      });
      const data = await res.json();

      if (res.ok) mostrarAviso("ok", `Resumo de ${labelMes(mesSelecionado)} enviado para ${data.para}.`);
      else mostrarAviso("error", data.error ?? "Não foi possível enviar o resumo.");
    } catch {
      mostrarAviso("error", "Não foi possível conectar ao servidor.");
    }
  };

  /** Chamada de API que devolve uma mensagem de erro (ou null). */
  const chamar = async (url: string, metodo: string, corpo?: object) => {
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });

      return res.ok ? null : ((await res.json()).error as string | undefined) ?? "Não foi possível salvar.";
    } catch {
      return "Não foi possível conectar ao servidor.";
    }
  };

  // Gastos avulsos e do cartão
  const adicionarGasto =
    (cartao: string | null) =>
    (nome: string, valor: number, categoria: string | null, dia: number | null, pessoa: string | null) =>
      setGastos((prev) => [...prev, { id: crypto.randomUUID(), nome, valor, cartao, categoria, dia, pessoa }]);

  const adicionarParcelado =
    (cartao: string | null) =>
    async (
      nome: string,
      valorParcela: number,
      parcelaAtual: number,
      totalParcelas: number,
      categoria: string | null,
      pessoa: string | null
    ) => {
      const falha = await chamar("/api/parcelamentos", "POST", {
        nome,
        valorParcela,
        totalParcelas,
        parcelaAtual,
        mes: mesSelecionado,
        cartao,
        categoria,
        pessoa,
      });

      if (!falha) await Promise.all([carregarParcelas(mesSelecionado), carregarHistorico()]);
      return falha;
    };

  /** Lançamento rápido (botão "+"): à vista entra como alteração do mês; parcelada grava na hora. */
  const lancarRapido = async (d: NovoGastoDados) => {
    const cartao = d.destino === "cartao" ? CARTAO : null;

    if (d.parcelas) {
      const falha = await adicionarParcelado(cartao)(
        d.nome,
        d.valor,
        d.parcelas.atual,
        d.parcelas.total,
        d.categoria,
        d.pessoa
      );
      if (!falha) mostrarAviso("ok", `"${d.nome}" cadastrada em ${d.parcelas.total}x.`, 3000);
      return falha;
    }

    adicionarGasto(cartao)(d.nome, d.valor, d.categoria, d.dia, d.pessoa);
    mostrarAviso("ok", `"${d.nome}" adicionado. Não esqueça de salvar.`, 3500);
    return null;
  };

  /**
   * Lança as compras de uma fatura importada. As à vista entram no mês como alterações
   * (falta Salvar); as parceladas são gravadas na hora, como qualquer compra parcelada.
   */
  const importarFatura = async (itens: ItemImportado[], pessoa: string | null) => {
    const parceladas = itens.filter((i) => i.parcela);
    const aVista = itens.filter((i) => !i.parcela);
    let falhas = 0;

    for (const p of parceladas) {
      const falha = await chamar("/api/parcelamentos", "POST", {
        nome: p.nome,
        valorParcela: p.valor,
        totalParcelas: p.parcela!.total,
        parcelaAtual: p.parcela!.atual,
        mes: mesSelecionado,
        cartao: CARTAO,
        categoria: p.categoria,
        pessoa,
      });

      if (falha) falhas++;
    }

    if (parceladas.length > 0) await Promise.all([carregarParcelas(mesSelecionado), carregarHistorico()]);

    if (aVista.length > 0) {
      setGastos((prev) => [
        ...prev,
        ...aVista.map((i) => ({
          id: crypto.randomUUID(),
          nome: i.nome,
          valor: i.valor,
          cartao: CARTAO,
          categoria: i.categoria,
          dia: i.dia,
          pessoa,
        })),
      ]);
    }

    if (falhas === parceladas.length && aVista.length === 0) return "Não foi possível cadastrar as compras parceladas.";

    mostrarAviso(
      falhas > 0 ? "error" : "ok",
      falhas > 0
        ? `${itens.length - falhas} compras importadas; ${falhas} parceladas não puderam ser cadastradas.`
        : `${itens.length} compras importadas. Confira e clique em Salvar.`
    );

    return null;
  };

  const editarItem = async (gasto: Gasto, novo: EdicaoGasto) => {
    if (!gasto.parcela) {
      setGastos((prev) => prev.map((g) => (g.id === gasto.id ? { ...g, ...novo } : g)));
      return null;
    }

    const falha = await chamar("/api/parcelamentos", "PATCH", {
      id: gasto.parcela.parcelamentoId,
      nome: novo.nome,
      valorParcela: novo.valor,
      categoria: novo.categoria,
      pessoa: novo.pessoa,
    });

    if (!falha) await Promise.all([carregarParcelas(mesSelecionado), carregarHistorico()]);
    return falha;
  };

  const removerItem = async (gasto: Gasto) => {
    if (!gasto.parcela) {
      setGastos((prev) => prev.filter((g) => g.id !== gasto.id));
      return;
    }

    const { parcelamentoId, total } = gasto.parcela;

    const ok = await confirmar({
      titulo: "Remover compra parcelada?",
      texto: `"${gasto.nome}" está parcelada em ${total}x. Remover apaga as ${total} parcelas, em todos os meses.`,
      botao: `Remover as ${total} parcelas`,
      perigo: true,
    });
    if (!ok) return;

    await chamar(`/api/parcelamentos?id=${parcelamentoId}`, "DELETE");
    await Promise.all([carregarParcelas(mesSelecionado), carregarHistorico()]);
  };

  // Contas fixas
  const adicionarConta = async (nova: EdicaoConta) => {
    const falha = await chamar("/api/contas-fixas", "POST", { ...nova, mes: mesSelecionado });
    if (!falha) await Promise.all([carregarContas(mesSelecionado), carregarHistorico()]);
    return falha;
  };

  const editarConta = async (conta: ContaFixaItem, novo: EdicaoConta) => {
    const falha = await chamar("/api/contas-fixas", "PATCH", { id: conta.id, mes: mesSelecionado, ...novo });
    if (!falha) await Promise.all([carregarContas(mesSelecionado), carregarHistorico()]);
    return falha;
  };

  const removerConta = async (conta: ContaFixaItem) => {
    const ok = await confirmar({
      titulo: `Remover "${conta.nome}"?`,
      texto: `A conta sai de ${labelMes(mesSelecionado)} em diante. Os meses anteriores continuam com ela.`,
      botao: "Remover",
      perigo: true,
    });
    if (!ok) return;

    await chamar(`/api/contas-fixas?id=${conta.id}&mes=${mesSelecionado}`, "DELETE");
    await Promise.all([carregarContas(mesSelecionado), carregarHistorico()]);
  };

  const pagar = async (chave: string, pago: boolean) => {
    // atualiza na hora; se o servidor recusar, volta ao que estava
    setPagos((prev) => (pago ? [...prev, chave] : prev.filter((p) => p !== chave)));

    const falha = await chamar("/api/pagamentos", "PUT", { chave, mes: mesSelecionado, pago });

    if (falha) {
      mostrarAviso("error", falha);
      await carregarContas(mesSelecionado);
    }
  };

  // Rendas fixas (valem todo mês, deste em diante; gravadas na hora como as contas fixas)
  const atualizarRendas = () => Promise.all([carregarRendasFixas(mesSelecionado), carregarHistorico()]);

  const adicionarRendaFixa = async (nova: EdicaoRendaFixa) => {
    const falha = await chamar("/api/rendas-fixas", "POST", { ...nova, mes: mesSelecionado });
    if (!falha) await atualizarRendas();
    return falha;
  };

  const editarRendaFixa = async (renda: RendaFixaItem, nova: EdicaoRendaFixa) => {
    const falha = await chamar("/api/rendas-fixas", "PATCH", { id: renda.id, mes: mesSelecionado, ...nova });
    if (!falha) await atualizarRendas();
    return falha;
  };

  const removerRendaFixa = async (renda: RendaFixaItem) => {
    const ok = await confirmar({
      titulo: `Remover "${renda.nome}"?`,
      texto: `A renda sai de ${labelMes(mesSelecionado)} em diante. Os meses anteriores continuam com ela.`,
      botao: "Remover",
      perigo: true,
    });
    if (!ok) return;

    await chamar(`/api/rendas-fixas?id=${renda.id}&mes=${mesSelecionado}`, "DELETE");
    await atualizarRendas();
  };

  /** Uma renda extra deste mês passa a ser fixa: entra em todos os meses, deste em diante. */
  const tornarRendaFixa = async (fonte: FonteRenda) => {
    const falha = await chamar("/api/rendas-fixas", "POST", {
      nome: fonte.nome.trim(),
      valor: fonte.valor,
      mes: mesSelecionado,
    });

    if (falha) {
      mostrarAviso("error", falha);
      return;
    }

    // Sai das extras (senão contaria duas vezes). Isso é uma alteração do mês: falta Salvar.
    setRendas((prev) => prev.filter((r) => r.id !== fonte.id));
    await atualizarRendas();
    mostrarAviso("ok", `"${fonte.nome.trim()}" agora é fixa. Clique em Salvar para concluir.`);
  };

  // Dinheiro guardado
  const recarregarGuardado = async () => {
    const g = await buscarGuardado();
    setGuardadoGeral(g.geral);
    setSaldos(g.saldos);
  };

  const aportarGuardado = async (aporte: number) => {
    const falha = await chamar("/api/guardado", "PUT", { aporte });
    if (!falha) await recarregarGuardado();
    return falha;
  };

  /** "Guardei o que sobrou": soma (ou ajusta) o "para investir" do mês no total guardado. */
  const guardarInvestimento = async (valor: number) => {
    const falha = await chamar("/api/guardado/investimento", "POST", { mes: mesSelecionado, valor });

    if (falha) {
      mostrarAviso("error", falha);
      return false;
    }

    setInvestGuardado(valor);
    await recarregarGuardado();
    mostrarAviso("ok", valor > 0 ? "Somado ao total guardado." : "Valor tirado do total guardado.", 3000);
    return true;
  };

  // Metas
  const recarregarMetas = async () => {
    setMetas(await buscarMetas());
    await recarregarGuardado();
  };

  const criarMeta = async (dados: DadosMeta) => {
    const falha = await chamar("/api/metas", "POST", dados);
    if (!falha) await recarregarMetas();
    return falha;
  };

  const editarMeta = async (meta: MetaDinheiro, dados: DadosMeta) => {
    const falha = await chamar("/api/metas", "PATCH", { id: meta.id, ...dados });
    if (!falha) await recarregarMetas();
    return falha;
  };

  const aportarMeta = async (meta: MetaDinheiro, valor: number) => {
    const falha = await chamar("/api/metas", "PATCH", { id: meta.id, aporte: valor });
    if (!falha) await recarregarMetas();
    return falha;
  };

  const removerMeta = async (meta: MetaDinheiro) => {
    const ok = await confirmar({
      titulo: `Remover a meta "${meta.nome}"?`,
      texto:
        meta.guardado > 0
          ? `Ela tem ${fmt(meta.guardado)} guardados, que deixam de contar no total guardado.`
          : "Essa ação não pode ser desfeita.",
      botao: "Remover meta",
      perigo: true,
    });
    if (!ok) return;

    await chamar(`/api/metas?id=${meta.id}`, "DELETE");
    await recarregarMetas();
  };

  const salvarPrefs = async (novas: Preferencias) => {
    const falha = await chamar("/api/preferencias", "PUT", novas);
    if (!falha) setPrefs(await buscarPreferencias());
    return falha;
  };

  const copiarDoMesAnterior = (comCompras: boolean) => {
    const f = sugestao?.finance;
    if (!sugestao || !f) return;

    // Com rendas fixas cadastradas, a renda do mês já vem delas: copiar as extras do mês
    // anterior contaria o salário duas vezes. Sem rendas fixas, copia as fontes (ou, se o
    // mês antigo não tinha, o total como uma só).
    if (rendasFixas.length === 0) {
      setRendas(
        sugestao.rendas.length > 0
          ? sugestao.rendas.map((r) => ({ ...r, id: crypto.randomUUID() }))
          : [{ ...novaFonte(), nome: "Renda", valor: f.renda }]
      );
    }
    setGastosFixos(f.gastosFixos);
    setGastosVariaveis(f.gastosVariaveis);
    setPercentualInvestimento(f.percentualInvestimento);

    if (comCompras) {
      setGastos(sugestao.gastos.map((g) => ({ ...g, id: crypto.randomUUID() })));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  const nome = nomeUsuario ?? "você";
  const abaAtual = ABAS.find((a) => a.id === aba)!;
  const statusSalvo = salvando ? "saving" : alterado ? "nao-salvo" : "";

  const cartaoGuardado = (
    <CartaoGuardado
      total={totalGuardado(metas, guardadoGeral)}
      semMeta={guardadoGeral}
      naMetas={totalGuardado(metas, 0)}
      quantidadeMetas={metas.length}
      serie={serieTotalGuardado}
      onAporte={aportarGuardado}
    />
  );

  return (
    <div className={`app-shell ${ocultar ? "oculto" : ""} ${alterado ? "com-barra" : ""}`}>
      <BarraLateral aba={aba} onAba={irParaAba}>
        <div className="sidebar-dica">
          <strong>Dica</strong>
          <p>
            Aperte <kbd>N</kbd> para lançar um gasto e <kbd>?</kbd> para ver todos os atalhos.
          </p>
        </div>
      </BarraLateral>

      <div className="app-conteudo">
        <header className="topbar">
          <div className="topbar-marca">
            <Marca pequena />
          </div>

          <div className="topbar-titulo">
            <h1>{aba === "mes" ? `${saudacao()}, ${nome}` : abaAtual.rotulo}</h1>
            <p>{aba === "mes" ? `Resumo de ${labelMes(mesSelecionado)}` : SUBTITULO_ABA[aba]}</p>
          </div>

          <div className="topbar-acoes">
            <span className={`save-status ${statusSalvo}`} role="status">
              <span className="save-dot" />
              <span className="save-text">
                {salvando ? "Salvando..." : alterado ? "Não salvo" : "Tudo salvo"}
              </span>
            </span>

            <BotaoTopo titulo={ocultar ? "Mostrar valores (O)" : "Ocultar valores (O)"} onClick={alternarOcultar} ativo={ocultar}>
              <IconeOlho size={18} fechado={ocultar} />
            </BotaoTopo>

            <BotaoTopo titulo={escuro ? "Modo claro (T)" : "Modo escuro (T)"} onClick={alternarTema} classe="so-computador">
              {escuro ? <IconeSol size={18} /> : <IconeLua size={18} />}
            </BotaoTopo>

            <button className="btn btn-primary btn-sm so-computador" onClick={abrirNovoGasto} disabled={!carregado}>
              <IconeMais size={17} />
              Novo gasto
            </button>

            <MenuUsuario
              nome={nome}
              escuro={escuro}
              ocultar={ocultar}
              onTema={alternarTema}
              onOcultar={alternarOcultar}
              onResumo={enviarResumo}
              onAtalhos={() => setAtalhos(true)}
              onSair={pedirSaida}
            />
          </div>
        </header>

        <main className="app-main" key={aba}>
          {aba === "metas" && (
            <>
              {cartaoGuardado}
              <PainelMetas
                metas={metas}
                investimento={investimento}
                gastosMensais={totalGastos}
                onCriar={criarMeta}
                onAporte={aportarMeta}
                onEditar={editarMeta}
                onRemover={removerMeta}
              />
              <PainelEvolucaoGuardado saldos={saldos} mesAtual={MES_ATUAL} escuro={escuro} />
            </>
          )}

          {aba === "ano" && <PainelAno historico={historico} anoAtual={ANO_ATUAL} />}

          {aba === "dicas" && (
            <PainelDicas mesLabel={labelMes(mesSelecionado)} dicas={dicas} totalGastos={totalGastos} passos={passos} />
          )}

          {aba === "prefs" &&
            (prefsCarregadas ? (
              <PainelPreferencias prefs={prefs} onSalvar={salvarPrefs} />
            ) : (
              <div className="card esqueleto esqueleto--bloco" aria-label="Carregando preferências" />
            ))}

          {aba === "mes" && (
            <>
              <div className="mes-barra">
                <SeletorMes
                  mes={mesSelecionado}
                  mesAtual={MES_ATUAL}
                  mesesComDados={mesesComDados}
                  anoMin={faixaAnos.min}
                  anoMax={faixaAnos.max}
                  onChange={mudarMes}
                />
                <p className="mes-barra-dica">
                  O resumo se atualiza enquanto você digita. Quando terminar, clique em <strong>Salvar</strong>.
                </p>
              </div>

              <div className="hero-grid">
                {cartaoGuardado}
                <CartaoLimite
                  percentual={percentGastos}
                  status={statusLimite}
                  renda={renda}
                  totalGastos={totalGastos}
                  limite={limiteGastos}
                  folga={folgaLimite}
                />
              </div>

              <AvisoLimite
                status={statusLimite}
                renda={renda}
                totalGastos={totalGastos}
                limite={limiteGastos}
                folga={folgaLimite}
              />

              {previsao && <PrevisaoMes previsao={previsao} limite={limiteGastos} />}

              <AvisoVencimentos itens={vencimentos} />

              {sugestao && (
                <section className="card copy-banner">
                  <p>
                    <strong>Este mês está vazio.</strong> Quer começar com os valores de{" "}
                    {labelMes(somarMes(mesSelecionado, -1))}?
                  </p>

                  <div className="copy-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => copiarDoMesAnterior(false)}>
                      Copiar valores
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => copiarDoMesAnterior(true)}>
                      Copiar valores e compras
                    </button>
                  </div>
                </section>
              )}

              <div className="cards-grid">
                <Kpi
                  rotulo="Quanto sobra"
                  valor={saldo}
                  cor={saldo >= 0 ? "green" : "red"}
                  icone={<IconeCarteira size={19} />}
                  sub={saldo >= 0 ? "Renda menos todos os gastos" : "Você gastou mais do que ganhou"}
                />

                <Kpi
                  rotulo="Para investir"
                  valor={investimento}
                  cor="blue"
                  icone={<IconeTendencia size={19} />}
                  sub={`${percentualInvestimento}% do que sobra`}
                  acao={
                    investimento > 0 || investGuardado > 0 ? (
                      <AcaoGuardar
                        investimento={investimento}
                        jaGuardado={investGuardado}
                        podeGuardar={carregado && !alterado && mesesComDados.has(mesSelecionado)}
                        onGuardar={guardarInvestimento}
                      />
                    ) : undefined
                  }
                />

                <Kpi
                  rotulo="Livre para gastar"
                  valor={livre}
                  cor="amber"
                  icone={<IconeRelogio size={19} />}
                  sub={
                    livrePorDia > 0
                      ? `Cerca de ${fmt(livrePorDia)} por dia até o fim do mês`
                      : "Depois de separar o investimento"
                  }
                />

                {contas.length > 0 && (
                  <Kpi
                    rotulo="Contas a pagar"
                    valor={totalAPagar}
                    cor={vencimentos.length > 0 ? "red" : "teal"}
                    icone={<IconeCalendario size={19} />}
                    progresso={((contas.length - contasPendentes.length) / contas.length) * 100}
                    sub={
                      contasPendentes.length === 0
                        ? "Tudo pago neste mês"
                        : `${contas.length - contasPendentes.length} de ${contas.length} contas fixas pagas`
                    }
                  />
                )}

                {totalNubank > 0 && (
                  <Kpi
                    rotulo={`Cartão ${CARTAO}`}
                    valor={totalNubank}
                    cor="purple"
                    icone={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/nubank-card.png" alt="" width={30} height={19} className="kpi-img" />
                    }
                    progresso={configCartao?.limite ? (totalNubank / configCartao.limite) * 100 : undefined}
                    sub={
                      configCartao?.limite
                        ? `${((totalNubank / configCartao.limite) * 100).toFixed(0)}% do limite de ${fmt(configCartao.limite)}`
                        : `${gastosNubank.length} ${gastosNubank.length === 1 ? "compra" : "compras"} neste mês`
                    }
                  />
                )}

                {principal && (
                  <Kpi
                    rotulo={`Meta: ${principal.nome}`}
                    valor={principal.alvo}
                    cor="teal"
                    icone={<IconeAlvo size={19} />}
                    progresso={progressoMeta(principal)}
                    sub={`${fmt(principal.guardado)} guardados (${progressoMeta(principal).toFixed(0)}%)${
                      mesesParaMeta > 0 ? ` · cerca de ${mesesParaMeta} ${mesesParaMeta === 1 ? "mês" : "meses"}` : ""
                    }`}
                  />
                )}
              </div>

              <div className="mes-layout">
                <section className="card coluna-numeros">
                  <div className="panel-head">
                    <h2 className="panel-title">Seus números do mês</h2>
                    <p className="panel-sub">Digite os valores em reais.</p>
                  </div>

                  <div className="panel-body">
                    <div className="input-section input-section--entrada">
                      <span className="input-section-label">Entrada</span>

                      <RendasFixas
                        rendas={rendasFixas}
                        onAdicionar={adicionarRendaFixa}
                        onEditar={editarRendaFixa}
                        onRemover={removerRendaFixa}
                      />

                      <FontesRenda fontes={rendas} total={renda} onChange={setRendas} onTornarFixa={tornarRendaFixa} />
                    </div>

                    <div className="input-section input-section--saidas">
                      <span className="input-section-label">Saídas</span>

                      <InputField
                        label="Outros gastos fixos"
                        hint="Fixos que não estão nas contas fixas (veja a aba Contas fixas ao lado)."
                        type="number"
                        prefix="R$"
                        placeholder="0,00"
                        value={gastosFixos}
                        onChange={(v) => setGastosFixos(numero(v))}
                      />

                      <InputField
                        label="Gastos variáveis"
                        hint="Mercado, lazer, transporte, compras."
                        type="number"
                        prefix="R$"
                        placeholder="0,00"
                        value={gastosVariaveis}
                        onChange={(v) => setGastosVariaveis(numero(v))}
                      />

                      {totalContas > 0 && (
                        <p className="field-hint">
                          + {fmt(totalContas)} de contas fixas = {fmt(gastosFixos + totalContas)} em gastos fixos.
                        </p>
                      )}
                    </div>

                    <div className="input-section input-section--objetivos">
                      <span className="input-section-label">Objetivos</span>

                      <div className="field">
                        <div className="slider-cabeca">
                          <label htmlFor="percentual-investir">Quanto do que sobra investir</label>
                          <span className="slider-valor">{percentualInvestimento}%</span>
                        </div>

                        <input
                          id="percentual-investir"
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          step={1}
                          value={percentualInvestimento}
                          style={{ "--p": `${percentualInvestimento}%` } as React.CSSProperties}
                          onChange={(e) => setPercentualInvestimento(Math.min(100, numero(e.target.value)))}
                        />

                        <div className="chips chips--pequenos" role="group" aria-label="Porcentagens rápidas">
                          {PERCENTUAIS_RAPIDOS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              className="chip-escolha"
                              aria-pressed={percentualInvestimento === p}
                              onClick={() => setPercentualInvestimento(p)}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>

                        <span className="field-hint">
                          {investimento > 0
                            ? `= ${fmt(investimento)} por mês para investir. As metas ficam na aba Metas.`
                            : "Separa essa parte da sobra do mês. As metas ficam na aba Metas."}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="coluna-lancamentos">
                  <Lancamentos
                    abas={[
                      { id: "contas", rotulo: "Contas fixas", quantidade: contas.length, total: totalContas },
                      { id: "cartao", rotulo: `Cartão ${CARTAO}`, quantidade: gastosNubank.length, total: totalNubank },
                      { id: "outros", rotulo: "Outros gastos", quantidade: gastosAvulsos.length, total: somar(gastosAvulsos) },
                    ]}
                    filtro={filtro}
                    onFiltro={setFiltro}
                    conteudo={{
                      contas: (
                        <PainelContasFixas
                          embutido
                          mes={mesSelecionado}
                          contas={contas}
                          pagos={pagos}
                          ehMesAtual={ehMesAtual}
                          onAdicionar={adicionarConta}
                          onEditar={editarConta}
                          onRemover={removerConta}
                          onPagar={pagar}
                        />
                      ),
                      cartao: (
                        <ListaGastos
                          embutido
                          titulo={`Cartão ${CARTAO}`}
                          descricao="Compras à vista e parceladas deste mês."
                          placeholder="Compra no cartão"
                          vazio="Nenhuma compra no cartão neste mês."
                          parcelavel
                          pessoas={prefs.pessoas}
                          mes={mesSelecionado}
                          filtro={filtro}
                          gastos={gastosNubank}
                          extra={
                            <>
                              <CartaoInfo
                                nome={CARTAO}
                                mes={mesSelecionado}
                                config={configCartao}
                                compras={gastosNubank}
                                ehMesAtual={ehMesAtual}
                                paga={faturaPaga}
                                categoriaFiltrada={filtro.categoria}
                                onPagar={(pago) => pagar(`fatura:${CARTAO}`, pago)}
                                onFiltrarCategoria={(c) =>
                                  setFiltro((f) => ({ ...f, categoria: f.categoria === c ? "" : c }))
                                }
                                onConfigurar={() => irParaAba("prefs")}
                              />

                              <ImportarFatura
                                mes={mesSelecionado}
                                existentes={gastosNubank}
                                pessoas={prefs.pessoas}
                                onImportar={importarFatura}
                              />
                            </>
                          }
                          onAdicionar={adicionarGasto(CARTAO)}
                          onAdicionarParcelado={adicionarParcelado(CARTAO)}
                          onEditar={editarItem}
                          onRemover={removerItem}
                        />
                      ),
                      outros: (
                        <ListaGastos
                          embutido
                          titulo="Outros gastos"
                          descricao="Compras avulsas do mês, no dinheiro, Pix ou débito."
                          placeholder="O que você comprou?"
                          vazio="Nenhum gasto anotado neste mês."
                          pessoas={prefs.pessoas}
                          mes={mesSelecionado}
                          filtro={filtro}
                          gastos={gastosAvulsos}
                          onAdicionar={adicionarGasto(null)}
                          onEditar={editarItem}
                          onRemover={removerItem}
                        />
                      ),
                    }}
                  />
                </div>
              </div>

              <div className="charts-grid">
                <PainelCategorias linhas={linhasCategoria} orcamentos={prefs.orcamentos} />

                {prefs.pessoas.length > 0 && <PainelPessoas linhas={linhasPessoa} />}

                {dadosComparativo !== undefined && (
                  <PainelComparacao
                    atual={{ total: totalGastos, linhas: linhasCategoria }}
                    anterior={dadosComparativo}
                    labelAnterior={labelMes(somarMes(mesSelecionado, -1))}
                  />
                )}

                <PainelProjecao
                  investimento={investimento}
                  falta={faltaMeta}
                  nomeMeta={principal?.nome ?? null}
                  mesesParaMeta={mesesParaMeta}
                  escuro={escuro}
                />
                <PainelEvolucao historico={historico} escuro={escuro} />
              </div>

              <section className="card history-panel">
                <div className="panel-head">
                  <h2 className="panel-title">Meses anteriores</h2>
                  <p className="panel-sub">Clique para abrir um mês.</p>
                </div>

                {historico.length === 0 ? (
                  <div className="history-empty">Nenhum mês salvo ainda.</div>
                ) : (
                  <div className="history-list">
                    {historico.map((item) => {
                      const usado = item.renda > 0 ? Math.min(100, (item.totalGastos / item.renda) * 100) : 0;
                      const passou = passouDoLimite(item.renda, item.totalGastos);

                      return (
                        <button
                          key={item.id}
                          className={`history-item ${item.mesReferencia === mesSelecionado ? "active" : ""}`}
                          onClick={() => mudarMes(item.mesReferencia)}
                        >
                          <span className="history-topo">
                            <span className="history-month">{labelCurto(item.mesReferencia)}</span>
                            {passou && <span className="history-flag">acima de {LIMITE_GASTOS_PERCENT}%</span>}
                          </span>

                          <span className={`history-saldo ${item.saldo >= 0 ? "positive" : "negative"}`}>
                            {fmt(item.saldo)}
                          </span>

                          <span className="history-barra" aria-hidden="true">
                            <span
                              className={passou ? "history-barra--alerta" : ""}
                              style={{ width: `${usado}%` }}
                            />
                          </span>

                          <span className="history-sub">Gastou {fmt(item.totalGastos)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <BarraInferior aba={aba} onAba={irParaAba} />

      <button
        className="fab"
        onClick={abrirNovoGasto}
        disabled={!carregado}
        aria-label="Lançar um gasto novo"
        title="Novo gasto (N)"
      >
        <IconeMais size={26} />
      </button>

      {aviso && (
        <div key={aviso.id} className={`toast toast--${aviso.tipo}`} role="status">
          <span className="toast-icone">
            {aviso.tipo === "ok" ? <IconeCheck size={16} /> : <IconeAlerta size={16} />}
          </span>
          <span className="toast-texto">{aviso.texto}</span>
          <button className="toast-x" onClick={() => setAviso(null)} aria-label="Fechar aviso">
            <IconeX size={14} />
          </button>
        </div>
      )}

      {alterado && (
        <div className="barra-salvar" role="status">
          <span className="barra-salvar-texto">
            <span className="save-dot" />
            Alterações <strong>não salvas</strong>
          </span>
          <div className="barra-salvar-acoes">
            <button className="btn btn-ghost btn-sm" onClick={descartar} disabled={salvando}>
              Descartar
            </button>
            <button className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>
              {salvando ? <span className="btn-spinner" /> : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {pendente && (
        <Modal titulo={`Salvar antes de ${pendente.rotulo}?`} onFechar={() => setPendente(null)}>
          <p className="modal-texto">
            Você alterou os dados de <strong>{labelMes(mesSelecionado)}</strong> e ainda não salvou. Se continuar sem
            salvar, essas alterações serão perdidas.
          </p>

          <div className="modal-acoes">
            <button className="btn btn-primary" onClick={salvarEContinuar} disabled={salvando} data-autofocus>
              {salvando ? "Salvando..." : "Salvar e continuar"}
            </button>
            <button className="btn btn-outline" onClick={continuarSemSalvar} disabled={salvando}>
              Continuar sem salvar
            </button>
          </div>
        </Modal>
      )}

      {novoGasto && (
        <NovoGasto
          mes={mesSelecionado}
          ehMesAtual={ehMesAtual}
          cartao={CARTAO}
          pessoas={prefs.pessoas}
          onFechar={() => setNovoGasto(false)}
          onAdicionar={lancarRapido}
        />
      )}

      {atalhos && <JanelaAtalhos onFechar={() => setAtalhos(false)} />}

      {dialogo}
    </div>
  );
}
