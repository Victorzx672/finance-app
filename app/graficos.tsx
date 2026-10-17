"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MAX_MESES_PROJECAO, serieProjecao } from "@/lib/calculos";
import { labelCurto } from "@/lib/meses";
import type { HistoricoMes } from "./dados";
import { fmt } from "./ui";

// O Recharts não entende variáveis CSS nos atributos, então as cores dos eixos
// e da grade mudam por aqui conforme o tema.
const tema = (escuro: boolean) => ({
  eixo: { fontSize: 12, fill: escuro ? "#9aa7bd" : "#5b6678" },
  grade: escuro ? "#2a3550" : "#e5e9f1",
  texto: escuro ? "#9aa7bd" : "#5b6678",
  azul: escuro ? "#6ea1ff" : "#2563eb",
  roxo: escuro ? "#b794ff" : "#7c3aed",
  laranja: "#f59e0b",
});

const abreviar = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="chart-tooltip-value" style={{ color: entry.color }}>
          <span>{entry.name}</span>
          <span>{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Para onde foi o dinheiro ─────────────────────────────────────────────────

const CORES = ["#2563eb", "#7c3aed", "#0f766e", "#d97706", "#dc2626", "#0891b2", "#db2777", "#4d7c0f", "#64748b"];

export interface LinhaCategoria {
  nome: string;
  valor: number;
}

export function PainelCategorias({
  linhas,
  orcamentos,
}: {
  linhas: LinhaCategoria[];
  /** limite mensal por categoria, se o usuário definiu */
  orcamentos: Record<string, number>;
}) {
  const total = linhas.reduce((acc, l) => acc + l.valor, 0);
  const estouradas = linhas.filter((l) => orcamentos[l.nome] && l.valor > orcamentos[l.nome]);

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">Para onde foi o dinheiro</h2>
        <p className="panel-sub">
          Gastos do mês por categoria
          {Object.keys(orcamentos).length > 0 && ". A marca preta é o orçamento que você definiu."}
        </p>
      </div>

      {total <= 0 ? (
        <div className="chart-empty">Nenhum gasto neste mês ainda.</div>
      ) : (
        <ul className="cat-list">
          {linhas.map((l, i) => {
            const limite = orcamentos[l.nome];
            const acima = limite !== undefined && l.valor > limite;
            // com orçamento, a barra é proporcional a ele (cheia = estourou); sem, ao maior gasto
            const escala = limite ?? linhas[0].valor;
            const largura = Math.min(100, (l.valor / escala) * 100);

            return (
              <li key={l.nome} className="cat-item">
                <div className="cat-head">
                  <span className="cat-nome">
                    <span className="cat-dot" style={{ background: CORES[i % CORES.length] }} />
                    {l.nome}
                  </span>
                  <span className={`cat-valor ${acima ? "cat-valor--acima" : ""}`}>
                    {fmt(l.valor)}
                    {limite !== undefined ? <small> de {fmt(limite)}</small> : <small>{((l.valor / total) * 100).toFixed(0)}%</small>}
                  </span>
                </div>

                <div className="cat-track">
                  <div
                    className="cat-fill"
                    style={{ width: `${largura}%`, background: acima ? "var(--red)" : CORES[i % CORES.length] }}
                  />
                </div>

                {acima && <span className="cat-aviso">{fmt(l.valor - limite)} acima do orçamento</span>}
              </li>
            );
          })}
        </ul>
      )}

      {estouradas.length > 0 && (
        <p className="cat-resumo-aviso">
          {estouradas.length === 1 ? "1 categoria passou" : `${estouradas.length} categorias passaram`} do orçamento:{" "}
          {estouradas.map((l) => l.nome).join(", ")}.
        </p>
      )}
    </section>
  );
}

// ─── Projeção do investimento ─────────────────────────────────────────────────

export function PainelProjecao({
  investimento,
  falta,
  nomeMeta,
  mesesParaMeta,
  escuro,
}: {
  investimento: number;
  /** quanto ainda falta para a meta principal (0 = sem meta) */
  falta: number;
  nomeMeta: string | null;
  mesesParaMeta: number;
  escuro: boolean;
}) {
  const c = tema(escuro);
  const dados = serieProjecao(investimento, falta);

  let subtitulo = "Se você guardar esse valor todos os meses.";

  if (falta > 0 && mesesParaMeta > 0) {
    subtitulo =
      mesesParaMeta > MAX_MESES_PROJECAO
        ? `Nesse ritmo, "${nomeMeta}" leva mais de 5 anos.`
        : `Nesse ritmo, "${nomeMeta}" é atingida em cerca de ${mesesParaMeta} ${mesesParaMeta === 1 ? "mês" : "meses"}.`;
  }

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">
          Seu investimento
          <span className="panel-badge">1% ao mês</span>
        </h2>
        <p className="panel-sub">{subtitulo}</p>
      </div>

      {investimento <= 0 ? (
        <div className="chart-empty">
          Informe sua renda e a porcentagem a investir para ver a projeção.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dados} margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
            <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="mes"
              tick={c.eixo}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v) => `${v}`}
              label={{ value: "meses", position: "insideBottomRight", offset: -4, fontSize: 11, fill: c.texto }}
            />

            <YAxis
              tick={c.eixo}
              axisLine={false}
              tickLine={false}
              tickFormatter={abreviar}
              domain={[0, (max: number) => Math.max(max, falta)]}
            />

            <Tooltip content={<CustomTooltip />} labelFormatter={(v) => `Mês ${v}`} />

            {falta > 0 && <ReferenceLine y={falta} stroke={c.roxo} strokeDasharray="6 3" />}

            <Line
              type="monotone"
              dataKey="valor"
              name="Você terá"
              stroke={c.azul}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: c.azul, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

// ─── Evolução mês a mês ───────────────────────────────────────────────────────

export function PainelEvolucao({ historico, escuro }: { historico: HistoricoMes[]; escuro: boolean }) {
  const c = tema(escuro);

  const dados = [...historico]
    .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia))
    .slice(-12)
    .map((h) => ({
      mes: labelCurto(h.mesReferencia),
      Renda: h.renda,
      Gastos: h.totalGastos,
    }));

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">Evolução mensal</h2>
        <p className="panel-sub">Renda e gastos dos últimos meses salvos.</p>
      </div>

      {dados.length < 2 ? (
        <div className="chart-empty">Salve pelo menos 2 meses para ver a evolução.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados} margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
            <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={c.eixo} axisLine={false} tickLine={false} />
            <YAxis tick={c.eixo} axisLine={false} tickLine={false} tickFormatter={abreviar} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.texto }} />
            <Bar dataKey="Renda" fill={c.azul} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill={c.laranja} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
