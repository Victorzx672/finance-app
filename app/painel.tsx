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
import { FILTRO_VAZIO, type FiltroGastos } from "@/lib/filtro";
import { chaveMes, labelMes, listaMeses } from "@/lib/meses";
import { faltaParaMeta, metaPrincipal, progressoMeta, type MetaDinheiro } from "@/lib/metas";
import { somarMes } from "@/lib/parcelas";
import { diasAteVencimento, pedeAtencao, situacaoConta } from "@/lib/vencimentos";
import { AvisoLimite } from "./aviso-limite";
import { AvisoVencimentos, type ItemVencimento } from "./aviso-vencimentos";
import { CartaoInfo } from "./cartao-info";
import { PainelComparacao } from "./comparacao";
import { PainelContasFixas, type EdicaoConta } from "./contas-fixas";
import {
  PREFERENCIAS_PADRAO,
  buscarContas,
  buscarFinanca,
  buscarGastosDoMes,
  buscarHistorico,
  buscarMetas,
  buscarParcelas,
  buscarPreferencias,
  type ContaFixaItem,
  type FinancaDoMes,
  type GastosDoMes,
  type HistoricoMes,
  type Preferencias,
} from "./dados";
import { FontesRenda, novaFonte, type FonteRenda } from "./fontes-renda";
import { PainelCategorias, PainelEvolucao, PainelProjecao } from "./graficos";
import { ListaGastos, SelectCategoria, type EdicaoGasto } from "./lista-gastos";
import { PainelMetas, type DadosMeta } from "./metas";
import { PainelPreferencias } from "./preferencias";
import { PainelAno } from "./resumo-ano";
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

