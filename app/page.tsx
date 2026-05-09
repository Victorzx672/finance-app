"use client";

import { useEffect, useState, useId } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gasto {
  id: string | number;
  nome: string;
  valor: number;
}

interface UserSalvo {
  id: number;
  usuario: string;
}

interface HistoricoMes {
  id: number;
  mesReferencia: string;
  renda: number;
  saldo: number;
  totalGastos: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getUser = (): UserSalvo | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("finance-user");
  return raw ? (JSON.parse(raw) as UserSalvo) : null;
};

const getMesAtual = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
};

const mesesDisponiveis = [
  { value: "2026-01", label: "Janeiro 2026" },
  { value: "2026-02", label: "Fevereiro 2026" },
  { value: "2026-03", label: "Março 2026" },
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-05", label: "Maio 2026" },
  { value: "2026-06", label: "Junho 2026" },
  { value: "2026-07", label: "Julho 2026" },
  { value: "2026-08", label: "Agosto 2026" },
  { value: "2026-09", label: "Setembro 2026" },
  { value: "2026-10", label: "Outubro 2026" },
  { value: "2026-11", label: "Novembro 2026" },
  { value: "2026-12", label: "Dezembro 2026" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
}) {
  const id = useId();

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value === 0 && type === "number" ? "" : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry: any) => (
        <p
          key={entry.name}
          className="chart-tooltip-value"
          style={{ color: entry.color }}
        >
          <span>{entry.name}</span>
          <span>{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  // Auth
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);

  // Finance
  const [renda, setRenda] = useState(0);
  const [gastosFixos, setGastosFixos] = useState(0);
  const [gastosVariaveis, setGastosVariaveis] = useState(0);
  const [percentualInvestimento, setPercentualInvestimento] = useState(0);
  const [meta, setMeta] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(getMesAtual());
  const [historico, setHistorico] = useState<HistoricoMes[]>([]);

  // Expense form
  const [nomeGasto, setNomeGasto] = useState("");
  const [valorGasto, setValorGasto] = useState(0);

  // UX
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalGastosDetalhados = gastos.reduce((acc, g) => acc + g.valor, 0);
  const saldo = renda - gastosFixos - gastosVariaveis - totalGastosDetalhados;
  const investimento = saldo * (percentualInvestimento / 100);
  const gastoLivre = saldo - investimento;
  const taxa = 0.01;
  const mesesParaMeta = investimento > 0 ? Math.ceil(meta / investimento) : 0;
  const totalGastos = gastosFixos + gastosVariaveis + totalGastosDetalhados;
  const percentGastos =
    renda > 0 ? Math.min((totalGastos / renda) * 100, 100) : 0;

  const dadosGrafico = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const valor = investimento * (((1 + taxa) ** mes - 1) / taxa);
    return { mes: `M${mes}`, valor, meta };
  });

  // ── Data loading ────────────────────────────────────────────────────────────

  const carregarDados = async (userId: number, mes: string) => {
    try {
      setCarregado(false);

      const res = await fetch(`/api/finance?userId=${userId}&mes=${mes}`);
      const data = await res.json();

      if (data.finance) {
        setRenda(data.finance.renda ?? 0);
        setGastosFixos(data.finance.gastosFixos ?? 0);
        setGastosVariaveis(data.finance.gastosVariaveis ?? 0);
        setPercentualInvestimento(data.finance.percentualInvestimento ?? 0);
        setMeta(data.finance.meta ?? 0);
      } else {
        setRenda(0);
        setGastosFixos(0);
        setGastosVariaveis(0);
        setPercentualInvestimento(0);
        setMeta(0);
      }

      setGastos(data.gastos ?? []);
    } catch {
      setRenda(0);
      setGastosFixos(0);
      setGastosVariaveis(0);
      setPercentualInvestimento(0);
      setMeta(0);
      setGastos([]);
    } finally {
      setCarregado(true);
    }
  };

  const carregarHistorico = async (userId: number) => {
    try {
      const res = await fetch(`/api/finance/history?userId=${userId}`);
      const data = await res.json();

      setHistorico(data.historico ?? []);
    } catch {
      setHistorico([]);
    }
  };

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const loginSalvo = localStorage.getItem("finance-login");
    const user = getUser();

    if (loginSalvo === "true" && user) {
      setLogado(true);
      carregarDados(user.id, mesSelecionado);
      carregarHistorico(user.id);
    } else {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (!logado) return;

    const user = getUser();
    if (!user) return;

    carregarDados(user.id, mesSelecionado);
  }, [mesSelecionado, logado]);

  // ── Autosave ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!carregado || !logado) return;

    const user = getUser();
    if (!user) return;

    const salvar = async () => {
      setSalvando(true);

      try {
        await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            mes: mesSelecionado,
            renda,
            gastosFixos,
            gastosVariaveis,
            percentualInvestimento,
            meta,
            gastos,
          }),
        });

        await carregarHistorico(user.id);
      } finally {
        setSalvando(false);
      }
    };

    const debounce = setTimeout(salvar, 800);
    return () => clearTimeout(debounce);
  }, [
    renda,
    gastosFixos,
    gastosVariaveis,
    percentualInvestimento,
    meta,
    gastos,
    carregado,
    logado,
    mesSelecionado,
  ]);

  // ── Auth handlers ───────────────────────────────────────────────────────────

  const fazerLogin = async () => {
    if (!usuario || !senha) return;

    setLoadingLogin(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await res.json();

      if (data.success) {
        setLogado(true);
        setErroLogin("");
        localStorage.setItem("finance-login", "true");
        localStorage.setItem("finance-user", JSON.stringify(data.user));
        carregarDados(data.user.id, mesSelecionado);
        carregarHistorico(data.user.id);
      } else {
        setErroLogin(data.error ?? "Erro no login");
      }
    } catch {
      setErroLogin("Erro ao conectar com o servidor");
    } finally {
      setLoadingLogin(false);
    }
  };

  const cadastrar = async () => {
    if (!usuario || !senha) return;

    setLoadingLogin(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await res.json();

      if (data.success) {
        setModoCadastro(false);
        setErroLogin("Conta criada! Faça login.");
        setSenha("");
      } else {
        setErroLogin(data.error ?? "Erro ao cadastrar");
      }
    } catch {
      setErroLogin("Erro ao conectar com o servidor");
    } finally {
      setLoadingLogin(false);
    }
  };

  const sair = () => {
    setLogado(false);
    setCarregado(false);
    setRenda(0);
    setGastosFixos(0);
    setGastosVariaveis(0);
    setPercentualInvestimento(0);
    setMeta(0);
    setGastos([]);
    setHistorico([]);
    localStorage.removeItem("finance-login");
    localStorage.removeItem("finance-user");
    setUsuario("");
    setSenha("");
  };

  // ── Expense handlers ────────────────────────────────────────────────────────

  const adicionarGasto = () => {
    if (!nomeGasto.trim() || valorGasto <= 0) return;

    setGastos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: nomeGasto.trim(),
        valor: valorGasto,
      },
    ]);

    setNomeGasto("");
    setValorGasto(0);
  };

  const removerGasto = (id: string | number) =>
    setGastos((prev) => prev.filter((g) => g.id !== id));

  const onKeyDownGasto = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") adicionarGasto();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER — Auth Screen
  // ──────────────────────────────────────────────────────────────────────────

  if (!logado) {
    return (
      <>
        <style>{authStyles}</style>

        <div className="auth-bg">
          <div className="auth-orb auth-orb--1" />
          <div className="auth-orb auth-orb--2" />

          <div className="auth-card">
            <div className="auth-icon-wrap">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <h1 className="auth-title">
              {modoCadastro ? "Criar conta" : "Bem-vindo"}
            </h1>

            <p className="auth-sub">
              {modoCadastro
                ? "Comece seu controle financeiro"
                : "Acesse seu painel financeiro"}
            </p>

            <div className="auth-form">
              <InputField
                label="Usuário"
                placeholder="seu_usuario"
                value={usuario}
                onChange={setUsuario}
              />

              <InputField
                label="Senha"
                placeholder="••••••••"
                type="password"
                value={senha}
                onChange={setSenha}
              />

              {erroLogin && (
                <p
                  className={`auth-msg ${
                    erroLogin.includes("criada") ? "success" : "error"
                  }`}
                >
                  {erroLogin}
                </p>
              )}

              <button
                className="btn-primary"
                onClick={modoCadastro ? cadastrar : fazerLogin}
                disabled={loadingLogin || !usuario || !senha}
              >
                {loadingLogin ? (
                  <span className="btn-spinner" />
                ) : modoCadastro ? (
                  "Criar conta"
                ) : (
                  "Entrar"
                )}
              </button>

              <button
                className="btn-ghost"
                onClick={() => {
                  setModoCadastro(!modoCadastro);
                  setErroLogin("");
                }}
              >
                {modoCadastro ? "Já tenho uma conta" : "Não tenho conta ainda"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER — App
  // ──────────────────────────────────────────────────────────────────────────

  const userSalvo = getUser();

  return (
    <>
      <style>{appStyles}</style>

      <div className="app-bg">
        <header className="app-header">
          <div className="header-left">
            <div className="header-logo-wrap">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <div>
              <span className="header-title">Finanças</span>
              {userSalvo && (
                <span className="header-user">@{userSalvo.usuario}</span>
              )}
            </div>
          </div>

          <div className="header-right">
            {salvando && (
              <span className="saving-badge">
                <span className="saving-dot" />
                Salvando
              </span>
            )}

            <button className="btn-logout" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <main className="app-main">
          <section className="month-bar">
            <div className="month-bar-left">
              <span className="month-label">Período</span>

              <select
                className="month-select"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
              >
                {mesesDisponiveis.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="month-bar-right">
              <div className="spend-bar-wrap">
                <div className="spend-bar-label">
                  <span>Comprometimento da renda</span>
                  <span>{percentGastos.toFixed(0)}%</span>
                </div>

                <div className="spend-bar-track">
                  <div
                    className={`spend-bar-fill ${
                      percentGastos > 80
                        ? "danger"
                        : percentGastos > 60
                        ? "warning"
                        : "ok"
                    }`}
                    style={{ width: `${percentGastos}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="cards-grid">
            <SummaryCard
              label="Saldo disponível"
              value={fmt(saldo)}
              accent={saldo >= 0 ? "green" : "red"}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              }
              sub={saldo >= 0 ? "Positivo" : "Negativo"}
            />

            <SummaryCard
              label="Para investir"
              value={fmt(investimento)}
              accent="blue"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
              sub={`${percentualInvestimento}% do saldo`}
            />

            <SummaryCard
              label="Gasto livre"
              value={fmt(gastoLivre)}
              accent="amber"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              sub="Após investimento"
            />

            {meta > 0 && (
              <SummaryCard
                label="Meta financeira"
                value={fmt(meta)}
                accent="purple"
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                }
                sub={
                  mesesParaMeta > 0
                    ? `Em ${mesesParaMeta} meses`
                    : "Defina o investimento"
                }
              />
            )}
          </div>

          <div className="main-layout">
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Receita &amp; Despesas</h2>
                <p className="panel-sub">Preencha os valores do mês</p>
              </div>

              <div className="panel-body">
                <div className="input-section">
                  <span className="input-section-label">Entrada</span>

                  <InputField
                    label="Renda mensal"
                    type="number"
                    placeholder="0,00"
                    value={renda}
                    onChange={(v) => setRenda(Number(v))}
                  />
                </div>

                <div className="input-divider" />

                <div className="input-section">
                  <span className="input-section-label">Saídas</span>

                  <InputField
                    label="Gastos fixos"
                    type="number"
                    placeholder="0,00"
                    value={gastosFixos}
                    onChange={(v) => setGastosFixos(Number(v))}
                  />

                  <InputField
                    label="Gastos variáveis"
                    type="number"
                    placeholder="0,00"
                    value={gastosVariaveis}
                    onChange={(v) => setGastosVariaveis(Number(v))}
                  />
                </div>

                <div className="input-divider" />

                <div className="input-section">
                  <span className="input-section-label">Objetivos</span>

                  <InputField
                    label="% do saldo para investir"
                    type="number"
                    placeholder="0"
                    value={percentualInvestimento}
                    onChange={(v) => setPercentualInvestimento(Number(v))}
                  />

                  <InputField
                    label="Meta financeira (R$)"
                    type="number"
                    placeholder="0,00"
                    value={meta}
                    onChange={(v) => setMeta(Number(v))}
                  />
                </div>
              </div>
            </section>

            <div className="right-col">
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Gastos detalhados</h2>
                  <p className="panel-sub">Registre despesas individuais</p>
                </div>

                <div className="expense-add-row">
                  <input
                    className="inline-input"
                    type="text"
                    placeholder="Nome do gasto"
                    value={nomeGasto}
                    onChange={(e) => setNomeGasto(e.target.value)}
                    onKeyDown={onKeyDownGasto}
                  />

                  <input
                    className="inline-input inline-input--short"
                    type="number"
                    placeholder="Valor"
                    value={valorGasto || ""}
                    onChange={(e) => setValorGasto(Number(e.target.value))}
                    onKeyDown={onKeyDownGasto}
                  />

                  <button
                    className="btn-add"
                    onClick={adicionarGasto}
                    aria-label="Adicionar gasto"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                {gastos.length === 0 ? (
                  <div className="empty-state">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.3 }}
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                    <p>Nenhum gasto adicionado</p>
                  </div>
                ) : (
                  <ul className="expense-list">
                    {gastos.map((gasto) => (
                      <li key={gasto.id} className="expense-item">
                        <span className="expense-dot" />
                        <span className="expense-name">{gasto.nome}</span>
                        <span className="expense-value">
                          {fmt(gasto.valor)}
                        </span>

                        <button
                          className="btn-remove"
                          onClick={() => removerGasto(gasto.id)}
                          aria-label={`Remover ${gasto.nome}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}

                    <li className="expense-total">
                      <span>Total</span>
                      <span>{fmt(totalGastosDetalhados)}</span>
                    </li>
                  </ul>
                )}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Projeção 12 meses</h2>
                  <span className="panel-badge">juros 1% a.m.</span>
                </div>

                {investimento <= 0 ? (
                  <div className="chart-empty">
                    <p>
                      Defina uma renda e porcentagem de investimento para ver a
                      projeção.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={dadosGrafico}
                      margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 11, fill: "#4b5563" }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{ fontSize: 11, fill: "#4b5563" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                          Number(v) >= 1000
                            ? `${(Number(v) / 1000).toFixed(0)}k`
                            : String(v)
                        }
                      />

                      <Tooltip content={<CustomTooltip />} />

                      {meta > 0 && (
                        <ReferenceLine
                          y={meta}
                          stroke="#a855f7"
                          strokeDasharray="6 3"
                          strokeWidth={1.5}
                        />
                      )}

                      <Line
                        type="monotone"
                        dataKey="valor"
                        name="Patrimônio"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#3b82f6",
                          strokeWidth: 0,
                        }}
                      />

                      {meta > 0 && (
                        <Line
                          type="monotone"
                          dataKey="meta"
                          name="Meta"
                          stroke="#a855f7"
                          strokeDasharray="6 3"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </section>
            </div>

            <aside className="history-panel">
              <div className="panel-head">
                <h2 className="panel-title">Histórico mensal</h2>
                <p className="panel-sub">Resumo dos meses salvos</p>
              </div>

              {historico.length === 0 ? (
                <div className="history-empty">Nenhum mês salvo ainda.</div>
              ) : (
                <div className="history-list">
                  {historico.map((item) => {
                    const mesInfo = mesesDisponiveis.find(
                      (m) => m.value === item.mesReferencia
                    );

                    return (
                      <button
                        key={item.id}
                        className={`history-item ${
                          item.mesReferencia === mesSelecionado ? "active" : ""
                        }`}
                        onClick={() => setMesSelecionado(item.mesReferencia)}
                      >
                        <span className="history-month">
                          {mesInfo?.label ?? item.mesReferencia}
                        </span>

                        <span
                          className={
                            item.saldo >= 0
                              ? "history-saldo positive"
                              : "history-saldo negative"
                          }
                        >
                          {fmt(item.saldo)}
                        </span>

                        <span className="history-sub">
                          Gastos: {fmt(item.totalGastos)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  icon,
  sub,
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "blue" | "amber" | "purple";
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className={`summary-card summary-card--${accent}`}>
      <div className="summary-icon" aria-hidden="true">
        {icon}
      </div>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
      {sub && <span className="summary-sub">{sub}</span>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const authStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080a0f;
    --surface: #0f1219;
    --border: rgba(255,255,255,0.07);
    --text: #e8eaf0;
    --muted: #5a6070;
    --accent-blue: #4f8ef7;
    --accent-green: #34d17a;
    --accent-red: #f0514e;
  }

  .auth-bg {
    min-height: 100vh;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Geist', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .auth-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }

  .auth-orb--1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%);
    top: -150px; left: -100px;
  }

  .auth-orb--2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%);
    bottom: -100px; right: -80px;
  }

  .auth-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 48px 40px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.6);
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .auth-icon-wrap {
    width: 52px; height: 52px;
    background: rgba(79,142,247,0.1);
    border: 1px solid rgba(79,142,247,0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-blue);
    margin: 0 auto 24px;
  }

  .auth-title {
    font-family: 'Instrument Serif', serif;
    font-size: 30px;
    color: var(--text);
    text-align: center;
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }

  .auth-sub {
    color: var(--muted);
    font-size: 14px;
    text-align: center;
    margin-bottom: 32px;
    font-weight: 300;
  }

  .auth-form { display: flex; flex-direction: column; gap: 14px; }

  .input-group { display: flex; flex-direction: column; gap: 7px; }

  .input-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .input-group input {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px;
    color: var(--text);
    font-size: 15px;
    font-family: 'Geist', sans-serif;
    transition: border-color 0.15s, background 0.15s;
    outline: none;
  }

  .input-group input:focus {
    border-color: rgba(79,142,247,0.5);
    background: rgba(79,142,247,0.04);
  }

  .input-group input::placeholder { color: rgba(255,255,255,0.15); }

  .auth-msg {
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 400;
  }

  .auth-msg.error { background: rgba(240,81,78,0.1); color: #f87171; border: 1px solid rgba(240,81,78,0.2); }
  .auth-msg.success { background: rgba(52,209,122,0.1); color: #4ade80; border: 1px solid rgba(52,209,122,0.2); }

  .btn-primary {
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px;
    font-size: 15px;
    font-weight: 500;
    font-family: 'Geist', sans-serif;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 46px;
  }

  .btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }

  .btn-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: none;
    font-size: 13px;
    cursor: pointer;
    font-family: 'Geist', sans-serif;
    text-align: center;
    padding: 4px;
    transition: color 0.15s;
    font-weight: 400;
  }

  .btn-ghost:hover { color: var(--text); }
`;

const appStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080a0f;
    --surface: #0f1219;
    --surface2: #141720;
    --border: rgba(255,255,255,0.07);
    --border-strong: rgba(255,255,255,0.11);
    --text: #dde1ea;
    --muted: #4b5368;
    --muted2: #6b7280;
    --accent-blue: #4f8ef7;
    --accent-green: #34d17a;
    --accent-red: #f0514e;
    --accent-amber: #f5a623;
    --accent-purple: #a855f7;
  }

  .app-bg {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Geist', sans-serif;
    color: var(--text);
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    border-bottom: 1px solid var(--border);
    background: rgba(8,10,15,0.85);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .header-logo-wrap {
    width: 32px; height: 32px;
    background: rgba(79,142,247,0.1);
    border: 1px solid rgba(79,142,247,0.2);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-blue);
    flex-shrink: 0;
  }

  .header-title {
    font-family: 'Instrument Serif', serif;
    font-size: 17px;
    color: var(--text);
    letter-spacing: -0.2px;
  }

  .header-user {
    font-size: 12px;
    color: var(--muted2);
    margin-left: 8px;
    font-weight: 300;
  }

  .header-right { display: flex; align-items: center; gap: 12px; }

  .saving-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted2);
    font-weight: 300;
  }

  .saving-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent-green);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

  .btn-logout {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted2);
    border-radius: 9px;
    padding: 6px 14px;
    font-size: 12px;
    font-family: 'Geist', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 400;
  }

  .btn-logout:hover {
    border-color: rgba(240,81,78,0.4);
    color: #f87171;
    background: rgba(240,81,78,0.06);
  }

  .app-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 24px 72px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .month-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 20px;
  }

  .month-bar-left { display: flex; align-items: center; gap: 12px; }

  .month-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .month-select {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 14px;
    font-family: 'Geist', sans-serif;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .month-select:focus { border-color: rgba(79,142,247,0.4); }

  .month-bar-right { flex: 1; max-width: 360px; }

  .spend-bar-wrap { display: flex; flex-direction: column; gap: 6px; }

  .spend-bar-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted2);
    font-weight: 400;
  }

  .spend-bar-track {
    height: 4px;
    background: rgba(255,255,255,0.05);
    border-radius: 99px;
    overflow: hidden;
  }

  .spend-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .spend-bar-fill.ok { background: var(--accent-green); }
  .spend-bar-fill.warning { background: var(--accent-amber); }
  .spend-bar-fill.danger { background: var(--accent-red); }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 14px;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
    animation: fadeIn 0.4s ease both;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .summary-card:hover { border-color: var(--border-strong); }

  .summary-icon {
    margin-bottom: 10px;
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .summary-card--green .summary-icon { background: rgba(52,209,122,0.1); color: var(--accent-green); }
  .summary-card--red .summary-icon { background: rgba(240,81,78,0.1); color: var(--accent-red); }
  .summary-card--blue .summary-icon { background: rgba(79,142,247,0.1); color: var(--accent-blue); }
  .summary-card--amber .summary-icon { background: rgba(245,166,35,0.1); color: var(--accent-amber); }
  .summary-card--purple .summary-icon { background: rgba(168,85,247,0.1); color: var(--accent-purple); }

  .summary-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    border-radius: 0 0 16px 16px;
  }

  .summary-card--green::after { background: linear-gradient(90deg, transparent, rgba(52,209,122,0.4), transparent); }
  .summary-card--red::after { background: linear-gradient(90deg, transparent, rgba(240,81,78,0.4), transparent); }
  .summary-card--blue::after { background: linear-gradient(90deg, transparent, rgba(79,142,247,0.4), transparent); }
  .summary-card--amber::after { background: linear-gradient(90deg, transparent, rgba(245,166,35,0.4), transparent); }
  .summary-card--purple::after { background: linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent); }

  .summary-label {
    font-size: 11px;
    color: var(--muted2);
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .summary-value {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }

  .summary-sub {
    font-size: 12px;
    color: var(--muted2);
    font-weight: 300;
    margin-top: 2px;
  }

  .main-layout {
    display: grid;
    grid-template-columns: 1fr 1fr 280px;
    gap: 20px;
    align-items: start;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel,
  .history-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    overflow: hidden;
  }

  .panel-head {
    padding: 20px 22px 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 18px;
  }

  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-size: 16px;
    color: var(--text);
    letter-spacing: -0.2px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .panel-sub {
    font-size: 12px;
    color: var(--muted2);
    font-weight: 300;
  }

  .panel-badge {
    font-family: 'Geist', sans-serif;
    font-size: 10px;
    font-weight: 500;
    background: rgba(79,142,247,0.12);
    color: var(--accent-blue);
    border-radius: 99px;
    padding: 3px 9px;
    letter-spacing: 0.02em;
  }

  .panel-body {
    padding: 0 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 0;
  }

  .input-section-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .input-divider {
    height: 1px;
    background: var(--border);
  }

  .input-group { display: flex; flex-direction: column; gap: 7px; }

  .input-group label {
    font-size: 12px;
    font-weight: 400;
    color: var(--muted2);
  }

  .input-group input {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 14px;
    font-family: 'Geist', sans-serif;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
  }

  .input-group input:focus {
    border-color: rgba(79,142,247,0.4);
    background: rgba(79,142,247,0.03);
  }

  .input-group input::placeholder { color: rgba(255,255,255,0.12); }

  .expense-add-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0 22px 16px;
    border-bottom: 1px solid var(--border);
  }

  .inline-input {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 13px;
    font-family: 'Geist', sans-serif;
    outline: none;
    transition: border-color 0.15s;
    flex: 1;
    min-width: 0;
  }

  .inline-input--short { flex: 0 0 90px; }

  .inline-input:focus { border-color: rgba(79,142,247,0.4); }
  .inline-input::placeholder { color: rgba(255,255,255,0.12); }

  .btn-add {
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 10px;
    width: 36px;
    height: 36px;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s, transform 0.1s;
  }

  .btn-add:hover { opacity: 0.85; transform: scale(1.05); }

  .expense-list {
    list-style: none;
    padding: 8px 22px 16px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .expense-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px;
    border-radius: 9px;
    transition: background 0.1s;
  }

  .expense-item:hover { background: var(--surface2); }

  .expense-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
  }

  .expense-name {
    flex: 1;
    font-size: 13px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 400;
  }

  .expense-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted2);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .btn-remove {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    line-height: 1;
    padding: 4px;
    flex-shrink: 0;
    display: flex;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
  }

  .expense-item:hover .btn-remove { opacity: 1; }
  .btn-remove:hover { color: var(--accent-red); }

  .expense-total {
    display: flex;
    justify-content: space-between;
    padding: 10px 8px 4px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    font-weight: 500;
    color: var(--muted2);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px 0 20px;
    color: var(--muted2);
    font-size: 13px;
    font-weight: 300;
  }

  .chart-empty {
    padding: 28px 22px;
    text-align: center;
    font-size: 13px;
    color: var(--muted2);
    font-weight: 300;
    line-height: 1.6;
  }

  .chart-tooltip {
    background: #1a1e2a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 10px 14px;
    font-family: 'Geist', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }

  .chart-tooltip-label {
    font-size: 11px;
    color: var(--muted2);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .chart-tooltip-value {
    font-size: 13px;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 18px 18px;
  }

  .history-item {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .history-item:hover {
    border-color: rgba(79,142,247,0.35);
    background: rgba(79,142,247,0.04);
  }

  .history-item.active {
    border-color: rgba(79,142,247,0.55);
    background: rgba(79,142,247,0.08);
  }

  .history-month {
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
  }

  .history-saldo {
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .history-saldo.positive {
    color: var(--accent-green);
  }

  .history-saldo.negative {
    color: var(--accent-red);
  }

  .history-sub {
    font-size: 11px;
    color: var(--muted2);
  }

  .history-empty {
    padding: 0 22px 22px;
    font-size: 13px;
    color: var(--muted2);
  }

  @media (max-width: 1050px) {
    .main-layout {
      grid-template-columns: 1fr 1fr;
    }

    .history-panel {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 760px) {
    .app-header { padding: 0 16px; }

    .app-main { padding: 20px 14px 56px; }

    .main-layout { grid-template-columns: 1fr; }

    .month-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .month-bar-right { max-width: 100%; }

    .month-bar-left { justify-content: space-between; }

    .month-select { width: 100%; }

    .expense-add-row { flex-direction: column; }

    .inline-input--short { flex: 1; }

    .btn-add { width: 100%; }

    .btn-remove { opacity: 1; }
  }
`;
