"use client";

import { arredondar } from "@/lib/calculos";
import type { GastosDoMes } from "./dados";
import { fmt } from "./ui";

const MAX_LINHAS = 5;

/** Compara os gastos do mês com os do mês anterior (total e por categoria). */
export function PainelComparacao({
  atual,
  anterior,
  labelAnterior,
}: {
  atual: GastosDoMes;
  anterior: GastosDoMes | null;
  labelAnterior: string;
}) {
  if (!anterior) {
    return (
      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Comparado ao mês passado</h2>
          <p className="panel-sub">{labelAnterior}</p>
        </div>
        <div className="chart-empty">Não há dados salvos do mês anterior para comparar.</div>
      </section>
    );
  }

  const diferenca = arredondar(atual.total - anterior.total);
  const percentual = anterior.total > 0 ? (diferenca / anterior.total) * 100 : null;

  const nomes = new Set([...atual.linhas.map((l) => l.nome), ...anterior.linhas.map((l) => l.nome)]);
  const valor = (g: GastosDoMes, nome: string) => g.linhas.find((l) => l.nome === nome)?.valor ?? 0;

  const mudancas = [...nomes]
    .map((nome) => ({ nome, diff: arredondar(valor(atual, nome) - valor(anterior, nome)) }))
    .filter((m) => Math.abs(m.diff) >= 0.01)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, MAX_LINHAS);

  const subiu = diferenca > 0;
  const igual = diferenca === 0;

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="panel-title">Comparado ao mês passado</h2>
        <p className="panel-sub">{labelAnterior}</p>
      </div>

      <div className="comp-corpo">
        <div className={`comp-total ${igual ? "" : subiu ? "comp-total--sobe" : "comp-total--desce"}`}>
          <span className="comp-seta">{igual ? "=" : subiu ? "▲" : "▼"}</span>
          <div>
            <strong>
              {igual
                ? "Você gastou o mesmo que no mês passado"
                : `Você gastou ${fmt(Math.abs(diferenca))} ${subiu ? "a mais" : "a menos"}`}
            </strong>
            <span>
              {fmt(atual.total)} agora, {fmt(anterior.total)} antes
              {percentual !== null && !igual && ` (${subiu ? "+" : "−"}${Math.abs(percentual).toFixed(0)}%)`}
            </span>
          </div>
        </div>

        {mudancas.length > 0 && (
          <ul className="comp-lista">
            {mudancas.map((m) => (
              <li key={m.nome}>
                <span>{m.nome}</span>
                <span className={m.diff > 0 ? "comp-sobe" : "comp-desce"}>
                  {m.diff > 0 ? "▲ +" : "▼ −"}
                  {fmt(Math.abs(m.diff))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
