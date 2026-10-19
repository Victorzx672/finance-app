"use client";

import { useEffect, useState } from "react";
import { NOME_APP } from "@/lib/app";
import {
  LIMITE_GASTOS_PERCENT,
  agruparPorCategoria,
  calcularResumo,
  passouDoLimite,
  somar,
  type StatusLimite,
} from "@/lib/calculos";
import type { SaldoMes } from "@/lib/evolucao-guardado";
import { FILTRO_VAZIO, type FiltroGastos } from "@/lib/filtro";
import { gastosPorPessoa } from "@/lib/pessoas";
import { chaveMes, faixaDeAnos, labelMes } from "@/lib/meses";
import { faltaParaMeta, metaPrincipal, progressoMeta, totalGuardado, type MetaDinheiro } from "@/lib/metas";
import { somarMes } from "@/lib/parcelas";
import { serializarMes } from "@/lib/payload-mes";
import { preverMes } from "@/lib/previsao";
import { diasAteVencimento, pedeAtencao, situacaoConta } from "@/lib/vencimentos";
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
import { AcaoGuardar, CartaoGuardado } from "./guardado";
import { ImportarFatura, type ItemImportado } from "./importar-fatura";
import { Lancamentos } from "./lancamentos";
import { ListaGastos, type EdicaoGasto } from "./lista-gastos";
import { PainelMetas, type DadosMeta } from "./metas";
import { PainelPreferencias } from "./preferencias";
import { RendasFixas, type EdicaoRendaFixa } from "./rendas-fixas";
import { PainelAno } from "./resumo-ano";
import { SeletorMes } from "./seletor-mes";
import { Icon, InputField, LogoIcon, fmt, numero, type Gasto } from "./ui";

/** Cor da barra de gastos conforme a situação do limite. */
const CLASSE_BARRA: Record<StatusLimite, string> = {
  ok: "ok",
  atencao: "warning",
  excedido: "danger",
  "sem-renda": "warning",
};