const MESES = listaMeses();
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
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "blue" | "amber" | "purple" | "teal";
  icon: React.ReactNode;
  sub: string;
}) {
  return (
    <div className={`card summary-card summary-card--${accent}`}>
      <div className="summary-icon">{icon}</div>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
      <span className="summary-sub">{sub}</span>
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
  const [rendas, setRendas] = useState<FonteRenda[]>([]);
  const [gastosFixos, setGastosFixos] = useState(0);
  const [gastosVariaveis, setGastosVariaveis] = useState(0);
  const [percentualInvestimento, setPercentualInvestimento] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelas, setParcelas] = useState<Gasto[]>([]);
  const [contas, setContas] = useState<ContaFixaItem[]>([]);
  const [pagos, setPagos] = useState<string[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(MES_ATUAL);
  const [mesCarregado, setMesCarregado] = useState<string | null>(null);

  // Dados gerais
  const [historico, setHistorico] = useState<HistoricoMes[]>([]);
  const [metas, setMetas] = useState<MetaDinheiro[]>([]);
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

  const renda = somar(rendas);
  const totalContas = somar(contas);

  // Parcelas vêm da API (não entram no autosave) e se juntam aos gastos do mês
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

  const indiceMes = MESES.findIndex((m) => m.value === mesSelecionado);

  // Só salva depois que os dados do mês selecionado foram lidos do servidor
  const carregado = mesCarregado === mesSelecionado;

  // Mês sem nada preenchido: oferece copiar do mês anterior
  const mesVazio =
    carregado &&
    renda === 0 &&
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

  useEffect(() => {
    let cancelado = false;

    Promise.all([buscarHistorico(), buscarMetas(), buscarPreferencias()]).then(([h, m, p]) => {
      if (cancelado) return;
      setHistorico(h);
      setMetas(m);
      setPrefs(p);
      setPrefsCarregadas(true);
    });

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
      // Se falhar, "carregado" continua falso: o autosave não pode sobrescrever
      // dados reais com zeros quando a leitura falha.
      if (cancelado || !dados) return;

      setRendas(dados.rendas.length > 0 ? dados.rendas : [novaFonte()]);
      setGastosFixos(dados.finance?.gastosFixos ?? 0);
      setGastosVariaveis(dados.finance?.gastosVariaveis ?? 0);
      setPercentualInvestimento(dados.finance?.percentualInvestimento ?? 0);
      setGastos(dados.gastos);
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

  // ── Autosave ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!carregado) return;

    const salvar = async () => {
      setSalvando(true);

      try {
        const res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mes: mesSelecionado,
            // linhas em branco ficam de fora; sem nome, vira "Renda"
            rendas: rendas
              .filter((r) => r.valor > 0)
              .map((r) => ({ nome: r.nome.trim() || "Renda", valor: r.valor })),
            gastosFixos,
            gastosVariaveis,
            percentualInvestimento,
            // parcelas e contas fixas ficam de fora: vivem em rotas próprias
            gastos: gastos.map(({ nome, valor, cartao, categoria, dia }) => ({
              nome,
              valor,
              cartao: cartao ?? null,
              categoria: categoria ?? null,
              dia: dia ?? null,
            })),
          }),
        });

        if (res.ok) await carregarHistorico();
      } finally {
        setSalvando(false);
      }
    };

    const debounce = setTimeout(salvar, 800);
    return () => clearTimeout(debounce);
  }, [rendas, gastosFixos, gastosVariaveis, percentualInvestimento, gastos, carregado, mesSelecionado]);

  // ── Ações ───────────────────────────────────────────────────────────────────

  const mostrarAviso = (tipo: "ok" | "error", texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 6000);
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
    (cartao: string | null) => (nome: string, valor: number, categoria: string | null, dia: number | null) =>
      setGastos((prev) => [...prev, { id: crypto.randomUUID(), nome, valor, cartao, categoria, dia }]);

  const adicionarParcelado =
    (cartao: string | null) =>
    async (nome: string, valorParcela: number, parcelaAtual: number, totalParcelas: number, categoria: string | null) => {
      const falha = await chamar("/api/parcelamentos", "POST", {
        nome,
        valorParcela,
        totalParcelas,
        parcelaAtual,
        mes: mesSelecionado,
        cartao,
        categoria,
      });

      if (!falha) await Promise.all([carregarParcelas(mesSelecionado), carregarHistorico()]);
      return falha;
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

  // Metas
  const recarregarMetas = async () => setMetas(await buscarMetas());

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

    // Copia as fontes (ou, se o mês antigo não tinha, o total como uma só)
    setRendas(
      sugestao.rendas.length > 0
        ? sugestao.rendas.map((r) => ({ ...r, id: crypto.randomUUID() }))
        : [{ ...novaFonte(), nome: "Renda", valor: f.renda }]
    );
    setGastosFixos(f.gastosFixos);
    setGastosVariaveis(f.gastosVariaveis);
    setPercentualInvestimento(f.percentualInvestimento);

    if (comCompras) {
      setGastos(sugestao.gastos.map((g) => ({ ...g, id: crypto.randomUUID() })));
    }
  };

  const irParaMes = (delta: number) => {
    const destino = MESES[indiceMes + delta];
    if (destino) setMesSelecionado(destino.value);
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
          <span className={`save-status ${salvando ? "saving" : ""}`}>
            <span className="save-dot" />
            <span className="save-text">{salvando ? "Salvando..." : "Salvo automaticamente"}</span>
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

          <button className="btn btn-outline" onClick={onSair}>
            Sair
          </button>
        </div>
      </header>

      {aviso && (
        <div className={`toast toast--${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}

      <main className="app-main">
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
              <p>Preencha os valores abaixo. O resumo se atualiza sozinho e tudo é salvo.</p>
            </div>

            <section className="card month-bar">
              <div className="month-picker">
                <span className="month-label">Mês</span>

                <button
                  className="month-btn"
                  onClick={() => irParaMes(-1)}
                  disabled={indiceMes <= 0}
                  aria-label="Mês anterior"
                >
                  ‹
                </button>

                <select
                  className="month-select"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  aria-label="Mês"
                >
                  {MESES.map((mes) => (
                    <option key={mes.value} value={mes.value}>
                      {mes.label}
                    </option>
                  ))}
                </select>

                <button
                  className="month-btn"
                  onClick={() => irParaMes(1)}
                  disabled={indiceMes < 0 || indiceMes >= MESES.length - 1}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>

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

            <div className="main-layout">
              <section className="card">
                <div className="panel-head">
                  <h2 className="panel-title">Seus números do mês</h2>
                  <p className="panel-sub">Digite os valores em reais.</p>
                </div>

                <div className="panel-body">
                  <div className="input-section">
                    <span className="input-section-label">Entrada</span>

                    <p className="field-hint">
                      Cada fonte de renda do mês (já líquida). O total é calculado sozinho.
                    </p>

                    <FontesRenda fontes={rendas} total={renda} onChange={setRendas} />
                  </div>

                  <div className="input-section">
                    <span className="input-section-label">Saídas</span>

                    <InputField
                      label="Outros gastos fixos"
                      hint="Fixos que não estão nas contas fixas (veja ao lado)."
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

              <div className="right-col">
                <PainelContasFixas
                  mes={mesSelecionado}
                  contas={contas}
                  pagos={pagos}
                  ehMesAtual={ehMesAtual}
                  onAdicionar={adicionarConta}
                  onEditar={editarConta}
                  onRemover={removerConta}
                  onPagar={pagar}
                />

                {todosGastos.length > 0 && (
                  <section className="card filtro-barra">
                    <div className="input-wrap">
                      <input
                        type="search"
                        placeholder="Buscar compra pelo nome"
                        aria-label="Buscar compra"
                        value={filtro.texto}
                        onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))}
                      />
                    </div>

                    <SelectCategoria
                      value={filtro.categoria}
                      onChange={(v) => setFiltro((f) => ({ ...f, categoria: v }))}
                      rotulo="Filtrar por categoria"
                      vazio="Todas as categorias"
                    />

                    {(filtro.texto || filtro.categoria) && (
                      <button className="btn btn-outline btn-sm" onClick={() => setFiltro(FILTRO_VAZIO)}>
                        Limpar
                      </button>
                    )}
                  </section>
                )}

                <ListaGastos
                  titulo="Cartão Nubank"
                  descricao="Compras à vista e parceladas deste mês."
                  placeholder="Compra no cartão"
                  vazio="Nenhuma compra no cartão neste mês."
                  tema="nubank"
                  icone="/nubank-card.png"
                  parcelavel
                  mes={mesSelecionado}
                  filtro={filtro}
                  gastos={gastosNubank}
                  extra={
                    <CartaoInfo
                      mes={mesSelecionado}
                      config={configCartao}
                      usado={totalNubank}
                      ehMesAtual={ehMesAtual}
                      paga={faturaPaga}
                      onPagar={(pago) => pagar(`fatura:${CARTAO}`, pago)}
                    />
                  }
                  onAdicionar={adicionarGasto(CARTAO)}
                  onAdicionarParcelado={adicionarParcelado(CARTAO)}
                  onEditar={editarItem}
                  onRemover={removerItem}
                />

                <ListaGastos
                  titulo="Outros gastos"
                  descricao="Compras avulsas do mês, no dinheiro, Pix ou débito."
                  placeholder="O que você comprou?"
                  vazio="Nenhum gasto anotado neste mês."
                  mes={mesSelecionado}
                  filtro={filtro}
                  gastos={gastosAvulsos}
                  onAdicionar={adicionarGasto(null)}
                  onEditar={editarItem}
                  onRemover={removerItem}
                />
              </div>

              <aside className="card history-panel">
                <div className="panel-head">
                  <h2 className="panel-title">Meses anteriores</h2>
                  <p className="panel-sub">Clique para abrir um mês.</p>
                </div>

                {historico.length === 0 ? (
                  <div className="history-empty">Nenhum mês salvo ainda.</div>
                ) : (
                  <div className="history-list">
                    {historico.map((item) => (
                      <button
                        key={item.id}
                        className={`history-item ${item.mesReferencia === mesSelecionado ? "active" : ""}`}
                        onClick={() => setMesSelecionado(item.mesReferencia)}
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
              </aside>
            </div>

            <div className="charts-grid">
              <PainelCategorias linhas={linhasCategoria} orcamentos={prefs.orcamentos} />

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
