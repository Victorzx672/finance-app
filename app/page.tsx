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

  // ── Bootstrap: restore session ──────────────────────────────────────────────

  useEffect(() => {
    const loginSalvo = localStorage.getItem("finance-login");
    const user = getUser();

    if (loginSalvo === "true" && user) {
      setLogado(true);
      carregarDados(user.id, mesSelecionado);
    } else {
      setCarregado(true);
    }
  }, []);

  // ── Change month ────────────────────────────────────────────────────────────

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
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (!logado) {
    return (
      <>
        <style>{authStyles}</style>
        <div className="auth-bg">
          <div className="auth-card">
            <div className="auth-logo">₿</div>
            <h1 className="auth-title">
              {modoCadastro ? "Criar conta" : "Entrar"}
            </h1>
            <p className="auth-sub">Controle financeiro pessoal</p>

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
                {loadingLogin
                  ? "Aguarde…"
                  : modoCadastro
                  ? "Criar conta"
                  : "Entrar"}
              </button>

              <button
                className="btn-ghost"
                onClick={() => {
                  setModoCadastro(!modoCadastro);
                  setErroLogin("");
                }}
              >
                {modoCadastro ? "Já tenho conta" : "Criar conta"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{appStyles}</style>

      <div className="app-bg">
        <header className="app-header">
          <div className="header-left">
            <span className="header-logo">₿</span>
            <span className="header-title">Controle Financeiro</span>
          </div>

          <div className="header-right">
            {salvando && <span className="saving-badge">Salvando…</span>}
            <button className="btn-logout" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <main className="app-main">
          <section className="panel month-panel">
            <div>
              <h2 className="panel-title">Mês de referência</h2>
              <p className="month-subtitle">
                Selecione o mês que deseja consultar ou editar.
              </p>
            </div>

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
          </section>

          <div className="cards-grid">
            <SummaryCard
              label="Saldo disponível"
              value={fmt(saldo)}
              accent={saldo >= 0 ? "green" : "red"}
            />
            <SummaryCard
              label="Para investir"
              value={fmt(investimento)}
              accent="blue"
            />
            <SummaryCard
              label="Gasto livre"
              value={fmt(gastoLivre)}
              accent="amber"
            />
            {meta > 0 && (
              <SummaryCard
                label={`Meta em ${mesesParaMeta} meses`}
                value={fmt(meta)}
                accent="purple"
              />
            )}
          </div>

          <div className="two-col">
            <section className="panel">
              <h2 className="panel-title">Receita &amp; Despesas</h2>

              <InputField
                label="Renda mensal"
                type="number"
                placeholder="0"
                value={renda}
                onChange={(v) => setRenda(Number(v))}
              />

              <InputField
                label="Gastos fixos (aluguel, contas…)"
                type="number"
                placeholder="0"
                value={gastosFixos}
                onChange={(v) => setGastosFixos(Number(v))}
              />

              <InputField
                label="Gastos variáveis (mercado, saídas…)"
                type="number"
                placeholder="0"
                value={gastosVariaveis}
                onChange={(v) => setGastosVariaveis(Number(v))}
              />

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
                placeholder="0"
                value={meta}
                onChange={(v) => setMeta(Number(v))}
              />
            </section>

            <div className="right-col">
              <section className="panel">
                <h2 className="panel-title">Gastos detalhados</h2>

                <div className="expense-row">
                  <div className="expense-inputs">
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
                  </div>

                  <button className="btn-add" onClick={adicionarGasto}>
                    +
                  </button>
                </div>

                {gastos.length === 0 ? (
                  <p className="empty-state">Nenhum gasto adicionado ainda.</p>
                ) : (
                  <ul className="expense-list">
                    {gastos.map((gasto) => (
                      <li key={gasto.id} className="expense-item">
                        <span className="expense-name">{gasto.nome}</span>
                        <span className="expense-value">
                          {fmt(gasto.valor)}
                        </span>
                        <button
                          className="btn-remove"
                          onClick={() => removerGasto(gasto.id)}
                          aria-label={`Remover ${gasto.nome}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}

                    <li className="expense-total">
                      <span>Total detalhado</span>
                      <span>{fmt(totalGastosDetalhados)}</span>
                    </li>
                  </ul>
                )}
              </section>

              <section className="panel">
                <h2 className="panel-title">
                  Projeção 12 meses{" "}
                  <span className="panel-badge">1% a.m.</span>
                </h2>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={dadosGrafico}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />

                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                    />

                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickFormatter={(v) =>
                        Number(v) >= 1000
                          ? `${(Number(v) / 1000).toFixed(0)}k`
                          : String(v)
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => fmt(Number(v))}
                    />

                    <Line
                      type="monotone"
                      dataKey="valor"
                      name="Patrimônio"
                      stroke="var(--accent-blue)"
                      strokeWidth={2}
                      dot={false}
                    />

                    {meta > 0 && (
                      <Line
                        type="monotone"
                        dataKey="meta"
                        name="Meta"
                        stroke="var(--accent-red)"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </section>
            </div>
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
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "blue" | "amber" | "purple";
}) {
  return (
    <div className={`summary-card summary-card--${accent}`}>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const authStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --border: #2a2d3a;
    --text: #e8eaf0;
    --muted: #6b7280;
    --accent-blue: #3b82f6;
    --accent-green: #22c55e;
    --accent-red: #ef4444;
    --accent-amber: #f59e0b;
    --accent-purple: #a855f7;
  }

  .auth-bg {
    min-height: 100vh;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 60%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }

  .auth-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 48px 40px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.4);
  }

  .auth-logo {
    font-size: 32px;
    text-align: center;
    margin-bottom: 16px;
  }

  .auth-title {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: var(--text);
    text-align: center;
    margin-bottom: 4px;
  }

  .auth-sub {
    color: var(--muted);
    font-size: 14px;
    text-align: center;
    margin-bottom: 32px;
  }

  .auth-form { display: flex; flex-direction: column; gap: 14px; }

  .input-group { display: flex; flex-direction: column; gap: 6px; }

  .input-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    letter-spacing: 0.02em;
  }

  .input-group input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    color: var(--text);
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s;
    outline: none;
  }

  .input-group input:focus {
    border-color: var(--accent-blue);
  }

  .input-group input::placeholder { color: var(--muted); }

  .auth-msg {
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 8px;
  }

  .auth-msg.error { background: rgba(239,68,68,0.1); color: var(--accent-red); }
  .auth-msg.success { background: rgba(34,197,94,0.1); color: var(--accent-green); }

  .btn-primary {
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    margin-top: 4px;
  }

  .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: none;
    font-size: 13px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    text-align: center;
    padding: 4px;
    transition: color 0.15s;
  }

  .btn-ghost:hover { color: var(--text); }
`;

const appStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #21242f;
    --border: #2a2d3a;
    --text: #e8eaf0;
    --muted: #6b7280;
    --accent-blue: #3b82f6;
    --accent-green: #22c55e;
    --accent-red: #ef4444;
    --accent-amber: #f59e0b;
    --accent-purple: #a855f7;
  }

  .app-bg {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-logo { font-size: 20px; }
  .header-title { font-family: 'DM Serif Display', serif; font-size: 18px; }

  .header-right { display: flex; align-items: center; gap: 12px; }

  .saving-badge {
    font-size: 12px;
    color: var(--muted);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .btn-logout {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-logout:hover {
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  .app-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .month-panel {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .month-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin-top: 4px;
  }

  .month-select {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    min-width: 180px;
  }

  .month-select:focus {
    border-color: var(--accent-blue);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    overflow: hidden;
  }

  .summary-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
  }

  .summary-card--green::before { background: var(--accent-green); }
  .summary-card--red::before { background: var(--accent-red); }
  .summary-card--blue::before { background: var(--accent-blue); }
  .summary-card--amber::before { background: var(--accent-amber); }
  .summary-card--purple::before { background: var(--accent-purple); }

  .summary-label {
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .summary-value {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-title {
    font-family: 'DM Serif Display', serif;
    font-size: 17px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-badge {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    background: rgba(59,130,246,0.15);
    color: var(--accent-blue);
    border-radius: 20px;
    padding: 2px 8px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }

  .input-group input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s;
  }

  .input-group input:focus {
    border-color: var(--accent-blue);
  }

  .input-group input::placeholder {
    color: var(--muted);
  }

  .expense-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .expense-inputs {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .inline-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s;
    flex: 1;
    min-width: 0;
  }

  .inline-input--short {
    max-width: 100px;
  }

  .inline-input:focus {
    border-color: var(--accent-blue);
  }

  .inline-input::placeholder {
    color: var(--muted);
  }

  .btn-add {
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 10px;
    width: 40px;
    height: 40px;
    font-size: 22px;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s;
  }

  .btn-add:hover {
    opacity: 0.85;
  }

  .expense-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .expense-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    transition: background 0.1s;
  }

  .expense-item:hover {
    background: var(--surface2);
  }

  .expense-name {
    flex: 1;
    font-size: 14px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .expense-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .btn-remove {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .btn-remove:hover {
    color: var(--accent-red);
  }

  .expense-total {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    margin-top: 4px;
  }

  .empty-state {
    font-size: 13px;
    color: var(--muted);
    text-align: center;
    padding: 16px 0;
  }

  @media (max-width: 700px) {
    .app-header {
      padding: 14px 16px;
    }

    .header-title {
      font-size: 16px;
    }

    .app-main {
      padding: 24px 14px 48px;
    }

    .two-col {
      grid-template-columns: 1fr;
    }

    .month-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .month-select {
      width: 100%;
    }

    .expense-row {
      flex-direction: column;
      align-items: stretch;
    }

    .expense-inputs {
      flex-direction: column;
    }

    .inline-input--short {
      max-width: 100%;
    }

    .btn-add {
      width: 100%;
    }
  }
`;