const ABAS = [
  { id: "mes", rotulo: "Este mês" },
  { id: "metas", rotulo: "Metas" },
  { id: "ano", rotulo: "Ano" },
  { id: "prefs", rotulo: "Preferências" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

const MES_ATUAL = chaveMes(new Date());
const ANO_ATUAL = new Date().getFullYear();
const CARTAO = "Nubank";

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

function SummaryCard({
  label,
  value,
  accent,
  icon,
  sub,
  acao,
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "blue" | "amber" | "purple" | "teal";
  icon: React.ReactNode;
  sub: string;
  /** botão ou aviso extra no rodapé do cartão */
  acao?: React.ReactNode;
}) {
  return (
    <div className={`card summary-card summary-card--${accent}`}>
      <div className="summary-icon">{icon}</div>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
      <span className="summary-sub">{sub}</span>
      {acao && <div className="summary-acao">{acao}</div>}
    </div>
  );
}

function BotaoIcone({
  titulo,
  onClick,
  href,
  ativo,
  children,
}: {
  titulo: string;
  onClick?: () => void;
  href?: string;
  ativo?: boolean;
  children: React.ReactNode;
}) {
  const classe = `btn-topo ${ativo ? "btn-topo--ativo" : ""}`;

  return href ? (
    <a href={href} className={classe} title={titulo} aria-label={titulo} download>
      {children}
    </a>
  ) : (
    <button className={classe} title={titulo} aria-label={titulo} onClick={onClick}>
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
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [anterior, setAnterior] = useState<{ mes: string; dados: FinancaDoMes } | null>(null);
  const [comparativo, setComparativo] = useState<{ mes: string; dados: GastosDoMes | null } | null>(null);
  const [ocultar, setOcultar] = useState(() => lerArmazenado("fluxopay-ocultar") === "1");
  const [escuro, setEscuro] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.tema === "escuro"
  );

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
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), duracaoMs);
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

  // Ctrl+S (ou Cmd+S) salva
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (alterado) salvar();
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  /** Executa a ação já, ou pergunta antes se há alterações não salvas. */
  const protegerSaida = (rotulo: string, acao: () => void) => {
    if (alterado) setPendente({ rotulo, acao });
    else acao();
  };

  const mudarMes = (novo: string) => {
    if (novo !== mesSelecionado) protegerSaida("trocar de mês", () => setMesSelecionado(novo));
  };

  const pedirSaida = () => protegerSaida("sair", onSair);

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

    if (
      !window.confirm(
        `"${gasto.nome}" está parcelada em ${total}x. Remover apaga as ${total} parcelas, em todos os meses. Continuar?`
      )
    ) {
      return;
    }

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
    if (
      !window.confirm(
        `Remover "${conta.nome}" de ${labelMes(mesSelecionado)} em diante? Os meses anteriores continuam com ela.`
      )
    ) {
      return;
    }

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
    if (
      !window.confirm(
        `Remover "${renda.nome}" de ${labelMes(mesSelecionado)} em diante? Os meses anteriores continuam com ela.`
      )
    ) {
      return;
    }

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
      return;
    }

    setInvestGuardado(valor);
    await recarregarGuardado();
    mostrarAviso("ok", valor > 0 ? "Somado ao total guardado." : "Valor tirado do total guardado.", 3000);
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
    if (!window.confirm(`Remover a meta "${meta.nome}"?`)) return;

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

  const tituloMeta = principal?.nome ?? "";

  return (
    <div className={ocultar ? "oculto" : ""}>
      <header className="app-header">
        <div className="brand small">
          <div className="brand-logo">
            <LogoIcon size={18} />
          </div>
          <span className="brand-name">{NOME_APP}</span>
        </div>

        <div className="header-right">
          <span className={`save-status ${salvando ? "saving" : alterado ? "nao-salvo" : ""}`}>
            <span className="save-dot" />
            <span className="save-text">
              {salvando ? "Salvando..." : alterado ? "Alterações não salvas" : "Tudo salvo"}
            </span>
          </span>

          {nomeUsuario && <span className="header-user">Olá, {nomeUsuario}</span>}

          <BotaoIcone titulo={ocultar ? "Mostrar valores" : "Ocultar valores"} onClick={alternarOcultar} ativo={ocultar}>
            <Icon size={18}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
              {ocultar && <path d="M3 3l18 18" />}
            </Icon>
          </BotaoIcone>

          <BotaoIcone titulo={escuro ? "Modo claro" : "Modo escuro"} onClick={() => setEscuro(!escuro)}>
            <Icon size={18}>
              {escuro ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </>
              ) : (
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
              )}
            </Icon>
          </BotaoIcone>

          <BotaoIcone titulo="Enviar o resumo deste mês por e-mail" onClick={enviarResumo}>
            <Icon size={18}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 6l-10 7L2 6" />
            </Icon>
          </BotaoIcone>

          <BotaoIcone titulo="Baixar todos os meses em CSV (Excel)" href="/api/export">
            <Icon size={18}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </Icon>
          </BotaoIcone>

          <button className="btn btn-outline" onClick={pedirSaida}>
            Sair
          </button>
        </div>
      </header>

      {aviso && (
        <div className={`toast toast--${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}

      {alterado && (
        <div className="barra-salvar" role="status">
          <span>
            Você tem alterações <strong>não salvas</strong>.
          </span>
          <button className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      )}

      {pendente && (
        <div className="modal-fundo" role="presentation" onClick={() => setPendente(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-titulo">Salvar antes de {pendente.rotulo}?</h2>
            <p>
              Você alterou os dados de <strong>{labelMes(mesSelecionado)}</strong> e ainda não salvou. Se continuar
              sem salvar, essas alterações serão perdidas.
            </p>

            <div className="modal-acoes">
              <button className="btn btn-primary" onClick={salvarEContinuar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar e continuar"}
              </button>
              <button className="btn btn-outline" onClick={continuarSemSalvar} disabled={salvando}>
                Continuar sem salvar
              </button>
              <button className="link-btn center" onClick={() => setPendente(null)}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`app-main ${alterado ? "com-barra" : ""}`}>
        <nav className="abas" role="tablist" aria-label="Seções">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              className="aba"
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>

        {(aba === "mes" || aba === "metas") && (
          <CartaoGuardado
            total={totalGuardado(metas, guardadoGeral)}
            semMeta={guardadoGeral}
            naMetas={totalGuardado(metas, 0)}
            quantidadeMetas={metas.length}
            onAporte={aportarGuardado}
          />
        )}

        {aba === "metas" && (
          <PainelMetas
            metas={metas}
            investimento={investimento}
            gastosMensais={totalGastos}
            onCriar={criarMeta}
            onAporte={aportarMeta}
            onEditar={editarMeta}
            onRemover={removerMeta}
          />
        )}

        {aba === "metas" && <PainelEvolucaoGuardado saldos={saldos} mesAtual={MES_ATUAL} escuro={escuro} />}

        {aba === "ano" && <PainelAno historico={historico} anoAtual={ANO_ATUAL} />}

        {aba === "prefs" &&
          (prefsCarregadas ? (
            <PainelPreferencias prefs={prefs} onSalvar={salvarPrefs} />
          ) : (
            <div className="card empty-state">Carregando preferências...</div>
          ))}

        {aba === "mes" && (
          <>
            <div className="page-intro">
              <h1>Seu mês em um só lugar</h1>
              <p>
                Preencha os valores abaixo. O resumo se atualiza sozinho. Quando terminar, clique em{" "}
                <strong>Salvar</strong> (ou aperte Ctrl+S).
              </p>
            </div>

            <section className="card month-bar">
              <SeletorMes
                mes={mesSelecionado}
                mesAtual={MES_ATUAL}
                mesesComDados={mesesComDados}
                anoMin={faixaAnos.min}
                anoMax={faixaAnos.max}
                onChange={mudarMes}
              />

              <div className="spend">
                <div className="spend-head">
                  <span>Gastos em relação à renda (limite de {LIMITE_GASTOS_PERCENT}%)</span>
                  <strong>{percentGastos.toFixed(0)}%</strong>
                </div>

                <div className="spend-track">
                  <div className={`spend-fill ${CLASSE_BARRA[statusLimite]}`} style={{ width: `${percentGastos}%` }} />
                  <span
                    className="spend-limit"
                    style={{ left: `${LIMITE_GASTOS_PERCENT}%` }}
                    title={`Limite de ${LIMITE_GASTOS_PERCENT}% da renda`}
                  />
                </div>

                {statusLimite !== "sem-renda" && (
                  <span className={`spend-note spend-note--${statusLimite}`}>
                    {folgaLimite > 0
                      ? `Ainda pode gastar ${fmt(folgaLimite)} dentro do limite (${fmt(limiteGastos)})`
                      : folgaLimite === 0
                      ? `Você chegou ao limite de ${fmt(limiteGastos)}`
                      : `${fmt(-folgaLimite)} acima do limite de ${fmt(limiteGastos)}`}
                  </span>
                )}
              </div>
            </section>

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
              <SummaryCard
                label="Quanto sobra"
                value={fmt(saldo)}
                accent={saldo >= 0 ? "green" : "red"}
                icon={
                  <Icon>
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </Icon>
                }
                sub={saldo >= 0 ? "Renda menos todos os gastos" : "Você gastou mais do que ganhou"}
              />

              <SummaryCard
                label="Para investir"
                value={fmt(investimento)}
                accent="blue"
                icon={
                  <Icon>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </Icon>
                }
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

              <SummaryCard
                label="Livre para gastar"
                value={fmt(livre)}
                accent="amber"
                icon={
                  <Icon>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </Icon>
                }
                sub="Depois de separar o investimento"
              />

              {contas.length > 0 && (
                <SummaryCard
                  label="Contas a pagar"
                  value={fmt(totalAPagar)}
                  accent={vencimentos.length > 0 ? "red" : "teal"}
                  icon={
                    <Icon>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </Icon>
                  }
                  sub={
                    contasPendentes.length === 0
                      ? "Tudo pago neste mês"
                      : `${contasPendentes.length} de ${contas.length} contas fixas ainda sem pagar`
                  }
                />
              )}

              {totalNubank > 0 && (
                <SummaryCard
                  label="Cartão Nubank"
                  value={fmt(totalNubank)}
                  accent="purple"
                  icon={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/nubank-card.png" alt="" width={34} height={22} className="summary-img" />
                  }
                  sub={
                    configCartao?.limite
                      ? `${((totalNubank / configCartao.limite) * 100).toFixed(0)}% do limite de ${fmt(configCartao.limite)}`
                      : `${gastosNubank.length} ${gastosNubank.length === 1 ? "compra" : "compras"} neste mês`
                  }
                />
              )}

              {principal && (
                <SummaryCard
                  label={`Meta: ${tituloMeta}`}
                  value={fmt(principal.alvo)}
                  accent="teal"
                  icon={
                    <Icon>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </Icon>
                  }
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
                  <div className="input-section">
                    <span className="input-section-label">Entrada</span>

                    <RendasFixas
                      rendas={rendasFixas}
                      onAdicionar={adicionarRendaFixa}
                      onEditar={editarRendaFixa}
                      onRemover={removerRendaFixa}
                    />

                    <FontesRenda fontes={rendas} total={renda} onChange={setRendas} onTornarFixa={tornarRendaFixa} />
                  </div>

                  <div className="input-section">
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

                  <div className="input-section">
                    <span className="input-section-label">Objetivos</span>

                    <InputField
                      label="Quanto do que sobra investir"
                      hint="Em porcentagem. Ex.: 20 separa 20% da sobra. As metas ficam na aba Metas."
                      type="number"
                      suffix="%"
                      max={100}
                      placeholder="0"
                      value={percentualInvestimento}
                      onChange={(v) => setPercentualInvestimento(Math.min(100, numero(v)))}
                    />
                  </div>
                </div>
              </section>

              <div className="coluna-lancamentos">
                <Lancamentos
                  abas={[
                    { id: "contas", rotulo: "Contas fixas", quantidade: contas.length, total: totalContas, cor: "#0f766e" },
                    { id: "cartao", rotulo: "Cartão Nubank", quantidade: gastosNubank.length, total: totalNubank, cor: "#7c3aed" },
                    { id: "outros", rotulo: "Outros gastos", quantidade: gastosAvulsos.length, total: somar(gastosAvulsos), cor: "#64748b" },
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
                        titulo="Cartão Nubank"
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
                              mes={mesSelecionado}
                              config={configCartao}
                              usado={totalNubank}
                              ehMesAtual={ehMesAtual}
                              paga={faturaPaga}
                              onPagar={(pago) => pagar(`fatura:${CARTAO}`, pago)}
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

            <section className="card history-panel">
              <div className="panel-head">
                <h2 className="panel-title">Meses anteriores</h2>
                <p className="panel-sub">Clique para abrir um mês.</p>
              </div>

              {historico.length === 0 ? (
                <div className="history-empty">Nenhum mês salvo ainda.</div>
              ) : (
                <div className="history-list history-list--grade">
                  {historico.map((item) => (
                    <button
                      key={item.id}
                      className={`history-item ${item.mesReferencia === mesSelecionado ? "active" : ""}`}
                      onClick={() => mudarMes(item.mesReferencia)}
                    >
                      <span className="history-month">{labelMes(item.mesReferencia)}</span>

                      <span className={`history-saldo ${item.saldo >= 0 ? "positive" : "negative"}`}>
                        {fmt(item.saldo)}
                      </span>

                      <span className="history-sub">
                        Gastou {fmt(item.totalGastos)}
                        {passouDoLimite(item.renda, item.totalGastos) && (
                          <span className="history-flag">acima de {LIMITE_GASTOS_PERCENT}%</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

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
          </>
        )}
      </main>
    </div>
  );
}
