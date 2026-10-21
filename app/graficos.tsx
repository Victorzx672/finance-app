"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MAX_MESES_PROJECAO, serieProjecao } from "@/lib/calculos";
import { CATEGORIAS, corDaCategoria } from "@/lib/categorias";
import { serieGuardado, variacaoGuardado, type SaldoMes } from "@/lib/evolucao-guardado";
import { labelCurto } from "@/lib/meses";
import type { LinhaPessoa } from "@/lib/pessoas";
import type { HistoricoMes } from "./dados";
import { fmt } from "./ui";

// O Recharts não entende variáveis CSS nos atributos, então as cores dos eixos
// e da grade mudam por aqui conforme o tema.
const tema = (escuro: boolean) => ({
  eixo: { fontSize: 12, fill: escuro ? "#8b97b0" : "#64748b" },
  grade: escuro ? "#232b3e" : "#eceef5",
  texto: escuro ? "#8b97b0" : "#64748b",
  azul: escuro ? "#818cf8" : "#4f46e5",
  roxo: escuro ? "#c4a6ff" : "#7c3aed",
  verde: escuro ? "#34d399" : "#059669",
  laranja: escuro ? "#fbbf24" : "#f59e0b",
  cursor: escuro ? "rgba(129,140,248,0.08)" : "rgba(79,70,229,0.06)",
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
        <p key={entry.name} className="chart-tooltip-value">
          <span>
            <span className="chart-tooltip-dot" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span>{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Degradê vertical para as áreas dos gráficos. */
function Degrade({ id, cor }: { id: string; cor: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={cor} stopOpacity={0.32} />
        <stop offset="1" stopColor={cor} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

// ─── Para onde foi o dinheiro ─────────────────────────────────────────────────

const CORES = ["#4f46e5", "#7c3aed", "#0d9488", "#d97706", "#e11d48", "#0891b2", "#db2777", "#65a30d", "#64748b"];

/** Linhas que não são categorias têm cor própria; as categorias usam sempre a mesma cor. */
const COR_ESPECIAL: Record<string, string> = {
  "Gastos fixos": "#475569",
  "Gastos variáveis": "#94a3b8",
  "Sem categoria": "#cbd5e1",
};

const corDaLinha = (nome: string, i: number) =>
  COR_ESPECIAL[nome] ??
  ((CATEGORIAS as readonly string[]).includes(nome) ? corDaCategoria(nome) : CORES[i % CORES.length]);

export interface LinhaCategoria {
  nome: string;
  valor: number;
}

const RAIO_ROSCA = 70;
const VOLTA_ROSCA = 2 * Math.PI * RAIO_ROSCA;

/** Gráfico de rosca. Passar o mouse numa fatia destaca a categoria (e vice-versa na lista). */
function Rosca({
  fatias,
  ativa,
  onAtiva,
}: {
  fatias: { nome: string; valor: number; cor: string }[];
  ativa: number | null;
  onAtiva: (i: number | null) => void;
}) {
  const total = fatias.reduce((acc, f) => acc + f.valor, 0);
  const inicios = fatias.map((_, i) => fatias.slice(0, i).reduce((acc, f) => acc + f.valor, 0) / total);
  const folga = fatias.length > 1 ? 3 : 0; // espaço entre as fatias
  const destaque = ativa !== null ? fatias[ativa] : null;

  return (
    <div className="rosca">
      <svg viewBox="0 0 180 180" role="img" aria-label="Gastos por categoria">
        <g transform="rotate(-90 90 90)">
          {fatias.map((f, i) => {
            const comprimento = Math.max(0.5, (f.valor / total) * VOLTA_ROSCA - folga);

            return (
              <circle
                key={f.nome}
                className={`rosca-fatia ${ativa !== null && ativa !== i ? "rosca-fatia--apagada" : ""}`}
                cx="90"
                cy="90"
                r={RAIO_ROSCA}
                stroke={f.cor}
                strokeWidth={ativa === i ? 26 : 20}
                strokeDasharray={`${comprimento} ${VOLTA_ROSCA}`}
                strokeDashoffset={-inicios[i] * VOLTA_ROSCA}
                onMouseEnter={() => onAtiva(i)}
                onMouseLeave={() => onAtiva(null)}
                onClick={() => onAtiva(ativa === i ? null : i)}
              />
            );
          })}
        </g>
      </svg>

      <div className="rosca-centro">
        <span className="rosca-rotulo">{destaque ? destaque.nome : "Total do mês"}</span>
        <strong className="rosca-valor">{fmt(destaque ? destaque.valor : total)}</strong>
        <span className="rosca-rotulo">
          {destaque ? `${((destaque.valor / total) * 100).toFixed(0)}% dos gastos` : `${fatias.length} categorias`}
        </span>
      </div>
    </div>
  );
}

export function PainelCategorias({
  linhas,
  orcamentos,
}: {
  linhas: LinhaCategoria[];
  /** limite mensal por categoria, se o usuário definiu */
  orcamentos: Record<string, number>;
}) {
  const [ativa, setAtiva] = useState<number | null>(null);

  const total = linhas.reduce((acc, l) => acc + l.valor, 0);
  const estouradas = linhas.filter((l) => orcamentos[l.nome] && l.valor > orcamentos[l.nome]);
  const fatias = linhas.map((l, i) => ({ ...l, cor: corDaLinha(l.nome, i) }));

  return (
    <section className="card painel-categorias">
      <div className="panel-head">
        <h2 className="panel-title">Para onde foi o dinheiro</h2>
        <p className="panel-sub">
          Gastos do mês por categoria
          {Object.keys(orcamentos).length > 0 && ". A marca é o orçamento que você definiu."}
        </p>
      </div>

      {total <= 0 ? (
        <div className="chart-empty">Nenhum gasto neste mês ainda.</div>
      ) : (
        <div className="categorias-corpo">
          <Rosca fatias={fatias} ativa={ativa} onAtiva={setAtiva} />

          <ul className="cat-list">
            {fatias.map((l, i) => {
              const limite = orcamentos[l.nome];
              const acima = limite !== undefined && l.valor > limite;
              // com orçamento, a barra é proporcional a ele (cheia = estourou); sem, ao maior gasto
              const escala = limite ?? linhas[0].valor;
              const largura = Math.min(100, (l.valor / escala) * 100);

              return (
                <li
                  key={l.nome}
                  className={`cat-item ${ativa === i ? "cat-item--ativo" : ""} ${ativa !== null && ativa !== i ? "cat-item--apagado" : ""}`}
                  onMouseEnter={() => setAtiva(i)}
                  onMouseLeave={() => setAtiva(null)}
                >
                  <div className="cat-head">
                    <span className="cat-nome">
                      <span className="cat-dot" style={{ background: l.cor }} />
                      {l.nome}
                    </span>
                    <span className={`cat-valor ${acima ? "cat-valor--acima" : ""}`}>
                      {fmt(l.valor)}
                      {limite !== undefined ? <small> de {fmt(limite)}</small> : <small>{((l.valor / total) * 100).toFixed(0)}%</small>}
                    </span>
                  </div>

                  <div className="cat-track">
                    <div className="cat-fill" style={{ width: `${largura}%`, background: acima ? "var(--red)" : l.cor }} />
                  </div>

                  {acima && <span className="cat-aviso">{fmt(l.valor - limite)} acima do orçamento</span>}
                </li>
              );
            })}
          </ul>
        </div>
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
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ""); // vira parte de url(#...)
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
        <div className="chart-empty">Informe sua renda e a porcentagem a investir para ver a projeção.</div>
      ) : (
        <div className="grafico">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={dados} margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
              <Degrade id={`${id}-proj`} cor={c.azul} />
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

              {falta > 0 && (
                <ReferenceLine
                  y={falta}
                  stroke={c.roxo}
                  strokeDasharray="6 3"
                  label={{ value: "meta", position: "insideTopLeft", fontSize: 11, fill: c.roxo }}
                />
              )}

              <Area
                type="monotone"
                dataKey="valor"
                name="Você terá"
                stroke={c.azul}
                strokeWidth={2.5}
                fill={`url(#${id}-proj)`}
                activeDot={{ r: 5, fill: c.azul, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
        <div className="grafico">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={dados} margin={{ top: 8, right: 16, left: -6, bottom: 8 }} barGap={4}>
              <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={c.eixo} axisLine={false} tickLine={false} />
              <YAxis tick={c.eixo} axisLine={false} tickLine={false} tickFormatter={abreviar} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: c.cursor, radius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: c.texto }} />
              <Bar dataKey="Renda" fill={c.azul} radius={[6, 6, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Gastos" fill={c.laranja} radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ─── Quem gastou ──────────────────────────────────────────────────────────────

export function PainelPessoas({ linhas }: { linhas: LinhaPessoa[] }) {
  const total = linhas.reduce((acc, l) => acc + l.valor, 0);

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">Quem gastou</h2>
        <p className="panel-sub">Compras do cartão e avulsas do mês, por pessoa.</p>
      </div>

      {total <= 0 ? (
        <div className="chart-empty">Marque quem gastou em cada compra para ver a divisão aqui.</div>
      ) : (
        <ul className="pessoas-lista">
          {linhas.map((l, i) => (
            <li key={l.nome} className="pessoa-linha">
              <span className="pessoa-avatar" style={{ background: CORES[i % CORES.length] }} aria-hidden="true">
                {l.nome.charAt(0).toUpperCase()}
              </span>
              <div className="pessoa-dados">
                <div className="cat-head">
                  <span className="cat-nome">{l.nome}</span>
                  <span className="cat-valor">
                    {fmt(l.valor)}
                    <small>{l.percentual.toFixed(0)}%</small>
                  </span>
                </div>
                <div className="cat-track">
                  <div className="cat-fill" style={{ width: `${l.percentual}%`, background: CORES[i % CORES.length] }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Evolução do total guardado ───────────────────────────────────────────────

export function PainelEvolucaoGuardado({
  saldos,
  mesAtual,
  escuro,
}: {
  saldos: SaldoMes[];
  mesAtual: string;
  escuro: boolean;
}) {
  const c = tema(escuro);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ""); // vira parte de url(#...)
  const serie = serieGuardado(saldos, mesAtual).slice(-24);
  const variacao = variacaoGuardado(serie);
  const dados = serie.map((s) => ({ mes: labelCurto(s.mes), "Total guardado": s.total }));

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">Evolução do total guardado</h2>
        <p className="panel-sub">
          {serie.length >= 2
            ? `${variacao >= 0 ? "Cresceu" : "Caiu"} ${fmt(Math.abs(variacao))} desde ${labelCurto(serie[0].mes)}.`
            : "O total guardado ao fim de cada mês."}
        </p>
      </div>

      {serie.length < 2 ? (
        <div className="chart-empty">
          O gráfico aparece a partir do segundo mês de uso. Cada vez que você guardar ou retirar dinheiro, o total do mês
          é registrado.
        </div>
      ) : (
        <div className="grafico">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dados} margin={{ top: 8, right: 16, left: -6, bottom: 8 }}>
              <Degrade id={`${id}-guard`} cor={c.verde} />
              <CartesianGrid stroke={c.grade} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={c.eixo} axisLine={false} tickLine={false} />
              <YAxis tick={c.eixo} axisLine={false} tickLine={false} tickFormatter={abreviar} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Total guardado"
                stroke={c.verde}
                strokeWidth={2.5}
                fill={`url(#${id}-guard)`}
                dot={{ r: 3, fill: c.verde, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
